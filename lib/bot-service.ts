// Shared bot service for bot workflows.
import axios from 'axios';
import { collection, addDoc, query, where, getDocs, getDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface BotUser {
  phoneNumber: string;
  platform: 'whatsapp' | 'telegram';
  conversationState: 'idle' | 'reporting_lost' | 'reporting_found' | 'requesting_support';
  sessionData: Record<string, string>;
}

export interface BotCommand {
  command: string;
  args?: string[];
  timestamp: Date;
}

interface RegistrySearchItem {
  id: string;
  name?: string;
  description?: string;
}

export class BotService {
  private static userSessions: Map<string, BotUser> = new Map();

// 🔹 Claim notification helper (Telegram)
private static async notifyReporter(contact: string, message: string) {
  try {
    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: contact, // Telegram user ID (numeric chat_id, not phone number)
      text: message,
    });
  } catch (error) {
    console.error('Failed to notify reporter:', error);
  }
}



  /**
   * Initialize or get a bot user session
   */
/**
 * Initialize or get a bot user session
 */
static async initializeUser(
  phoneNumber: string,
  platform: 'whatsapp' | 'telegram',
  chatId?: string // 🔹 new optional param
): Promise<BotUser> {
  const key = `${platform}:${phoneNumber}`;

  if (this.userSessions.has(key)) {
    return this.userSessions.get(key)!;
  }

  const user: BotUser = {
    phoneNumber,
    platform,
    conversationState: 'idle',
    sessionData: { chatId: chatId || '' }, // 🔹 store chatId
  };

  this.userSessions.set(key, user);

  // 🔹 persist chatId in Firestore
  if (chatId) {
    await updateDoc(doc(db, 'users', key), { chatId });
  }

  return user;
}


// 🔹 Cloudinary upload helper
private static async uploadToCloudinary(mediaUrl: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', mediaUrl);
    formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET!);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );

    return res.data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    return null;
  }
}


  /**
   * Parse incoming command message
   */
  static parseCommand(message: string): BotCommand {
    const trimmed = message.trim();
    const parts = trimmed.split(/\s+/);
    const command = (parts[0] || '').replace(/^\//, '').toLowerCase();
    const args = parts.slice(1);

    return {
      command,
      args,
      timestamp: new Date(),
    };
  }

  static async handleIncomingMessage(
    phoneNumber: string,
    platform: 'whatsapp' | 'telegram',
    message: string,
    mediaUrl?: string | null
  ): Promise<string> {
    const text = message.trim();
    const user = await this.initializeUser(phoneNumber, platform);
    const command = this.parseCommand(text);
    const isCommand = text.startsWith('/');

    if (!text) {
      return 'Please send a command or type /help to see what I can do.';
    }

    if (command.command === 'cancel') {
      this.resetSession(phoneNumber, platform);
      return 'Cancelled. You can start again with /report_lost, /report_found, /search, /claim, or /support.';
    }

    if (user.conversationState !== 'idle' && !isCommand) {
      return this.completeActiveFlow(phoneNumber, platform, user.conversationState, text, mediaUrl || null);
    }

    switch (command.command) {
      case 'start':
        this.resetSession(phoneNumber, platform);
        return [
          'Welcome to FindIt.',
          '',
          'I can help you report lost items, register found items, search the registry, claim items, and contact support.',
          '',
          'Type /help to see all commands.',
        ].join('\n');

      case 'help':
        return this.getHelpMenu(platform);

      case 'report_lost':
        if (command.args && command.args.length > 0) {
          return this.saveReportFromText(phoneNumber, platform, 'lost', command.args.join(' '), mediaUrl || null);
        }
        this.updateSessionState(phoneNumber, platform, 'reporting_lost');
        return this.getReportPrompt('lost');

      case 'report_found':
        if (command.args && command.args.length > 0) {
          return this.saveReportFromText(phoneNumber, platform, 'found', command.args.join(' '), mediaUrl || null);
        }
        this.updateSessionState(phoneNumber, platform, 'reporting_found');
        return this.getReportPrompt('found');

      case 'search':
        if (command.args && command.args.length > 0) {
          const searchTerm = command.args.join(' ');
          const searchResult = await this.searchRegistry(searchTerm);

          if (!searchResult.success) {
            return 'Error searching the registry. Please try again.';
          }

          if ('items' in searchResult && Array.isArray(searchResult.items)) {
            const items = searchResult.items as Array<{ id: string; name?: string; description?: string }>;
            const formattedItems = items
              .map((item, index) =>
                `${index + 1}. ${item.name || 'Unnamed item'}\nID: ${item.id}\n${item.description || 'No description'}`
              )
              .join('\n\n');

            return `Found ${items.length} open item(s):\n\n${formattedItems}\n\nUse /claim <itemId> to claim one.`;
          }

          return `No open items found matching "${searchTerm}".`;
        }
        return 'Please specify what to search. Example: /search wallet';

      case 'claim':
        if (command.args && command.args.length > 0) {
          const claimResult = await this.claimItem(command.args[0], phoneNumber, platform);
          return claimResult.success ? 'Item claimed. The registry has been updated.' : claimResult.message;
        }
        return 'Please provide an item ID. Example: /claim abc123';

      case 'support':
      case 'contact':
        if (command.args && command.args.length > 0) {
          return (await this.createSupportTicket(phoneNumber, platform, command.args.join(' '))).message;
        }
        this.updateSessionState(phoneNumber, platform, 'requesting_support');
        return 'Tell support what happened.\n\nFormat: Subject | Message | Priority(optional: low, medium, high)\n\nType /cancel to stop.';

      default:
        return `I did not understand that command.\n\n${this.getHelpMenu(platform)}`;
    }
  }

  /**
   * Handle report lost item workflow
   */
static async handleReportLost(phoneNumber: string, platform: 'whatsapp' | 'telegram', itemData: { name: string; description: string; contact?: string; imageUrl?: string }) {
  try {
    let finalImageUrl = itemData.imageUrl || null;
    if (finalImageUrl) {
      const uploaded = await this.uploadToCloudinary(finalImageUrl);
      if (uploaded) finalImageUrl = uploaded;
    }

    const docRef = await addDoc(collection(db, 'items'), {
      uid: `${platform}:${phoneNumber}`,
      name: itemData.name,
      description: itemData.description,
      contact: itemData.contact || phoneNumber,
      imageUrl: finalImageUrl,
      createdAt: serverTimestamp(),
      claimed: false,
      source: 'bot',
      platform,
      type: 'lost',
    });

    return { success: true, itemId: docRef.id, message: `Lost item reported. ID: ${docRef.id}` };
  } catch (error) {
    console.error('Error reporting lost item:', error);
    return { success: false, message: 'Failed to report item. Please try again.', error };
  }
}


  /**
   * Handle report found item workflow
   */
static async handleReportFound(phoneNumber: string, platform: 'whatsapp' | 'telegram', itemData: { name: string; description: string; contact?: string; imageUrl?: string }) {
  try {
    let finalImageUrl = itemData.imageUrl || null;
    if (finalImageUrl) {
      const uploaded = await this.uploadToCloudinary(finalImageUrl);
      if (uploaded) finalImageUrl = uploaded;
    }

    const docRef = await addDoc(collection(db, 'items'), {
      uid: `${platform}:${phoneNumber}`,
      name: itemData.name,
      description: itemData.description,
      contact: itemData.contact || phoneNumber,
      imageUrl: finalImageUrl,
      createdAt: serverTimestamp(),
      claimed: false,
      source: 'bot',
      platform,
      type: 'found',
    });

    return { success: true, itemId: docRef.id, message: `Found item registered. ID: ${docRef.id}` };
  } catch (error) {
    console.error('Error reporting found item:', error);
    return { success: false, message: 'Failed to register found item. Please try again.', error };
  }
}

  /**
   * Search items by name or description
   */
  static async searchRegistry(searchTerm: string, limit: number = 5) {
    try {
      const itemsCollection = collection(db, 'items');
      const q = query(itemsCollection, where('claimed', '==', false));
      const querySnapshot = await getDocs(q);

      const searchLower = searchTerm.toLowerCase();
      const results: RegistrySearchItem[] = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }) as RegistrySearchItem)
        .filter(item => 
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, limit);

      if (results.length === 0) {
        return {
          success: true,
          found: false,
          message: `No items found matching "${searchTerm}"`,
        };
      }

      const formattedResults = results.map((item, index) => 
        `${index + 1}. *${item.name}* - ${item.description?.substring(0, 50)}...`
      ).join('\n');

      return {
        success: true,
        found: true,
        count: results.length,
        items: results,
        message: `Found ${results.length} item(s):\n\n${formattedResults}`,
      };
    } catch (error) {
      console.error('Error searching registry:', error);
      return {
        success: false,
        message: 'Error searching registry. Please try again.',
        error,
      };
    }
  }

  /**
   * Claim an item by ID
   */
static async claimItem(itemId: string, phoneNumber: string, platform: 'whatsapp' | 'telegram') {
  try {
    const itemRef = doc(db, 'items', itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
      return { success: false, message: 'Item not found. Check the ID and try again.' };
    }

    const itemData = itemDoc.data();
    if (itemData.claimed) {
      return { success: false, message: 'This item has already been claimed.' };
    }

    await updateDoc(itemRef, {
      claimed: true,
      claimedAt: serverTimestamp(),
      claimedBy: `${platform}:${phoneNumber}`,
    });

    // 🔹 Notify reporter
    if (itemData.contact) {
      await this.notifyReporter(itemData.contact, `Your item "${itemData.name}" has been claimed.`);
    }

    return { success: true, message: `Item claimed. The reporter will be notified at ${itemData.contact}` };
  } catch (error) {
    console.error('Error claiming item:', error);
    return { success: false, message: 'Failed to claim item. Please try again.', error };
  }
}

  static async createSupportTicket(
    phoneNumber: string,
    platform: 'whatsapp' | 'telegram',
    supportText: string
  ) {
    const parts = supportText.split('|').map((part) => part.trim()).filter(Boolean);
    const priority = ['low', 'medium', 'high'].includes((parts[2] || '').toLowerCase())
      ? parts[2].toLowerCase()
      : 'medium';

    if (!parts[0] || !parts[1]) {
      return {
        success: false,
        message: 'Please send support details as: Subject | Message | Priority(optional: low, medium, high)',
      };
    }

    try {
      const docRef = await addDoc(collection(db, 'support_tickets'), {
        name: `${platform} user ${phoneNumber}`,
        email: '',
        contact: phoneNumber,
        subject: parts[0],
        message: parts[1],
        priority,
        status: 'open',
        source: 'bot',
        platform,
        userId: `${platform}:${phoneNumber}`,
        createdAt: serverTimestamp(),
        replies: [],
      });

      return {
        success: true,
        ticketId: docRef.id,
        message: `Support ticket submitted. Ticket ID: ${docRef.id}`,
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      return {
        success: false,
        message: 'Failed to submit your support ticket. Please try again.',
        error,
      };
    }
  }

  private static async completeActiveFlow(
    phoneNumber: string,
    platform: 'whatsapp' | 'telegram',
    state: BotUser['conversationState'],
    message: string,
    mediaUrl: string | null
  ) {
    if (state === 'reporting_lost') {
      const response = await this.saveReportFromText(phoneNumber, platform, 'lost', message, mediaUrl);
      this.resetSession(phoneNumber, platform);
      return response;
    }

    if (state === 'reporting_found') {
      const response = await this.saveReportFromText(phoneNumber, platform, 'found', message, mediaUrl);
      this.resetSession(phoneNumber, platform);
      return response;
    }

    if (state === 'requesting_support') {
      const result = await this.createSupportTicket(phoneNumber, platform, message);
      this.resetSession(phoneNumber, platform);
      return result.message;
    }

    return this.getHelpMenu(platform);
  }

  private static async saveReportFromText(
    phoneNumber: string,
    platform: 'whatsapp' | 'telegram',
    type: 'lost' | 'found',
    message: string,
    mediaUrl: string | null
  ) {
    const parts = message.split('|').map((part) => part.trim()).filter(Boolean);

    if (parts.length < 2) {
      return this.getReportPrompt(type);
    }

    const locationNote = parts[2] ? `\nLocation/notes: ${parts.slice(2).join(' | ')}` : '';
    const itemData = {
      name: parts[0],
      description: `${parts[1]}${locationNote}`,
      contact: phoneNumber,
      imageUrl: mediaUrl || undefined,
    };

    const result = type === 'lost'
      ? await this.handleReportLost(phoneNumber, platform, itemData)
      : await this.handleReportFound(phoneNumber, platform, itemData);

    if (result.success) {
      return `${type === 'lost' ? 'Lost item reported' : 'Found item registered'}. ID: ${result.itemId}`;
    }

    return result.message;
  }

  private static getReportPrompt(type: 'lost' | 'found') {
    const action = type === 'lost' ? 'report a lost item' : 'register a found item';
    const place = type === 'lost' ? 'Where/when lost' : 'Where found';

    return [
      `Let's ${action}.`,
      '',
      `Format: Item name | Description | ${place}`,
      '',
      'Example: Black wallet | Leather wallet with ID cards | Main library, Tuesday evening',
      '',
      'Type /cancel to stop.',
    ].join('\n');
  }

  /**
   * Get help menu
   */
  static getHelpMenu(platform: 'whatsapp' | 'telegram'): string {
    const commands = [
      '/start - Show welcome message',
      '/report_lost - Report a lost item',
      '/report_found - Report a found item',
      '/search <term> - Search the registry',
      '/claim <itemId> - Claim an item',
      '/support - Contact support',
      '/cancel - Cancel the current flow',
      '/help - Show this menu',
    ];

    const delimiter = platform === 'telegram' ? '\n' : '\n';
    return `FindIt Bot Commands${delimiter}\n${commands.join(delimiter)}`;
  }

  /**
   * Get welcome message
   */
  static getWelcomeMessage(): string {
    return `Welcome to FindIt!\n\nI'm your lost and found assistant. I can help you:\n\n` +
           `Report lost items\n` +
           `Report found items\n` +
           `Search our registry\n` +
           `Claim items you've found\n\n` +
           `Type /help to see all commands!`;
  }

  /**
   * Reset user session
   */
  static resetSession(phoneNumber: string, platform: 'whatsapp' | 'telegram') {
    const key = `${platform}:${phoneNumber}`;
    const user = this.userSessions.get(key);
    if (user) {
      user.conversationState = 'idle';
      user.sessionData = {};
    }
  }

  /**
   * Update user session state
   */
  static updateSessionState(
    phoneNumber: string,
    platform: 'whatsapp' | 'telegram',
    state: BotUser['conversationState'],
    data?: Record<string, string>
  ) {
    const key = `${platform}:${phoneNumber}`;
    const user = this.userSessions.get(key);
    if (user) {
      user.conversationState = state;
      if (data) {
        user.sessionData = { ...user.sessionData, ...data };
      }
    }
  }
}

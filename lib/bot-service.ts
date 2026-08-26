// Shared bot service used by the WhatsApp and Telegram webhooks.
import axios from "axios";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export interface BotUser {
  phoneNumber: string;
  platform: "whatsapp" | "telegram";
  conversationState: "idle" | "reporting_lost" | "reporting_found" | "requesting_support";
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

export interface BotResult {
  success: boolean;
  message: string;
  itemId?: string;
  ticketId?: string;
  error?: unknown;
}

export class BotService {
  private static userSessions = new Map<string, BotUser>();

  /**
   * Initialize (or return) a bot user session and persist the platform chat id.
   */
  static async initializeUser(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    chatId?: string
  ): Promise<BotUser> {
    const key = `${platform}:${phoneNumber}`;

    if (this.userSessions.has(key)) {
      return this.userSessions.get(key)!;
    }

    const user: BotUser = {
      phoneNumber,
      platform,
      conversationState: "idle",
      sessionData: { chatId: chatId || "" },
    };

    this.userSessions.set(key, user);

    if (chatId) {
      try {
        await setDoc(
          doc(db, "users", key),
          {
            chatId,
            platform,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to persist bot session chat id:", error);
      }
    }

    return user;
  }

  /**
   * Parse an incoming command message.
   */
  static parseCommand(message: string): BotCommand {
    const parts = message.trim().split(/\s+/);
    return {
      command: (parts[0] || "").replace(/^\//, "").toLowerCase(),
      args: parts.slice(1),
      timestamp: new Date(),
    };
  }

  /**
   * Route a message from either platform through the shared conversation flow.
   */
  static async handleIncomingMessage(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    message: string,
    mediaUrl?: string | null
  ): Promise<string> {
    const text = message.trim();
    const media = mediaUrl ?? null;
    const user = await this.initializeUser(phoneNumber, platform);
    const command = this.parseCommand(text);
    const isCommand = text.startsWith("/");

    if (!text) {
      return "Please send a command or type /help to see what I can do.";
    }

    if (command.command === "cancel") {
      this.resetSession(phoneNumber, platform);
      return "Cancelled. You can start again with /report_lost, /report_found, /search, /claim, or /support.";
    }

    if (user.conversationState !== "idle" && !isCommand) {
      return this.completeActiveFlow(phoneNumber, platform, user.conversationState, text, media);
    }

    switch (command.command) {
      case "start":
        this.resetSession(phoneNumber, platform);
        return this.getWelcomeMessage();

      case "help":
        return this.getHelpMenu();

      case "report_lost":
        return this.startOrCompleteReport(phoneNumber, platform, "lost", command.args, media);

      case "report_found":
        return this.startOrCompleteReport(phoneNumber, platform, "found", command.args, media);

      case "search":
        if (command.args?.length) {
          const result = await this.searchRegistry(command.args.join(" "));
          return result.success && result.found
            ? this.formatSearchResults(result.items as RegistrySearchItem[], command.args.join(" "))
            : result.message;
        }
        return "Please specify what to search. Example: /search wallet";

      case "claim":
        if (command.args?.length) {
          const result = await this.claimItem(command.args[0], phoneNumber, platform);
          return result.message;
        }
        return "Please provide an item ID. Example: /claim abc123";

      case "support":
      case "contact":
        return this.startOrCompleteSupport(phoneNumber, platform, command.args);

      default:
        return `I did not understand that command.\n\n${this.getHelpMenu()}`;
    }
  }

  /**
   * Handle a lost item report.
   */
  static async handleReportLost(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    itemData: { name: string; description: string; contact?: string; imageUrl?: string }
  ): Promise<BotResult> {
    return this.saveReport(phoneNumber, platform, "lost", itemData);
  }

  /**
   * Handle a found item report.
   */
  static async handleReportFound(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    itemData: { name: string; description: string; contact?: string; imageUrl?: string }
  ): Promise<BotResult> {
    return this.saveReport(phoneNumber, platform, "found", itemData);
  }

  /**
   * Search open registry items by name or description.
   */
  static async searchRegistry(searchTerm: string, limit = 5) {
    try {
      const q = query(collection(db, "items"), where("claimed", "==", false));
      const snapshot = await getDocs(q);
      const searchLower = searchTerm.toLowerCase();

      const results: RegistrySearchItem[] = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as RegistrySearchItem)
        .filter(
          (item) =>
            item.name?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, limit);

      if (results.length === 0) {
        return {
          success: true,
          found: false,
          message: `No items found matching "${searchTerm}".`,
        };
      }

      return {
        success: true,
        found: true,
        count: results.length,
        items: results,
        message: `Found ${results.length} item(s).`,
      };
    } catch (error) {
      console.error("Error searching registry:", error);
      return {
        success: false,
        found: false,
        message: "Error searching the registry. Please try again.",
        error,
      };
    }
  }

  /**
   * Claim an open item and notify the reporter when possible.
   */
  static async claimItem(
    itemId: string,
    phoneNumber: string,
    platform: "whatsapp" | "telegram"
  ): Promise<BotResult> {
    try {
      const itemRef = doc(db, "items", itemId);
      const itemDoc = await getDoc(itemRef);

      if (!itemDoc.exists()) {
        return { success: false, message: "Item not found. Check the ID and try again." };
      }

      const data = itemDoc.data() as Record<string, unknown>;
      if (data.claimed) {
        return { success: false, message: "This item has already been claimed." };
      }

      await updateDoc(itemRef, {
        claimed: true,
        claimedAt: serverTimestamp(),
        claimedBy: `${platform}:${phoneNumber}`,
      });

      if (platform === "telegram" && data.contact) {
        await this.notifyTelegramReporter(
          String(data.contact),
          `Your item "${data.name}" has been claimed.`
        );
      }

      return {
        success: true,
        message: `Item claimed. The reporter will be notified at ${data.contact}.`,
      };
    } catch (error) {
      console.error("Error claiming item:", error);
      return { success: false, message: "Failed to claim item. Please try again.", error };
    }
  }

  /**
   * Create a support ticket from a bot message.
   */
  static async createSupportTicket(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    supportText: string
  ): Promise<BotResult> {
    const parts = supportText
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 2) {
      return {
        success: false,
        message: "Please send support details as: Subject | Message | Priority(optional: low, medium, high)",
      };
    }

    const priority = ["low", "medium", "high"].includes(parts[2]?.toLowerCase())
      ? parts[2]!.toLowerCase()
      : "medium";

    try {
      const docRef = await addDoc(collection(db, "support_tickets"), {
        name: `${platform} user ${phoneNumber}`,
        email: "",
        contact: phoneNumber,
        subject: parts[0],
        message: parts[1],
        priority,
        status: "open",
        source: "bot",
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
      console.error("Error creating support ticket:", error);
      return {
        success: false,
        message: "Failed to submit your support ticket. Please try again.",
        error,
      };
    }
  }

  static getHelpMenu(): string {
    const commands = [
      "/start - Show welcome message",
      "/report_lost - Report a lost item",
      "/report_found - Report a found item",
      "/search <term> - Search the registry",
      "/claim <itemId> - Claim an item",
      "/support - Contact support",
      "/cancel - Cancel the current flow",
      "/help - Show this menu",
    ];
    return `FindIt Bot Commands\n\n${commands.join("\n")}`;
  }

  static getWelcomeMessage(): string {
    return [
      "Welcome to FindIt!",
      "",
      "I can help you report lost items, register found items, search the registry, claim items, and contact support.",
      "",
      "Type /help to see all commands.",
    ].join("\n");
  }

  /**
   * Reset a user's conversation to idle.
   */
  static resetSession(phoneNumber: string, platform: "whatsapp" | "telegram") {
    const key = `${platform}:${phoneNumber}`;
    const user = this.userSessions.get(key);
    if (user) {
      user.conversationState = "idle";
      user.sessionData = {};
    }
  }

  /**
   * Update a user's conversation state.
   */
  static updateSessionState(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    state: BotUser["conversationState"],
    data?: Record<string, string>
  ) {
    const key = `${platform}:${phoneNumber}`;
    const user = this.userSessions.get(key);
    if (user) {
      user.conversationState = state;
      if (data) user.sessionData = { ...user.sessionData, ...data };
    }
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private static async saveReport(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    type: "lost" | "found",
    itemData: { name: string; description: string; contact?: string; imageUrl?: string }
  ): Promise<BotResult> {
    try {
      let finalImageUrl = itemData.imageUrl || null;
      if (finalImageUrl) {
        const uploaded = await this.uploadToCloudinary(finalImageUrl);
        if (uploaded) finalImageUrl = uploaded;
      }

      const docRef = await addDoc(collection(db, "items"), {
        uid: `${platform}:${phoneNumber}`,
        name: itemData.name,
        description: itemData.description,
        contact: itemData.contact || phoneNumber,
        imageUrl: finalImageUrl,
        createdAt: serverTimestamp(),
        claimed: false,
        source: "bot",
        platform,
        type,
      });

      const verb = type === "lost" ? "Lost item reported" : "Found item registered";
      return { success: true, itemId: docRef.id, message: `${verb}. ID: ${docRef.id}` };
    } catch (error) {
      console.error(`Error saving ${type} item from bot:`, error);
      return { success: false, message: `Failed to save ${type} item. Please try again.`, error };
    }
  }

  private static async startOrCompleteReport(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    type: "lost" | "found",
    args: string[] | undefined,
    mediaUrl: string | null | undefined
  ) {
    if (args && args.length > 0) {
      return this.saveReportFromText(phoneNumber, platform, type, args.join(" "), mediaUrl || null);
    }

    this.updateSessionState(phoneNumber, platform, type === "lost" ? "reporting_lost" : "reporting_found");
    return this.getReportPrompt(type);
  }

  private static async startOrCompleteSupport(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    args: string[] | undefined
  ) {
    if (args && args.length > 0) {
      return (await this.createSupportTicket(phoneNumber, platform, args.join(" "))).message;
    }

    this.updateSessionState(phoneNumber, platform, "requesting_support");
    return "Tell support what happened.\n\nFormat: Subject | Message | Priority(optional: low, medium, high)\n\nType /cancel to stop.";
  }

  private static async completeActiveFlow(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    state: BotUser["conversationState"],
    message: string,
    mediaUrl: string | null
  ): Promise<string> {
    if (state === "reporting_lost" || state === "reporting_found") {
      const response = await this.saveReportFromText(
        phoneNumber,
        platform,
        state === "reporting_lost" ? "lost" : "found",
        message,
        mediaUrl
      );
      this.resetSession(phoneNumber, platform);
      return response;
    }

    if (state === "requesting_support") {
      const result = await this.createSupportTicket(phoneNumber, platform, message);
      this.resetSession(phoneNumber, platform);
      return result.message;
    }

    return this.getHelpMenu();
  }

  private static async saveReportFromText(
    phoneNumber: string,
    platform: "whatsapp" | "telegram",
    type: "lost" | "found",
    message: string,
    mediaUrl: string | null
  ): Promise<string> {
    const parts = message.split("|").map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) {
      return this.getReportPrompt(type);
    }

    const locationNote = parts[2] ? `\nLocation/notes: ${parts.slice(2).join(" | ")}` : "";
    const result = await this.saveReport(phoneNumber, platform, type, {
      name: parts[0],
      description: `${parts[1]}${locationNote}`,
      contact: phoneNumber,
      imageUrl: mediaUrl || undefined,
    });

    return result.message;
  }

  private static getReportPrompt(type: "lost" | "found") {
    const action = type === "lost" ? "report a lost item" : "register a found item";
    const place = type === "lost" ? "Where/when lost" : "Where found";

    return [
      `Let's ${action}.`,
      "",
      `Format: Item name | Description | ${place}`,
      "",
      "Example: Black wallet | Leather wallet with ID cards | Main library, Tuesday evening",
      "",
      "Type /cancel to stop.",
    ].join("\n");
  }

  private static formatSearchResults(
    items: Array<{ id: string; name?: string; description?: string }>,
    searchTerm: string
  ): string {
    const formatted = items
      .map(
        (item, index) =>
          `${index + 1}. ${item.name || "Unnamed item"}\nID: ${item.id}\n${item.description || "No description"}`
      )
      .join("\n\n");

    return `Found ${items.length} open item(s) matching "${searchTerm}":\n\n${formatted}\n\nUse /claim <itemId> to claim one.`;
  }

  private static async uploadToCloudinary(mediaUrl: string): Promise<string | null> {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) {
        console.warn("Cloudinary name or upload preset is not configured.");
        return null;
      }

      const formData = new FormData();
      formData.append("file", mediaUrl);
      formData.append("upload_preset", uploadPreset);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );

      return res.data.secure_url as string;
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      return null;
    }
  }

  private static async notifyTelegramReporter(chatId: string, message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: message,
      });
    } catch (error) {
      console.error("Failed to notify Telegram reporter:", error);
    }
  }
}

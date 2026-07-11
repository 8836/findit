import { NextRequest, NextResponse } from 'next/server';
import { BotService } from '@/lib/bot-service';

// ✅ Base URL helper
function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return 'https://findit-amber.vercel.app';
}

export async function POST(request: NextRequest) {
  try {
    console.log("========== TELEGRAM UPDATE ==========");
    const update = await request.json();
    console.log(JSON.stringify(update, null, 2));

    const message = update.message;

    if (!message) {
      console.log("No message object received.");
      return NextResponse.json({ ok: true });
    }

    console.log("Chat ID:", message.chat?.id);
    console.log("Text:", message.text);

    if (!message?.text || !message.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const messageText = message.text;
    const userId = chatId; // 🔹 consistent identifier

    // ✅ Log the chosen base URL for debugging
    const baseUrl = getBaseUrl();
    console.log("Webhook base URL:", baseUrl);

    // Store chatId in Firestore
    const user = await BotService.initializeUser(userId, 'telegram', chatId);
    const command = BotService.parseCommand(messageText);
    console.log("Parsed command:", command.command);
    const isCommand = messageText.trim().startsWith('/');
    let response = '';

    if (user.conversationState !== 'idle' && !isCommand) {
      const parts = messageText.split('|').map((part: string) => part.trim()).filter(Boolean);

      if (user.conversationState === 'reporting_lost') {
        if (parts.length >= 2) {
          const result = await BotService.handleReportLost(userId, 'telegram', {
            name: parts[0],
            description: parts[2] ? `${parts[1]}\nLocation/notes: ${parts.slice(2).join(' | ')}` : parts[1],
            contact: chatId,
          });
          response = result.message;
          BotService.resetSession(userId, 'telegram');
        } else {
          response = 'Please provide at least: Item name | Description';
        }
      } else if (user.conversationState === 'reporting_found') {
        if (parts.length >= 2) {
          const result = await BotService.handleReportFound(userId, 'telegram', {
            name: parts[0],
            description: parts[2] ? `${parts[1]}\nLocation/notes: ${parts.slice(2).join(' | ')}` : parts[1],
            contact: chatId,
          });
          response = result.message;
          BotService.resetSession(userId, 'telegram');
        } else {
          response = 'Please provide at least: Item name | Description';
        }
      } else if (user.conversationState === 'requesting_support') {
        const result = await BotService.createSupportTicket(userId, 'telegram', messageText);
        response = result.message;
        BotService.resetSession(userId, 'telegram');
      }
    } else {
      switch (command.command) {
        case 'start':
          response = BotService.getWelcomeMessage();
          BotService.resetSession(userId, 'telegram');
          break;

        case 'help':
          response = BotService.getHelpMenu('telegram');
          break;

        case 'cancel':
          BotService.resetSession(userId, 'telegram');
          response = 'Cancelled. You can start again with /report_lost, /report_found, /search, /claim, or /support.';
          break;

        case 'report_lost':
          if (command.args && command.args.length > 0) {
            response = await saveTelegramReport(userId, chatId, 'lost', command.args.join(' '));
          } else {
            BotService.updateSessionState(userId, 'telegram', 'reporting_lost');
            response = [
              "Let's report a lost item.",
              '',
              'Format: Item name | Description | Where/when lost',
              '',
              'Example: Black wallet | Leather wallet with ID cards | Main library, Tuesday evening',
              '',
              'Type /cancel to stop.',
            ].join('\n');
          }
          break;

        case 'report_found':
          if (command.args && command.args.length > 0) {
            response = await saveTelegramReport(userId, chatId, 'found', command.args.join(' '));
          } else {
            BotService.updateSessionState(userId, 'telegram', 'reporting_found');
            response = [
              "Let's register a found item.",
              '',
              'Format: Item name | Description | Where found',
              '',
              'Example: Black wallet | Leather wallet with ID cards | Main library',
              '',
              'Type /cancel to stop.',
            ].join('\n');
          }
          break;

        case 'search':
          if (command.args && command.args.length > 0) {
            const searchTerm = command.args.join(' ');
            const searchResult = await BotService.searchRegistry(searchTerm);
            response = searchResult.message;
          } else {
            response = 'Please specify what to search. Example: /search wallet';
          }
          break;

        case 'claim':
          if (command.args && command.args.length > 0) {
            const claimResult = await BotService.claimItem(command.args[0], userId, 'telegram');
            response = claimResult.message;
          } else {
            response = 'Please provide an item ID. Example: /claim abc123';
          }
          break;

        case 'support':
        case 'contact':
          if (command.args && command.args.length > 0) {
            const result = await BotService.createSupportTicket(userId, 'telegram', command.args.join(' '));
            response = result.message;
          } else {
            BotService.updateSessionState(userId, 'telegram', 'requesting_support');
            response = 'Tell support what happened.\n\nFormat: Subject | Message | Priority(optional: low, medium, high)\n\nType /cancel to stop.';
          }
          break;

        default:
          response = `I did not understand that command.\n\n${BotService.getHelpMenu('telegram')}`;
      }
    }

    console.log("Replying with:");
    console.log(response);

    const sendResult = await sendTelegramMessage(chatId, response);

    if (sendResult) {
      return sendResult;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram bot error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Telegram bot endpoint is running',
    timestamp: new Date().toISOString(),
    baseUrl: getBaseUrl(), // ✅ show which URL is active
  });
}

async function saveTelegramReport(userId: string, chatId: string, type: 'lost' | 'found', reportText: string) {
  // Normalize spacing around pipes
  const parts = reportText.replace(/\s*\|\s*/g, '|').split('|').map(p => p.trim()).filter(Boolean);

  console.log("Parsed parts:", parts); // ✅ Debugging log

  if (parts.length < 2) {
    return type === 'lost'
      ? 'Please send lost item details as: Item name | Description | Where/when lost'
      : 'Please send found item details as: Item name | Description | Where found';
  }

  const itemData = {
    name: parts[0],
    description: parts[2] ? `${parts[1]}\nLocation/notes: ${parts.slice(2).join(' | ')}` : parts[1],
    contact: chatId,
  };

  try {
    const result = type === 'lost'
      ? await BotService.handleReportLost(userId, 'telegram', itemData)
      : await BotService.handleReportFound(userId, 'telegram', itemData);

    return result.message;
  } catch (err) {
    console.error("Report failed:", err);
    return "Something went wrong saving your report. Please try again.";
  }
}


async function sendTelegramMessage(chatId: string | number, text: string) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!telegramToken) {
    console.error('TELEGRAM_BOT_TOKEN not set');

    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        ok: true,
        response: text,
        warning: 'TELEGRAM_BOT_TOKEN is not configured; skipped Telegram send in development.',
      });
    }

    return NextResponse.json({ ok: false, error: 'Bot token not configured' }, { status: 500 });
  }

  console.log("Sending message to Telegram...");
  console.log(chatId);
  console.log(text);

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${telegramToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  const body = await telegramResponse.text();

  console.log("Telegram Status:", telegramResponse.status);
  console.log("Telegram Response:", body);

  if (!telegramResponse.ok) {
    console.error("Telegram send failed:", body);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to send Telegram response",
      },
      {
        status: 502,
      }
    );
  }

  return null;
}

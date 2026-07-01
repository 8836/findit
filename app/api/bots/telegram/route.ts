import { NextRequest, NextResponse } from 'next/server';
import { BotService } from '@/lib/bot-service';

// Telegram bot message handler
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Extract Telegram message data
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true }); // Ignore non-text messages
    }

    const chatId = message.chat.id;
    const messageText = message.text;
    const userId = `${chatId}`; // Use chat ID as unique identifier

    const botResponse = await BotService.handleIncomingMessage(userId, 'telegram', messageText);
    const sharedTelegramToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!sharedTelegramToken) {
      console.error('TELEGRAM_BOT_TOKEN not set');
      return NextResponse.json({ ok: false, error: 'Bot token not configured' }, { status: 500 });
    }

    await fetch(`https://api.telegram.org/bot${sharedTelegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: botResponse,
      }),
    });

    return NextResponse.json({ ok: true });
    /*
    Legacy per-command handler retained only for reference. Runtime now uses
    BotService.handleIncomingMessage so WhatsApp and Telegram stay aligned.

    // Initialize user session
    const user = await BotService.initializeUser(userId, 'telegram');

    // Parse command
    const command = BotService.parseCommand(messageText);

    let response = '';

    switch (command.command) {
      case 'start':
        response = BotService.getWelcomeMessage();
        BotService.resetSession(userId, 'telegram');
        break;

      case 'help':
        response = BotService.getHelpMenu('telegram');
        break;

      case 'report_lost':
        if (user.conversationState === 'idle') {
          BotService.updateSessionState(userId, 'telegram', 'reporting_lost');
          response = `📝 Let's report a lost item.\n\nPlease tell me:\n1. Item name\n2. Description\n3. Where/when lost\n\nFormat: Name | Description | Location/When`;
        } else if (user.conversationState === 'reporting_lost') {
          const parts = messageText.split('|').map(s => s.trim());
          if (parts.length >= 2) {
            const result = await BotService.handleReportLost(userId, 'telegram', {
              name: parts[0],
              description: parts[1],
              contact: parts[2] || userId,
            });
            response = result.message;
            BotService.resetSession(userId, 'telegram');
          } else {
            response = '❌ Please provide at least: Name | Description';
          }
        }
        break;

      case 'report_found':
        if (user.conversationState === 'idle') {
          BotService.updateSessionState(userId, 'telegram', 'reporting_found');
          response = `📦 Let's register a found item.\n\nPlease tell me:\n1. Item name\n2. Description\n3. Where found\n\nFormat: Name | Description | Location`;
        } else if (user.conversationState === 'reporting_found') {
          const parts = messageText.split('|').map(s => s.trim());
          if (parts.length >= 2) {
            const result = await BotService.handleReportFound(userId, 'telegram', {
              name: parts[0],
              description: parts[1],
              contact: parts[2] || userId,
            });
            response = result.message;
            BotService.resetSession(userId, 'telegram');
          } else {
            response = '❌ Please provide at least: Name | Description';
          }
        }
        break;

      case 'search':
        if (command.args && command.args.length > 0) {
          const searchTerm = command.args.join(' ');
          const searchResult = await BotService.searchRegistry(searchTerm);
          response = searchResult.message;
        } else {
          response = '❌ Please specify what to search. Example: /search wallet';
        }
        break;

      case 'claim':
        if (command.args && command.args.length > 0) {
          const itemId = command.args[0];
          const claimResult = await BotService.claimItem(itemId, userId, 'telegram');
          response = claimResult.message;
        } else {
          response = '❌ Please provide an item ID. Example: /claim <itemId>';
        }
        break;

      default:
        response = `🤖 I didn't understand that command.\n\n${BotService.getHelpMenu('telegram')}`;
    }

    // Send response back to Telegram
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramToken) {
      console.error('TELEGRAM_BOT_TOKEN not set');
      return NextResponse.json({ ok: false, error: 'Bot token not configured' }, { status: 500 });
    }

    // Send message via Telegram Bot API
    const apiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: response,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ ok: true });
    */

  } catch (error) {
    console.error('Telegram bot error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'Telegram bot endpoint is running',
    timestamp: new Date(),
  });
}

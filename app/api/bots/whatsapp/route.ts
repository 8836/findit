import { NextRequest, NextResponse } from 'next/server';
import { BotService } from '@/lib/bot-service';

// WhatsApp message service using Twilio
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract WhatsApp message data from Twilio webhook
    const from = formData.get('From') as string; // Format: "whatsapp:+1234567890"
    const messageBody = formData.get('Body') as string;
    const mediaUrl = formData.get('MediaUrl0') as string;

    if (!from) {
      return twimlResponse('Missing sender information.');
    }

    const sandboxPhoneNumber = from.replace('whatsapp:', '');
    const sandboxResponse = await BotService.handleIncomingMessage(
      sandboxPhoneNumber,
      'whatsapp',
      messageBody || '',
      mediaUrl || null
    );

    return twimlResponse(sandboxResponse);
    /*
    Legacy JSON response path retained only for reference. Twilio Sandbox expects
    TwiML from the webhook, so runtime returns above.
     
    if (!from || !messageBody) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract phone number from Twilio format
    const phoneNumber = from.replace('whatsapp:', '');

    // Initialize user session
    const user = await BotService.initializeUser(phoneNumber, 'whatsapp');

    // Parse command
    const command = BotService.parseCommand(messageBody);

    let response = '';

    switch (command.command) {
      case 'start':
        response = BotService.getWelcomeMessage();
        BotService.resetSession(phoneNumber, 'whatsapp');
        break;

      case 'help':
        response = BotService.getHelpMenu('whatsapp');
        break;

      case 'report_lost':
        if (user.conversationState === 'idle') {
          BotService.updateSessionState(phoneNumber, 'whatsapp', 'reporting_lost');
          response = `📝 Let's report a lost item.\n\nPlease tell me:\n1. Item name\n2. Description\n3. Where/when lost\n\nFormat: Name | Description | Location/When`;
        } else if (user.conversationState === 'reporting_lost') {
          const parts = messageBody.split('|').map(s => s.trim());
          if (parts.length >= 2) {
            const result = await BotService.handleReportLost(phoneNumber, 'whatsapp', {
              name: parts[0],
              description: parts[1],
              contact: parts[2] || phoneNumber,
            });
            response = result.message;
            BotService.resetSession(phoneNumber, 'whatsapp');
          } else {
            response = '❌ Please provide at least: Name | Description';
          }
        }
        break;

      case 'report_found':
        if (user.conversationState === 'idle') {
          BotService.updateSessionState(phoneNumber, 'whatsapp', 'reporting_found');
          response = `📦 Let's register a found item.\n\nPlease tell me:\n1. Item name\n2. Description\n3. Where found\n\nFormat: Name | Description | Location`;
        } else if (user.conversationState === 'reporting_found') {
          const parts = messageBody.split('|').map(s => s.trim());
          if (parts.length >= 2) {
            const result = await BotService.handleReportFound(phoneNumber, 'whatsapp', {
              name: parts[0],
              description: parts[1],
              contact: parts[2] || phoneNumber,
            });
            response = result.message;
            BotService.resetSession(phoneNumber, 'whatsapp');
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
          const claimResult = await BotService.claimItem(itemId, phoneNumber, 'whatsapp');
          response = claimResult.message;
        } else {
          response = '❌ Please provide an item ID. Example: /claim <itemId>';
        }
        break;

      default:
        response = `🤖 I didn't understand that command.\n\n${BotService.getHelpMenu('whatsapp')}`;
    }

    // Send response back via Twilio WhatsApp
    // Note: In production, you'd use Twilio SDK here
    // For now, we'll just return the response
    return NextResponse.json({
      status: 'success',
      response,
      phoneNumber,
      timestamp: new Date(),
    });
    */

  } catch (error) {
    console.error('WhatsApp bot error:', error);
    return twimlResponse('FindIt had trouble handling that message. Please try again.');
  }
}

// Webhook verification for Twilio
export async function GET(request: NextRequest) {
  if (!request.nextUrl.searchParams.has('hub.challenge')) {
    return NextResponse.json({
      status: 'WhatsApp Twilio Sandbox bot endpoint is running',
      webhook: '/api/bots/whatsapp',
      mode: 'twilio-sandbox',
    });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify token matches your Twilio token
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token';

    if (token === verifyToken) {
      return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Invalid verify token' },
      { status: 403 }
    );
  } catch (error) {
    console.error('WhatsApp webhook verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function twimlResponse(message: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    }
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

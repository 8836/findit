# FindIt Bot Setup Guide

This guide explains how to set up and configure the WhatsApp and Telegram bots for FindIt.

## Overview

The FindIt bots mirror all web app functionality directly in messaging platforms:
- **Report Lost Items** - Users report items they've lost
- **Report Found Items** - Users register items they've found
- **Search Registry** - Search for items by name or description
- **Claim Items** - Claim found items you're looking for
- **Contact Support** - Create a support ticket from WhatsApp or Telegram

All data is synchronized with the same Firebase backend, so items reported via bot appear on the web dashboard and vice versa.

## Architecture

```
WhatsApp Bot (Twilio) <---> Firebase Firestore <---> Telegram Bot (Bot API)
     ↓
  Web App (/dashboard)
```

## WhatsApp Bot Setup (Twilio Sandbox)

### Prerequisites
- Twilio account (free trial available)
- WhatsApp Business account (optional - we use Twilio Sandbox)

### Step 1: Create Twilio Account
1. Go to [https://www.twilio.com/console](https://www.twilio.com/console)
2. Sign up for a free account
3. Navigate to **Messaging → WhatsApp**

### Step 2: Enable Twilio WhatsApp Sandbox
1. In Twilio Console, go to **Messaging → Sandboxes**
2. Select **WhatsApp Sandbox**
3. You'll see a sandbox phone number (e.g., `+1 415 523 8886`)
4. Send the code shown (e.g., `join RAPID-FRUIT`) to the number to join the sandbox

### Step 3: Configure Webhook

1. In your Twilio Console, go to **Messaging → Settings → WhatsApp Sandboxes**
2. Under "Sandbox Configuration", find "When a message comes in"
3. Set the webhook URL to:
   ```
   https://yourdomain.com/api/bots/whatsapp
   ```
4. Select `HTTP POST` method
5. **Webhook URL for status callbacks** (optional):
   ```
   https://yourdomain.com/api/bots/whatsapp/status
   ```

### Step 4: Add Environment Variables

Add to your `.env.local`:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+1415523xxxx
WHATSAPP_VERIFY_TOKEN=your_random_verify_token
```

### Step 5: Test
Send a message to your Twilio WhatsApp number:
```
/start
```

## Telegram Bot Setup

### Prerequisites
- Telegram account
- BotFather access (@BotFather on Telegram)

### Step 1: Create a Bot with BotFather

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts:
   - Choose a name for your bot (e.g., "FindIt Bot")
   - Choose a username (must end with "bot", e.g., "@findit_bot")
4. BotFather will give you a **bot token** (keep this safe!)

Example token: `123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh`

### Step 2: Configure Webhook

Use one of two methods:

#### Method A: Webhook (Recommended for production)
```bash
curl -X POST https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://yourdomain.com/api/bots/telegram",
    "allowed_updates": ["message"]
  }'
```

#### Method B: Polling (For local testing)
```bash
# Run a polling script
node scripts/telegram-polling.js
```

### Step 3: Add Environment Variables

Add to your `.env.local`:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
TELEGRAM_BOT_USERNAME=findit_bot
```

### Step 4: Test
Open your bot in Telegram and send:
```
/start
```

## Bot Commands

Both WhatsApp and Telegram bots support the following commands:

### `/start`
Shows welcome message with overview of features.

**Example:**
```
/start
```

**Response:**
```
👋 Welcome to FindIt!

I'm your lost and found assistant. I can help you:

📝 Report lost items
📦 Report found items
🔍 Search our registry
✅ Claim items you've found

Type /help to see all commands!
```

### `/help`
Display all available commands and syntax.

**Example:**
```
/help
```

### `/report_lost`
Start workflow to report a lost item.

**Example:**
```
/report_lost
iPhone 14 | Silver color, case with purple flowers | Lost at Central Mall on Tuesday afternoon
```

**Format:**
```
/report_lost
Item Name | Description | Location/When Lost
```

**Response:**
```
✅ Lost item reported! ID: abc123def456
```

### `/report_found`
Register a found item in the system.

**Example:**
```
/report_found
Blue Wallet | Contains ID cards and credit cards | Found at Bus Station
```

**Format:**
```
/report_found
Item Name | Description | Where Found
```

**Response:**
```
✅ Found item registered! ID: xyz789uvw012
```

### `/search <term>`
Search the registry for items.

**Examples:**
```
/search wallet
/search keys
/search phone
```

**Response:**
```
🔍 Found 2 item(s):

1. *Black Wallet* - Contains ID cards and credit cards, found...
2. *Leather Wallet* - Brown with initials "JD", lost at...
```

### `/claim <itemId>`
Claim a found item. The original reporter will be notified.

**Example:**
```
/claim abc123def456
```

**Response:**
```
✅ Item claimed! The reporter will be notified at [contact info]
```

### `/support`
Create a support ticket from WhatsApp or Telegram.

**Example:**
```
/support Cannot claim item | The claim command says the item is missing | high
```

**Format:**
```
/support Subject | Message | Priority(optional: low, medium, high)
```

## Data Storage

### Items Collection
All items (from web or bot) are stored in Firebase Firestore under `items`:

```javascript
{
  uid: "whatsapp:+1234567890",      // Bot user identifier
  name: "iPhone 14",
  description: "Silver color, case with flowers",
  contact: "+1234567890",
  imageUrl: null,                     // Bots don't support images yet
  createdAt: Timestamp,
  claimed: false,
  claimedAt: null,
  claimedBy: null,
  source: "bot",                      // "web" or "bot"
  platform: "whatsapp",               // "whatsapp" or "telegram"
  type: "lost"                        // "lost" or "found"
}
```

### Support Tickets Collection
User support messages are stored under `support_tickets`:

```javascript
{
  name: "John Doe",
  email: "john@example.com",
  subject: "Cannot report item",
  message: "I'm getting an error when trying to upload photos",
  priority: "high",
  status: "open",                     // "open", "in-progress", "resolved"
  createdAt: Timestamp,
  replies: []                          // Admin replies
}
```

## Local Development

### 1. Run Dev Server
```bash
cd findit
npm run dev
```

The app will be available at `http://localhost:3000`.

### 2. Expose Local Server (For webhooks)
Use a tunneling service like `ngrok` to expose your local development server:

```bash
# Install ngrok if not already installed
npm install -g ngrok

# Create a tunnel
ngrok http 3000
```

This will provide you with a public URL like `https://random-string.ngrok.io`.

### 3. Update Webhook URLs
Replace webhook URLs in your Twilio/Telegram console with:
```
https://random-string.ngrok.io/api/bots/whatsapp
https://random-string.ngrok.io/api/bots/telegram
```

### 4. Test
Send messages to the bot through WhatsApp or Telegram.

## Environment Variables Reference

```env
# Twilio WhatsApp Sandbox Configuration
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
# WHATSAPP_VERIFY_TOKEN is only needed if you later add Meta webhook verification.
WHATSAPP_VERIFY_TOKEN=

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=

# Existing Firebase Config (from previous setup)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Troubleshooting

### WhatsApp Bot Not Responding
1. **Check webhook URL**: Verify the URL is correct and accessible
2. **Verify token**: Ensure `WHATSAPP_VERIFY_TOKEN` matches in Twilio console
3. **Check logs**: Look at Twilio console → Logs → Messages for errors
4. **Resend join code**: You may need to resend the sandbox join code

### Telegram Bot Not Responding
1. **Check bot token**: Verify token is correct and hasn't been regenerated
2. **Verify webhook**: Run test webhook with:
   ```bash
   curl -X GET https://api.telegram.org/bot{TOKEN}/getMe
   ```
3. **Check webhook health**: 
   ```bash
   curl -X GET https://api.telegram.org/bot{TOKEN}/getWebhookInfo
   ```
4. **Use polling**: Switch to polling mode for local testing

### Items Not Appearing
1. **Check Firebase connection**: Ensure Firebase credentials are correct
2. **Check database rules**: Items must be writeable from bot endpoints
3. **View Firestore console**: Navigate to Firebase console and check `items` collection

### Support Page Not Showing
1. **Verify route exists**: Check that `/support` page loads
2. **Check Firebase permissions**: Ensure `support_tickets` collection is writable
3. **Inspect browser console**: Look for JavaScript errors

## Future Enhancements

- [ ] Image support for items via bot
- [ ] Location sharing via bot
- [ ] Persistent user profiles linked to bots
- [ ] Email notifications when items are claimed
- [ ] Admin dashboard for bot analytics
- [ ] Multi-language bot support
- [ ] Payment integration for premium features
- [ ] Integration with WhatsApp official business API (after Meta verification)

## Production Deployment

### WhatsApp
When ready for production:
1. Apply for official Meta WhatsApp Business account verification
2. Set up official business phone number
3. Update webhook endpoints in Meta Business console
4. Implement proper rate limiting and error handling

### Telegram
For production:
1. Deploy to cloud platform (Vercel, AWS, GCP, etc.)
2. Set webhook URLs to production domain
3. Monitor bot performance and user metrics
4. Implement logging and alerting

## Support

For issues or questions about the bot setup:
1. Visit FindIt Support page: `/support`
2. Submit a support ticket
3. Or email: `support@findit.local`

---

**Last Updated:** 2026-07-01  
**Version:** 1.0

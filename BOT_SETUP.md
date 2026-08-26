# FindIt Bot Setup Guide

This guide explains how to set up and configure the WhatsApp, Telegram, and
Signal bots for FindIt.

## Overview

The FindIt bots mirror the web app functionality directly in messaging platforms:

- **Report Lost Items** - Users report items they've lost
- **Report Found Items** - Users register items they've found
- **Search Registry** - Search for items by name or description
- **Claim Items** - Claim found items you're looking for
- **Contact Support** - Create a support ticket from any supported messaging app

All data is synchronized with the same Firebase backend, so items reported via a
bot appear on the web dashboard and vice versa.

## Architecture

```
WhatsApp Bot (Twilio) ─┐
Telegram Bot (Bot API) ─┤─> Next.js API routes ─> Firebase Firestore
Signal Bot (signal-cli-rest-api) ─┘
      │
      └──> Web App (/dashboard)
```

| Platform  | Webhook endpoint       | Outbound reply strategy            |
| --------- | ---------------------- | ---------------------------------- |
| WhatsApp  | `/api/bots/whatsapp`   | TwiML response to Twilio           |
| Telegram  | `/api/bots/telegram`   | Telegram Bot API `sendMessage`     |
| Signal    | `/api/bots/signal`     | signal-cli-rest-api `POST /v2/send`|

---

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

---

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
# Run the polling helper against your local dev server
node --env-file=.env.local scripts/telegram-polling.js
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

---

## Signal Bot Setup

Signal does not provide a first-party bot API, so this app integrates with
[signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api). You run
that service next to FindIt; it forwards incoming Signal messages to the FindIt
webhook and sends bot replies back over Signal.

### Prerequisites

- A phone number registered with the Signal app that you want to use as the bot.
  The Signal CLI account for that number must be linked (same device number).
- Docker (or a local install) for `signal-cli-rest-api`.

### Step 1: Start signal-cli-rest-api

The easiest path is Docker. Mount a local volume so the Signal account data
persists, and map the REST API to port `8080`.

```bash
docker run -d \
  --name signal-cli-rest-api \
  --restart unless-stopped \
  -p 8080:8080 \
  -v $(pwd)/signal-data:/home/.local/share/signal-cli \
  -e MODE=normal \
  bbernhard/signal-cli-rest-api:latest
```

If you need the linked Signal device and/or account provisioning, start the
container with `MODE=native`, call `POST /v1/register`, and follow the prompt to
link the device.

### Step 2: Link your Signal account

With the REST API running (adjust the host for your setup):

```bash
# Register/link your Signal number (see signal-cli-rest-api docs).
curl -X POST http://127.0.0.1:8080/v1/register -d '{"number":"+15551234567"}'
```

Verify it works from the API side, then try sending to your own number.

### Step 3: Point incoming messages at FindIt

signal-cli-rest-api can push incoming messages to a webhook. Configure the
webhook to your deployed app:

```
https://yourdomain.com/api/bots/signal
```

In the signal-cli-rest-api config, set the webhook to that URL (the container
exposes it via `signal-cli-rest-api` settings / `--webhook-url` flag depending
on your version). Every incoming message will be forwarded to FindIt.

### Step 4: Add Environment Variables

Add to your `.env.local`:

```env
SIGNAL_REST_API_URL=http://127.0.0.1:8080
SIGNAL_ACCOUNT=+15551234567
# Optional shared secret. If set, send it with the webhook as:
#   X-Signal-Webhook-Secret: <secret>
#   or
#   Authorization: Bearer <secret>
SIGNAL_WEBHOOK_SECRET=your_optional_webhook_secret
```

### Step 5: Test

Message the Signal number from your linked device and run the same commands as
the other bots:

```
/start
/help
```

> **Note on attachments:** the current Signal integration routes text messages
> through the full FindIt flow. Attachments are acknowledged but not uploaded to
> Cloudinary yet; use text descriptions for the photo-less web flow or add
> attachment handling later.

---

## Shared Command Reference

```
/start          - Welcome message
/help           - Show the command menu
/report_lost    - Report a lost item
/report_found   - Report a found item
/search <term>  - Search the registry
/claim <itemId> - Claim an item
/support        - Contact support
/cancel         - Cancel the current flow
```

---

## Environment Variable Reference

| Variable               | Used by                   | Purpose                                     |
| ---------------------- | ------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL` | Bot webhooks              | Stable public URL of the app                |
| `TELEGRAM_BOT_TOKEN`   | Telegram bot              | Send replies & receive updates              |
| `WHATSAPP_VERIFY_TOKEN`| WhatsApp bot              | Twilio webhook verification                 |
| `SIGNAL_REST_API_URL`  | Signal bot                | signal-cli-rest-api base URL                |
| `SIGNAL_ACCOUNT`       | Signal bot                | Signal number used to send replies          |
| `SIGNAL_WEBHOOK_SECRET`| Signal bot                | Optional shared webhook secret              |
| `CLOUDINARY_*`         | All bots / web app        | Image uploads for reported items            |

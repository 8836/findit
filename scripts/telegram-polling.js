/**
 * Local Telegram polling helper.
 *
 * Telegram webhook mode requires a public HTTPS URL. For local development you
 * can instead run this script, which fetches updates from the Bot API and
 * forwards them to your local `/api/bots/telegram` route.
 *
 * Usage:
 *   node --env-file=.env.local scripts/telegram-polling.js
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const localWebhook = process.env.LOCAL_TELEGRAM_WEBHOOK || "http://localhost:3000/api/bots/telegram";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

const base = `https://api.telegram.org/bot${token}`;
let offset = 0;

console.log(`Telegram polling started. Forwarding to ${localWebhook}\n`);

async function poll() {
  try {
    const res = await fetch(`${base}/getUpdates?timeout=30&offset=${offset}`, {
      signal: AbortSignal.timeout(35_000),
    });
    const data = await res.json();

    if (!data.ok) {
      console.error("getUpdates failed:", data);
      return;
    }

    for (const update of data.result ?? []) {
      try {
        await fetch(localWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
        console.log(`Forwarded update ${update.update_id}`);
      } catch (error) {
        console.error(`Failed to forward update ${update.update_id}:`, error);
      }
      offset = update.update_id + 1;
    }
  } catch (error) {
    console.error("Polling error:", error);
  }
}

while (true) {
  await poll();
}

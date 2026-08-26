import { NextRequest, NextResponse } from "next/server";
import { BotService } from "@/lib/bot-service";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
}

async function getTelegramMediaUrl(photoFileId?: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!photoFileId || !token) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: photoFileId }),
    });
    const data = await res.json();
    const filePath = data?.result?.file_path as string | undefined;
    return filePath ? `https://api.telegram.org/file/bot${token}/${filePath}` : null;
  } catch (error) {
    console.error("Could not resolve Telegram media URL:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    const message = update.message;

    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = (message.text || message.caption || "").trim();

    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Use the largest photo available.
    const photo = Array.isArray(message.photo) ? message.photo.at(-1) : null;
    const mediaUrl = await getTelegramMediaUrl(photo?.file_id);

    const response = await BotService.handleIncomingMessage(
      chatId,
      "telegram",
      text,
      mediaUrl
    );

    const sendResult = await sendTelegramMessage(chatId, response);
    if (sendResult) return sendResult;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram bot error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Telegram bot endpoint is running",
    timestamp: new Date().toISOString(),
    baseUrl: getBaseUrl(),
  });
}

async function sendTelegramMessage(chatId: string | number, text: string) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!telegramToken) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ok: true,
        response: text,
        warning: "TELEGRAM_BOT_TOKEN is not configured; skipped Telegram send in development.",
      });
    }
    return NextResponse.json({ ok: false, error: "Bot token not configured" }, { status: 500 });
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!telegramResponse.ok) {
      const body = await telegramResponse.text();
      console.error("Telegram send failed:", body);
      return NextResponse.json(
        { ok: false, error: "Failed to send Telegram response" },
        { status: 502 }
      );
    }

    return null;
  } catch (error) {
    console.error("Telegram send failed (network error):", error);
    return NextResponse.json(
      { ok: false, error: "Could not reach the Telegram API. Please try again later." },
      { status: 502 }
    );
  }
}

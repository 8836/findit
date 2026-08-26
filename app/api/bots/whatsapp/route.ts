import { NextRequest, NextResponse } from "next/server";
import { BotService } from "@/lib/bot-service";

// WhatsApp webhook endpoint (Twilio).
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const from = formData.get("From") as string | null; // "whatsapp:+1234567890"
    const messageBody = formData.get("Body") as string | null;
    const mediaUrl = (formData.get("MediaUrl0") as string | null) || undefined;

    if (!from) {
      return twimlResponse("Missing sender information.");
    }

    const phoneNumber = from.replace("whatsapp:", "");
    const response = await BotService.handleIncomingMessage(
      phoneNumber,
      "whatsapp",
      messageBody || "",
      mediaUrl || null
    );

    return twimlResponse(response);
  } catch (error) {
    console.error("WhatsApp bot error:", error);
    return twimlResponse("FindIt had trouble handling that message. Please try again.");
  }
}

// Webhook verification for platforms that use the standard hub protocol.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (!params.has("hub.challenge")) {
    return NextResponse.json({
      status: "WhatsApp Twilio bot endpoint is running",
      webhook: "/api/bots/whatsapp",
      mode: "twilio-sandbox",
    });
  }

  try {
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "your-verify-token";

    if (token === verifyToken && challenge) {
      return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  } catch (error) {
    console.error("WhatsApp webhook verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function twimlResponse(message: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
    {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    }
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

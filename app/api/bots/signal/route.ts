import { NextRequest, NextResponse } from "next/server";
import { BotService } from "@/lib/bot-service";
import { parseSignalWebhook, sendSignalMessage } from "@/lib/signal-client";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.SIGNAL_WEBHOOK_SECRET;
  if (!secret) return true;

  const direct = request.headers.get("x-signal-webhook-secret");
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  return direct === secret || bearer === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const incoming = parseSignalWebhook(body);

    if (!incoming.source) {
      return NextResponse.json({ ok: true });
    }

    if (!incoming.text) {
      return NextResponse.json({ ok: true });
    }

    const response = await BotService.handleIncomingMessage(
      incoming.source,
      "signal",
      incoming.text
    );

    const sendResult = await sendSignalMessage(incoming.source, response, incoming.account);

    if (sendResult.warning) {
      // In development we mirror the reply in the payload so the endpoint can
      // be tested without a running signal-cli-rest-api instance.
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          ok: true,
          response,
          warning: sendResult.warning,
        });
      }
      console.warn("Signal send skipped:", sendResult.warning);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signal bot error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Signal bot endpoint is running",
    timestamp: new Date().toISOString(),
    baseUrl: getBaseUrl(),
    mode: "signal-cli-rest-api-webhook",
  });
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bots/signal/route";
import { BotService } from "@/lib/bot-service";
import { sendSignalMessage } from "@/lib/signal-client";
import { downloadSignalAttachment, pickImageAttachment } from "@/lib/signal-client";

vi.mock("@/lib/bot-service", () => ({
  BotService: {
    handleIncomingMessage: vi.fn(),
  },
}));

vi.mock("@/lib/signal-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/signal-client")>();
  return {
    ...actual,
    pickImageAttachment: vi.fn(),
    downloadSignalAttachment: vi.fn(),
    sendSignalMessage: vi.fn(),
  };
});

const mutableEnv = process.env as Record<string, string | undefined>;

function makeRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/bots/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const webhookBody = {
  envelope: {
    source: "+15551234567",
    dataMessage: { message: "/start" },
  },
  account: "+15550001111",
};

beforeEach(() => {
  delete mutableEnv.SIGNAL_REST_API_URL;
  delete mutableEnv.SIGNAL_ACCOUNT;
  delete mutableEnv.SIGNAL_WEBHOOK_SECRET;
  delete mutableEnv.NODE_ENV;

  vi.mocked(BotService.handleIncomingMessage).mockResolvedValue("Welcome to FindIt!");
  vi.mocked(sendSignalMessage).mockResolvedValue({ sent: true });
  vi.mocked(downloadSignalAttachment).mockResolvedValue({ dataUrl: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/bots/signal", () => {
  it("returns ok for an empty payload", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("requires the webhook secret when configured", async () => {
    process.env.SIGNAL_WEBHOOK_SECRET = "s3cret";
    const res = await POST(makeRequest(webhookBody));
    expect(res.status).toBe(403);
    expect(BotService.handleIncomingMessage).not.toHaveBeenCalled();
  });

  it("accepts a valid bearer secret", async () => {
    process.env.SIGNAL_WEBHOOK_SECRET = "s3cret";
    const res = await POST(
      makeRequest(webhookBody, { Authorization: "Bearer s3cret" })
    );
    expect(res.status).toBe(200);
  });

  it("processes a text command and replies to the source", async () => {
    const res = await POST(makeRequest(webhookBody));
    expect(res.status).toBe(200);

    expect(BotService.handleIncomingMessage).toHaveBeenCalledWith(
      "+15551234567",
      "signal",
      "/start",
      null
    );
    expect(sendSignalMessage).toHaveBeenCalledWith(
      "+15551234567",
      "Welcome to FindIt!",
      "+15550001111"
    );
  });

  it("downloads and passes an image attachment to the bot flow", async () => {
    vi.mocked(pickImageAttachment).mockReturnValue({
      id: "a-1",
      contentType: "image/jpeg",
      filename: "photo.jpg",
    });
    vi.mocked(downloadSignalAttachment).mockResolvedValue({
      dataUrl: "data:image/jpeg;base64,ZmF6ZQ==",
      mimeType: "image/jpeg",
      fileName: "photo.jpg",
    });

    const body = {
      envelope: {
        source: "+15551234567",
        dataMessage: {
          message: "/report_lost",
          attachments: [{ id: "a-1", contentType: "image/jpeg", filename: "photo.jpg" }],
        },
      },
      account: "+15550001111",
    };

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(downloadSignalAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a-1" }),
      "+15550001111"
    );
    expect(BotService.handleIncomingMessage).toHaveBeenCalledWith(
      "+15551234567",
      "signal",
      "/report_lost",
      "data:image/jpeg;base64,ZmF6ZQ=="
    );
  });

  it("mirrors the reply (and warning) in development when no Signal API is set", async () => {
    mutableEnv.NODE_ENV = "development";
    process.env.SIGNAL_REST_API_URL = "";
    vi.mocked(sendSignalMessage).mockResolvedValue({
      sent: false,
      warning: "SIGNAL_REST_API_URL is not configured; skipped Signal send in development.",
    });

    const res = await POST(makeRequest(webhookBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.response).toBe("Welcome to FindIt!");
    expect(json.warning).toContain("SIGNAL_REST_API_URL");
  });

  it("returns 500 when the bot pipeline throws", async () => {
    vi.mocked(BotService.handleIncomingMessage).mockRejectedValue(new Error("boom"));

    const res = await POST(makeRequest(webhookBody));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false, error: "Internal server error" });
  });
});

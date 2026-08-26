import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadSignalAttachment,
  normalizeSignalNumber,
  parseSignalWebhook,
  pickImageAttachment,
  sendSignalMessage,
} from "@/lib/signal-client";

const originalEnv = { ...process.env };
const mutableEnv = process.env as Record<string, string | undefined>;

beforeEach(() => {
  delete mutableEnv.SIGNAL_REST_API_URL;
  delete mutableEnv.SIGNAL_ACCOUNT;
  delete mutableEnv.NODE_ENV;
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("normalizeSignalNumber", () => {
  it("keeps digits and leading plus", () => {
    expect(normalizeSignalNumber("+1 (202) 555-0123")).toBe("+12025550123");
    expect(normalizeSignalNumber("+12025550123")).toBe("+12025550123");
  });

  it("strips all extraneous characters", () => {
    expect(normalizeSignalNumber("whatsapp:+15551234567")).toBe("+15551234567");
    expect(normalizeSignalNumber("")).toBe("");
  });
});

describe("parseSignalWebhook", () => {
  it("returns null source for empty payloads", () => {
    const message = parseSignalWebhook({});
    expect(message.source).toBeNull();
    expect(message.text).toBe("");
    expect(message.attachments).toEqual([]);
  });

  it("parses source, account, and message text", () => {
    const message = parseSignalWebhook({
      envelope: {
        source: "+15551234567",
        sourceNumber: "+15551234567",
        dataMessage: { message: "/help" },
      },
      account: "+15550001111",
    });

    expect(message.source).toBe("+15551234567");
    expect(message.account).toBe("+15550001111");
    expect(message.text).toBe("/help");
  });

  it("prefers sourceNumber over source and keeps raw non-number strings empty", () => {
    const message = parseSignalWebhook({
      envelope: {
        source: "abc-123",
        sourceNumber: "+15551234567",
        dataMessage: { message: "  /start  " },
      },
    });

    expect(message.source).toBe("+15551234567");
    expect(message.text).toBe("/start");
  });

  it("collects attachments and filters out empty entries", () => {
    const message = parseSignalWebhook({
      envelope: {
        source: "+15551234567",
        dataMessage: {
          message: "photo",
          attachments: [
            { id: "a-1", contentType: "image/jpeg", filename: "one.jpg", size: 100 },
            { filename: "unnamed.jpg" }, // no id but still a valid record
            undefined, // undefined entries are dropped
          ],
        },
      },
    });

    expect(message.attachments).toHaveLength(2);
    expect(message.attachments[0].id).toBe("a-1");
    expect(message.attachments[1].filename).toBe("unnamed.jpg");
  });
});

describe("pickImageAttachment", () => {
  it("returns the first image attachment", () => {
    const picked = pickImageAttachment([
      { id: "a-1", contentType: "application/pdf", filename: "doc.pdf" },
      { id: "a-2", contentType: "image/png", filename: "photo.png" },
    ]);

    expect(picked?.id).toBe("a-2");
  });

  it("accepts image files identified only by extension", () => {
    const picked = pickImageAttachment([
      { id: "a-3", contentType: "", filename: "cover.JPG" },
    ]);

    expect(picked?.id).toBe("a-3");
  });

  it("returns null when there are no images", () => {
    expect(pickImageAttachment([])).toBeNull();
    expect(
      pickImageAttachment([{ id: "a-1", contentType: "audio/mpeg", filename: "voice.mp3" }])
    ).toBeNull();
  });
});

describe("downloadSignalAttachment", () => {
  it("returns null dataUrl when the API is not configured", async () => {
    const result = await downloadSignalAttachment({ id: "a-1", filename: "x.jpg" });
    expect(result.dataUrl).toBeNull();
    expect(result.fileName).toBe("x.jpg");
  });

  it("returns null for missing id", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";
    const result = await downloadSignalAttachment({ filename: "x.jpg" });
    expect(result.dataUrl).toBeNull();
  });

  it("rejects malformed attachment ids before fetching", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadSignalAttachment({ id: "../../etc/passwd" });
    expect(result.dataUrl).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches a valid image attachment and returns a data URL", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";

    const blob = new Blob([Buffer.from("fake-image-bytes")], { type: "image/jpeg" });
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => blob.arrayBuffer(),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await downloadSignalAttachment(
      { id: "a-1", contentType: "image/jpeg", filename: "photo.jpg" },
      "+15550001111"
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v1/attachments/a-1",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Signal-Number": "+15550001111" }),
      })
    );
    expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("returns null for non-image responses", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";

    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "application/pdf" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await downloadSignalAttachment({ id: "a-1", filename: "x" });
    expect(result.dataUrl).toBeNull();
  });

  it("returns null when the API call fails", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await downloadSignalAttachment({ id: "a-1" });
    expect(result.dataUrl).toBeNull();
  });
});

describe("sendSignalMessage", () => {
  it("warns and does not send when the API is not configured in dev", async () => {
    mutableEnv.NODE_ENV = "development";
    const result = await sendSignalMessage("+15551234567", "hi");
    expect(result.sent).toBe(false);
    expect(result.warning).toContain("SIGNAL_REST_API_URL");
  });

  it("warns in production when the API is not configured", async () => {
    mutableEnv.NODE_ENV = "production";
    const result = await sendSignalMessage("+15551234567", "hi");
    expect(result.sent).toBe(false);
    expect(result.warning).toContain("SIGNAL_REST_API_URL");
  });

  it("warns when no recipient is supplied", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";
    const result = await sendSignalMessage("", "hi");
    expect(result.sent).toBe(false);
  });

  it("posts through the API with account, message, and recipient", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";
    process.env.SIGNAL_ACCOUNT = "+15550001111";

    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await sendSignalMessage("+15551234567", "Welcome back!");

    expect(result.sent).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v2/send",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "Welcome back!",
          number: "+15550001111",
          recipients: ["+15551234567"],
        }),
      })
    );
  });

  it("uses the account from the webhook when SIGNAL_ACCOUNT is absent", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";

    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await sendSignalMessage("+15551234567", "hello", "+15550009999");
    expect(result.sent).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v2/send",
      expect.objectContaining({
        body: expect.stringContaining('"number":"+15550009999"'),
      })
    );
  });

  it("reports a send failure", async () => {
    process.env.SIGNAL_REST_API_URL = "http://127.0.0.1:8080";
    process.env.SIGNAL_ACCOUNT = "+15550001111";

    const mockResponse = {
      ok: false,
      status: 500,
      text: () => Promise.resolve("boom"),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await sendSignalMessage("+15551234567", "hi");
    expect(result.sent).toBe(false);
    expect(result.warning).toContain("failed");
  });
});

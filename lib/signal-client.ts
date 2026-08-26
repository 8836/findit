// Signal client built for signal-cli-rest-api (bbernhard/signal-cli-rest-api).
//
// Signal does not offer a first-party "bot API" like Telegram. The common
// approach is to run `signal-cli-rest-api` next to the app. It exposes a REST
// API for sending/receiving messages and can forward incoming messages to our
// webhook.
//
// Incoming webhook body (sent by signal-cli-rest-api when configured):
// {
//   "envelope": {
//     "source": "+12025550123",
//     "sourceNumber": "+12025550123",
//     "sourceUuid": "...",
//     "timestamp": 123,
//     "dataMessage": {
//       "message": "hello",
//       "timestamp": 123,
//       "attachments": [
//         { "id": "attachment-abc", "contentType": "image/jpeg",
//           "filename": "photo.jpg", "size": 1234 }
//       ]
//     }
//   },
//   "account": "+12025550100"
// }

export interface SignalAttachment {
  id?: string;
  filename?: string;
  contentType?: string;
  size?: number;
}

export interface SignalWebhookMessage {
  source: string | null;
  account: string | null;
  text: string;
  attachments: SignalAttachment[];
}

interface SignalEnvelope {
  source?: string;
  sourceNumber?: string;
  dataMessage?: {
    message?: string;
    attachments?: SignalAttachment[];
  };
}

const IMAGE_MIME_REGEX = /^image\/(jpeg|png|webp|gif)$/i;

/**
 * Normalize a Signal phone number to the E.164-ish shape the REST API expects.
 */
export function normalizeSignalNumber(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

/**
 * Extract the essentials from a signal-cli-rest-api webhook payload.
 */
export function parseSignalWebhook(body: unknown): SignalWebhookMessage {
  const payload =
    body && typeof body === "object"
      ? (body as { envelope?: SignalEnvelope; account?: string })
      : {};

  const envelope = payload.envelope ?? {};
  const source = normalizeSignalNumber(envelope.sourceNumber || envelope.source || "");
  const account = normalizeSignalNumber(payload.account || "");
  const dataMessage = envelope.dataMessage ?? {};

  return {
    source: source || null,
    account: account || null,
    text: (dataMessage.message ?? "").trim(),
    attachments: Array.isArray(dataMessage.attachments)
      ? dataMessage.attachments
          .map((attachment) => attachment ?? {})
          .filter((attachment) => attachment.id || attachment.filename)
      : [],
  };
}

/**
 * Return the first image attachment that can be downloaded, preferring a
 * smaller image (mid-size) when multiple resolutions are provided.
 */
export function pickImageAttachment(attachments: SignalAttachment[]): SignalAttachment | null {
  const images = attachments.filter((attachment) => {
    const type = attachment.contentType || "";
    return IMAGE_MIME_REGEX.test(type) || /\.(jpe?g|png|webp|gif)$/i.test(attachment.filename ?? "");
  });

  if (images.length === 0) return null;

  const withId = images.filter((attachment) => attachment.id);
  if (withId.length > 0) return withId[0];

  return images[0];
}

interface DownloadResult {
  dataUrl: string | null;
  mimeType?: string;
  fileName?: string;
}

/**
 * Download a Signal attachment via `GET /v1/attachments/{id}` and return it as
 * a base64 data URL (which Cloudinary's unsigned upload accepts directly).
 */
export async function downloadSignalAttachment(
  attachment: SignalAttachment,
  account?: string | null
): Promise<DownloadResult> {
  const baseUrl = process.env.SIGNAL_REST_API_URL;
  if (!baseUrl) {
    return { dataUrl: null, fileName: attachment.filename };
  }

  const id = attachment.id;
  if (!id) {
    return { dataUrl: null, fileName: attachment.filename };
  }

  // Restrict to the expected attachment path to prevent SSRF / path traversal.
  if (!/^[\w-]+$/.test(id)) {
    console.warn("Rejected malformed Signal attachment id:", id);
    return { dataUrl: null, fileName: attachment.filename };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/attachments/${id}`, {
      method: "GET",
      headers: account ? { "X-Signal-Number": normalizeSignalNumber(account) } : {},
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Signal attachment download failed:", res.status, text);
      return { dataUrl: null, fileName: attachment.filename };
    }

    const mimeType = res.headers.get("content-type")?.split(";")[0] || attachment.contentType || "image/jpeg";
    if (!IMAGE_MIME_REGEX.test(mimeType)) {
      console.warn("Skipping non-image Signal attachment:", mimeType);
      return { dataUrl: null, mimeType, fileName: attachment.filename };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return { dataUrl, mimeType, fileName: attachment.filename };
  } catch (error) {
    console.error("Signal attachment download error:", error);
    return { dataUrl: null, fileName: attachment.filename };
  }
}

interface SendSignalResult {
  sent: boolean;
  warning?: string;
}

/**
 * Send a reply through signal-cli-rest-api.
 *
 * Requires SIGNAL_REST_API_URL (e.g. http://127.0.0.1:8080) and either
 * SIGNAL_ACCOUNT or an account value supplied by the webhook.
 */
export async function sendSignalMessage(
  recipient: string,
  message: string,
  account?: string | null
): Promise<SendSignalResult> {
  const baseUrl = process.env.SIGNAL_REST_API_URL;
  const configuredAccount = process.env.SIGNAL_ACCOUNT || account || "";

  if (!baseUrl) {
    if (process.env.NODE_ENV !== "production") {
      return {
        sent: false,
        warning: "SIGNAL_REST_API_URL is not configured; skipped Signal send in development.",
      };
    }
    return { sent: false, warning: "SIGNAL_REST_API_URL is not configured." };
  }

  if (!configuredAccount) {
    return {
      sent: false,
      warning: "No Signal account configured (SIGNAL_ACCOUNT or webhook account).",
    };
  }

  const normalizedRecipient = normalizeSignalNumber(recipient);
  if (!normalizedRecipient) {
    return { sent: false, warning: "Missing valid Signal recipient." };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v2/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signal-Number": normalizeSignalNumber(configuredAccount),
      },
      body: JSON.stringify({
        message,
        number: normalizeSignalNumber(configuredAccount),
        recipients: [normalizedRecipient],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Signal send failed:", res.status, text);
      return { sent: false, warning: "Signal send failed. Please try again later." };
    }

    return { sent: true };
  } catch (error) {
    console.error("Signal send failed (network error):", error);
    return { sent: false, warning: "Could not reach the Signal API. Please try again later." };
  }
}

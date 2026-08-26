// Signal client built for signal-cli-rest-api (bbernhard/signal-cli-rest-api).
//
// Signal does not offer a first-party "bot API" like Telegram. The common
// approach is to run `signal-cli-rest-api` next to the app. It exposes a REST
// API for sending messages and can forward incoming messages to our webhook.
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
//       "attachments": [...]
//     }
//   },
//   "account": "+12025550100"
// }

export interface SignalAttachment {
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
  const source = normalizeSignalNumber(
    envelope.sourceNumber || envelope.source || ""
  );
  const account = normalizeSignalNumber(payload.account || "");
  const dataMessage = envelope.dataMessage ?? {};

  return {
    source: source || null,
    account: account || null,
    text: (dataMessage.message ?? "").trim(),
    attachments: Array.isArray(dataMessage.attachments) ? dataMessage.attachments : [],
  };
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
      headers: { "Content-Type": "application/json" },
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

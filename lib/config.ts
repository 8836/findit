// Central, safe read-only access to FindIt's runtime configuration.
//
// Only exposes *public* identifiers (project IDs, base URLs, usernames).
// It never returns secret values (api keys, tokens, passwords, secrets) to the
// UI or logs. Those are checked as booleans only.

export const DEPLOYED_BASE_URL = "https://findit-amber.vercel.app";

export function getPublicBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || DEPLOYED_BASE_URL;
}

export function getBotUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME || "findit_bot";
}

export interface ConfigStatus {
  nodeEnv: string;
  publicBaseUrl: string;
  botUsername: string;
  firebase: {
    projectId: string | null;
    authDomain: string | null;
    storageBucket: string | null;
    measurementId: string | null;
    /** True when all required NEXT_PUBLIC_FIREBASE_* keys are present and not placeholder. */
    configured: boolean;
    /** True when the project id is present but one or more keys are still missing. */
    partial: boolean;
    missing: string[];
  };
  cloudinary: { configured: boolean; cloudName: string | null };
  telegram: { configured: boolean; username: string | null };
  twilio: { configured: boolean };
  signal: { configured: boolean; account: string | null };
  email: { configured: boolean };
  vercel: { deployedUrl: string | null };
}

const PLACEHOLDER_RE = /your_|your\.|your-|demo-|your-domain|123456789:|AA\.\.\.|xxx/i;

function isPlaceholder(value: string | undefined): boolean {
  return !value || PLACEHOLDER_RE.test(value);
}

function isNotConfigured(value: string | undefined): boolean {
  return isPlaceholder(value);
}

export function getConfigStatus(): ConfigStatus {
  const firebaseKeys = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ] as const;

  const missing = requiredKeys.filter((key) => isNotConfigured(firebaseKeys[key]));
  const configured = missing.length === 0;

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    publicBaseUrl: getPublicBaseUrl(),
    botUsername: getBotUsername(),
    firebase: {
      projectId: firebaseKeys.projectId || null,
      authDomain: firebaseKeys.authDomain || null,
      storageBucket: firebaseKeys.storageBucket || null,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || null,
      configured,
      partial:
        !configured && missing.length > 0 && missing.length < requiredKeys.length,
      missing,
    },
    cloudinary: {
      configured: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every(
        (key) => !isNotConfigured(process.env[key])
      ),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    },
    telegram: {
      configured: !isNotConfigured(process.env.TELEGRAM_BOT_TOKEN),
      username: process.env.TELEGRAM_BOT_USERNAME || null,
    },
    twilio: {
      configured: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"].every(
        (key) => !isNotConfigured(process.env[key])
      ),
    },
    signal: {
      configured: !isNotConfigured(process.env.SIGNAL_REST_API_URL) && !isNotConfigured(process.env.SIGNAL_ACCOUNT),
      account: process.env.SIGNAL_ACCOUNT || null,
    },
    email: {
      configured: !isNotConfigured(process.env.EMAIL_USER) && !isNotConfigured(process.env.EMAIL_PASS),
    },
    vercel: {
      deployedUrl: process.env.VERCEL_URL || null,
    },
  };
}

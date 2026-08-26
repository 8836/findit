import type { Timestamp } from "firebase/firestore";

/**
 * A shape compatible with both the Firestore timestamp class returned by the
 * web SDK (`Timestamp`) and plain timestamp objects ({ seconds, nanoseconds })
 * that appear when documents are serialized.
 */
export type ItemDate =
  | Date
  | Timestamp
  | { seconds: number; nanoseconds: number }
  | null
  | undefined;

export interface Item {
  id: string;
  uid?: string;
  name: string;
  description: string;
  contact: string;
  type?: "lost" | "found";
  imageUrl?: string;
  createdAt?: ItemDate;
  claimed?: boolean;
  claimedAt?: ItemDate;
  claimedBy?: string;
  source?: "web" | "bot";
  platform?: "whatsapp" | "telegram";
}

export function toDate(value: ItemDate): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === "function") {
    try {
      return maybeTimestamp.toDate();
    } catch {
      return null;
    }
  }

  const plain = value as { seconds?: number; nanoseconds?: number };
  if (typeof plain.seconds === "number") {
    return new Date(plain.seconds * 1000);
  }

  return null;
}

export function formatDate(value: ItemDate): string {
  const date = toDate(value);
  if (!date) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: ItemDate): string {
  const date = toDate(value);
  if (!date) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isToday(value: ItemDate): boolean {
  const date = toDate(value);
  if (!date) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isThisWeek(value: ItemDate): boolean {
  const date = toDate(value);
  if (!date) return false;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= weekAgo;
}

/** Normalizes item data coming from Firestore snapshots. */
export function normalizeItem(id: string, data: Record<string, unknown>): Item {
  return {
    id,
    name: (data.name as string) ?? "Untitled item",
    description: (data.description as string) ?? "",
    contact: (data.contact as string) ?? "",
    type: (data.type as "lost" | "found" | undefined) ?? "lost",
    imageUrl: data.imageUrl as string | undefined,
    createdAt: data.createdAt as ItemDate,
    claimed: Boolean(data.claimed),
    claimedAt: data.claimedAt as ItemDate,
    claimedBy: data.claimedBy as string | undefined,
    source: (data.source as "web" | "bot" | undefined) ?? "web",
    platform: data.platform as "whatsapp" | "telegram" | undefined,
  };
}

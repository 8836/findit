import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

admin.initializeApp();

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    if (!transporter) {
      console.warn("EMAIL_USER / EMAIL_PASS are not configured; email notifications are disabled.");
    }
    return null;
  }

  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const notifyClaim = onDocumentUpdated("items/{itemId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Only fire when the item flips from unclaimed to claimed.
  if (before.claimed || !after.claimed) return;

  const claimedAt = after.claimedAt
    ? after.claimedAt.toDate().toLocaleString()
    : "just now";
  const claimedBy = after.claimedBy ? String(after.claimedBy) : "a community member";

  const recipient = typeof after.contact === "string" ? after.contact : "";
  if (!recipient) {
    console.warn("No contact info for item:", event.params.itemId);
    return;
  }

  // Bot items may contact via a phone number or platform chat id. We can only
  // email valid email recipients from this function.
  if (!isEmail(recipient)) {
    console.log("Skipping email notification for non-email contact:", recipient);
    return;
  }

  const mail = getTransporter();
  if (!mail) return;

  try {
    await mail.sendMail({
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: "Your FindIt item has been claimed!",
      text: [
        `Hello,`,
        ``,
        `Your item "${after.name}" has been marked as claimed on ${claimedAt} by ${claimedBy}.`,
        `Please connect with the claimant to finalize the handover.`,
        ``,
        `— FindIt`,
      ].join("\n"),
    });
    console.log(`Email sent to: ${recipient}`);
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
});

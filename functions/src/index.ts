import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

admin.initializeApp();

// Configure email transport (using Gmail App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // set via Firebase config
    pass: process.env.EMAIL_PASS, // set via Firebase config
  },
});

export const notifyClaim = onDocumentUpdated("items/{itemId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Trigger only when claimed flips from false → true
  if (!before.claimed && after.claimed) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: after.contact, // reporter’s contact info
      subject: "Your item has been claimed!",
      text: `Hello, your item "${after.name}" has been marked as claimed. Please connect with the claimer to finalize.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent to:", after.contact);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }
});

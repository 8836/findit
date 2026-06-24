// lib/firebase.ts
import { FirebaseError, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ✅ Load your Firebase project config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => value === "" || value === undefined)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(
    `Missing Firebase config values in .env.local: ${missingKeys.join(", ")}. ` +
      "Make sure NEXT_PUBLIC_FIREBASE_* values are defined."
  );
}

const placeholderKeys = Object.entries(firebaseConfig).filter(([, value]) =>
  typeof value === "string" && /your_|your\.|your-/i.test(value)
);

if (placeholderKeys.length > 0) {
  throw new Error(
    "Firebase env values in .env.local appear to be placeholders. " +
      "Replace them with the actual values from your Firebase project settings."
  );
}

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firestore and Auth instances
export const db = getFirestore(app);
export const auth = getAuth(app);

export function getFirebaseAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/configuration-not-found") {
      return "Firebase config invalid. Check NEXT_PUBLIC_FIREBASE_* values in .env.local.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "An unexpected Firebase error occurred.";
}

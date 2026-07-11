// lib/firebase.ts
import { FirebaseError, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

// Load your Firebase project config from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

const requiredFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

const missingKeys = Object.entries(requiredFirebaseConfig)
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

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

let authPersistencePromise: Promise<void> | null = null;

export function ensureAuthPersistence() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  authPersistencePromise ??= setPersistence(auth, browserLocalPersistence).catch((error: unknown) => {
    console.warn("Could not set Firebase auth persistence. Continuing with the default persistence.", error);
  });
  return authPersistencePromise;
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/configuration-not-found":
        return "Firebase Authentication is not enabled or the app config is invalid. Check Firebase Console Authentication and NEXT_PUBLIC_FIREBASE_* values.";
      case "auth/invalid-api-key":
      case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        return "Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Email or password is incorrect.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is not enabled. Enable it in Firebase Console > Authentication > Sign-in method.";
      case "auth/unauthorized-domain":
        return "This app domain is not authorized in Firebase Authentication settings.";
      case "auth/email-already-in-use":
        return "An account already exists for this email. Try logging in instead.";
      case "auth/weak-password":
        return "Use a stronger password with at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/unauthorized-continue-uri":
      case "auth/invalid-continue-uri":
        return "Password reset URL is not allowed. Add this app domain in Firebase Authentication settings.";
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : "An unexpected Firebase error occurred.";
}

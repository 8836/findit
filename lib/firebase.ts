// Firebase (web SDK) initialization.
//
// The web SDK config is public; it points the browser at your Firebase project.
// If the required NEXT_PUBLIC_FIREBASE_* values are missing, this module falls
// back to a non-functional demo configuration so the UI can still render and
// you get a clear, actionable warning instead of a hard crash.
import { FirebaseError, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getConfigStatus } from "./config";

const demoConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
  measurementId: undefined,
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

const status = getConfigStatus();
const isFirebaseConfigured = status.firebase.configured;

if (!isFirebaseConfigured) {
  const detail =
    status.firebase.projectId && status.firebase.missing.length > 0
      ? `Firebase project "${status.firebase.projectId}" is needed, but these values are still missing: ${status.firebase.missing.join(", ")}.`
      : `Add the NEXT_PUBLIC_FIREBASE_* values from your Firebase project to \`.env.local\`.`;

  console.warn(
    "FindIt: Firebase configuration is incomplete. " +
      "Using a demo configuration so the UI can render. " +
      detail
  );
}

const resolvedConfig = isFirebaseConfigured ? firebaseConfig : demoConfig;

const app = getApps().length > 0 ? getApps()[0] : initializeApp(resolvedConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export { isFirebaseConfigured };

let authPersistencePromise: Promise<void> | null = null;

export function ensureAuthPersistence() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  authPersistencePromise ??= setPersistence(auth, browserLocalPersistence).catch((error: unknown) => {
    console.warn(
      "Could not set Firebase auth persistence. Continuing with the default persistence.",
      error
    );
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

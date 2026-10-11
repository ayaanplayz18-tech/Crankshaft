import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBpmxPcLxtoX3gojFVndjCHpsroRSooogE",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "crankshaft-2c927.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "crankshaft-2c927",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "crankshaft-2c927.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "313494089497",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:313494089497:web:515ea14b76c56c44d99f88",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-398VYD1H7D",
};

// Singleton initialization pattern for Next.js to prevent re-initialization on HMR
const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export const initAnalytics = async () => {
  if (typeof window !== "undefined") {
    try {
      const { getAnalytics, isSupported } = await import("firebase/analytics");
      if (await isSupported()) {
        return getAnalytics(app);
      }
    } catch {
      // Analytics unsupported or blocked (e.g. adblocker)
    }
  }
  return null;
};

export { app, auth, googleProvider };

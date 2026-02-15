
import {initializeApp, getApps, getApp, type FirebaseOptions} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isConfigValid = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY"
);

// Initialize Firebase
const app = isConfigValid ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null;
const auth = app ? getAuth(app) : null;

function getFirebaseAuth(): Auth | null {
    if (!isConfigValid) {
        console.warn("Firebase configuration is missing or invalid. Firebase features will be disabled.");
        return null;
    }
    return auth;
}

export { app, auth, isConfigValid, getFirebaseAuth };

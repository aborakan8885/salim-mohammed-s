import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if the API key is present to avoid crashing
const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';

if (!isConfigured) {
  console.warn('Firebase configuration is missing. Please ensure VITE_FIREBASE_API_KEY is set in the environment.');
}

const app = isConfigured 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) 
  : null;

export const db = app ? getFirestore(app) : null as any;
export const auth = app ? getAuth(app) : null as any;

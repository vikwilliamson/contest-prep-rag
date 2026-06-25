import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth as firebaseGetAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { getFirestore as firebaseGetFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getAuth(): Auth {
  return firebaseGetAuth(getFirebaseApp());
}

export function getFirestore(): Firestore {
  return firebaseGetFirestore(getFirebaseApp());
}

export function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(getAuth(), new GoogleAuthProvider());
}

export function signOut(): Promise<void> {
  return firebaseSignOut(getAuth());
}

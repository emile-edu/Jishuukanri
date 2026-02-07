"use client";

// lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBX2rHjvxhr4CTRNEUh8OW6RePz4XXjvpw",
  authDomain: "jishuukanri-dev.firebaseapp.com",
  projectId: "jishuukanri-dev",
  storageBucket: "jishuukanri-dev.firebasestorage.app",
  messagingSenderId: "415544554876",
  appId: "1:415544554876:web:306c3fbb5d82f6cf0060f9",
};

// ★二重初期化を絶対に避ける
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

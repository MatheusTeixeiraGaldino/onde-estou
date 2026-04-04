// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZ_wtaeMWAM5yf0Q-ijSsrkiRaKblD5yA",
  authDomain: "onde-estou-7e48d.firebaseapp.com",
  projectId: "onde-estou-7e48d",
  storageBucket: "onde-estou-7e48d.firebasestorage.app",
  messagingSenderId: "939051039814",
  appId: "1:939051039814:web:12c075ee312b63eccfde47"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

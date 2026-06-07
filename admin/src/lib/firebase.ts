import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyD1GeW183eAmT9HEtGbpHYizDcfWbSkfiI",
  authDomain: "zrobee-roadmap.firebaseapp.com",
  projectId: "zrobee-roadmap",
  storageBucket: "zrobee-roadmap.firebasestorage.app",
  messagingSenderId: "783082211390",
  appId: "1:783082211390:web:713d09aec66ae8ca25696f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

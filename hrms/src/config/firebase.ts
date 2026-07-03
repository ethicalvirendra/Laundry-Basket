import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC43rwTuY2WAauOFputhI7CoPo7ajRaHFw",
  authDomain: "hrms-9985.firebaseapp.com",
  projectId: "hrms-9985",
  storageBucket: "hrms-9985.firebasestorage.app",
  messagingSenderId: "1023346438652",
  appId: "1:1023346438652:web:c3fd76fcaecc530ffbc279",
  measurementId: "G-04D8N9MB4P"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export
export const db = getFirestore(app);

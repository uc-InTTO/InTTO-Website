// --- Make sure your firebaseConfig and initialization is here ---
// const firebaseConfig = { ... };
// const app = firebase.initializeApp(firebaseConfig); 
// const db = firebase.firestore(); 
// -----------------------------------------------------------------

// If you are using the modern modular SDK (recommended):
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Initialize Firebase (replace with your config)
const firebaseConfig = { 
    apiKey: "AIzaSyAXNIo4h3Uv7Z8IGdm01zQ8K4WY4G8VLzE",
    authDomain: "uc-intto.firebaseapp.com",
    projectId: "uc-intto",
    storageBucket: "uc-intto.firebasestorage.app",
    messagingSenderId: "156771180433",
    appId: "1:156771180433:web:4f9d57eb6b0e7882ef0430",
    measurementId: "G-ETY9E0F1K6" 
  }; 
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Get the Firestore instance

saveInfo.js

import { db } from "./api.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export async function saveApplication(data) {
    try {
        const collectionRef = collection(db, "incubation_applications");
        const docRef = await addDoc(collectionRef, {
            ...data,
            submittedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e) {
        throw e;
    }
}
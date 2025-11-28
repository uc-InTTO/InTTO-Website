import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

// Get the existing Firebase app instance initialized in authuC.js
let db;
try {
    const app = getApp(); // Get the default app
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase app not initialized. Make sure authuC.js loads first:", error);
    throw error;
}

// Debounce function to prevent rapid writes
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

export async function saveApplication(data) {
    try {
        const collectionRef = collection(db, "Registered Accounts");
        const docRef = await addDoc(collectionRef, {
            ...data,
            submittedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e) {
        console.error("❌ Error adding document to Firestore:", e);
        console.error("Error details:", {
            code: e.code,
            message: e.message,
            stack: e.stack
        });
        throw e;
    }
}

// Debounced version for rapid submissions
export const debouncedSaveApplication = debounce(saveApplication, 1000);
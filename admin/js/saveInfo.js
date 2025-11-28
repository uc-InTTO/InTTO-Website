import { db } from "./api.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Debounce function to prevent rapid writes
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

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

// Debounced version for rapid submissions
export const debouncedSaveApplication = debounce(saveApplication, 1000);
    
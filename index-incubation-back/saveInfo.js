import { db } from "../index-incubation-back/api.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_3pa2mna';
const EMAILJS_TEMPLATE_ID = 'template_8cby16k';
const EMAILJS_PUBLIC_KEY = 'jtgfZ8_TmLu3KT1Kx'; // Replace with your EmailJS public key

export async function saveApplication(data) {
    try {
        // 1. Save to Firestore
        const collectionRef = collection(db, "incubation_applications");
        const docRef = await addDoc(collectionRef, {
            ...data,
            submittedAt: serverTimestamp()
        });
        
        // 2. Send email notification via EmailJS
        await sendEmailNotification(data, docRef.id);
        
        return docRef.id;
    } catch (e) {
        throw e;
    }
}

/**
 * Send email notification with application details
 */
async function sendEmailNotification(data, applicationId) {
    // Check if EmailJS is loaded
    if (typeof emailjs === 'undefined') {
        return;
    }
    
    // Initialize EmailJS (only needed once, but safe to call multiple times)
    emailjs.init(EMAILJS_PUBLIC_KEY);
    
    // Prepare template parameters
    const templateParams = {
        application_id: applicationId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        student_id: data.studentId,
        year_level: data.yearLevel,
        submitted_at: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }),
        // Additional fields if your form has more data
        to_name: 'UC InTTO Admin', // Can be customized
        reply_to: data.email
    };
    
    try {
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
        );
    } catch (error) {
        // Don't throw error - we still want the application to be saved even if email fails
    }
}
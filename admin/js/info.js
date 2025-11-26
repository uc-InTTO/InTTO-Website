// ...existing code...
import { saveApplication } from "./saveInfo.js";
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('personal-info-form');
    if (!form) {
        return;
    }

    if (typeof saveApplication !== 'function') {
        return;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            studentId: document.getElementById('studentId').value,
            yearLevel: document.getElementById('yearLevel').value,
            submittedAt: new Date().toISOString() // use client timestamp or replace with serverTimestamp() if you import it
        };

        // Ensure saveApplication is available (script load order matters)
        saveApplication(formData);
    });
});
// ...existing code...
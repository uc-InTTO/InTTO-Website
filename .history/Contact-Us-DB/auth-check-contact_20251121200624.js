import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Initialize Firebase (same config as your other files)
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
const auth = getAuth(app);

export { auth };

/**
 * Check authentication and show/hide contact form
 */
export function initContactFormAuth() {
    const contactForm = document.getElementById('contact-form');
    const contactFormContainer = contactForm?.parentElement;
    
    if (!contactFormContainer) {
        console.error('Contact form container not found');
        return;
    }

    // Create login prompt (hidden by default)
    const loginPrompt = document.createElement('div');
    loginPrompt.id = 'contact-login-prompt';
    loginPrompt.className = 'contact-login-prompt';
    loginPrompt.style.display = 'none';
    loginPrompt.innerHTML = `
        <div class="login-prompt-content">
            <div class="lock-icon">
                <i class="fas fa-lock"></i>
            </div>
            <h3>Login Required</h3>
            <p>You need to be logged in to send us a message.</p>
            <p class="login-subtitle">Please login through uColab to access the contact form.</p>
            <div class="login-buttons">
                <a href="./ucolab/index.html" class="login-btn primary">
                    <i class="fas fa-sign-in-alt"></i> Login / Sign Up
                </a>
            </div>
        </div>
    `;

    // Insert login prompt before the form
    contactFormContainer.insertBefore(loginPrompt, contactForm);

    // Create loading state
    const loadingState = document.createElement('div');
    loadingState.className = 'auth-loading-state';
    loadingState.style.display = 'none';
    loadingState.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Checking authentication...</p>
        </div>
    `;
    contactFormContainer.insertBefore(loadingState, contactForm);

    // Create user info banner (shown when logged in)
    const userInfoBanner = document.createElement('div');
    userInfoBanner.id = 'user-info-banner';
    userInfoBanner.className = 'user-info-banner';
    userInfoBanner.style.display = 'none';
    contactFormContainer.insertBefore(userInfoBanner, contactForm);

    // Show loading initially
    loadingState.style.display = 'flex';
    contactForm.style.display = 'none';

    // Listen to authentication state
    onAuthStateChanged(auth, (user) => {
        // Hide loading
        loadingState.style.display = 'none';

        if (user) {
            // User is logged in - show form
            console.log('✅ User authenticated:', user.email);
            loginPrompt.style.display = 'none';
            contactForm.style.display = 'block';
            
            // Show user info banner
            userInfoBanner.style.display = 'block';
            userInfoBanner.innerHTML = `
                <div class="user-banner-content">
                    <div class="user-avatar">
                        ${user.photoURL ? 
                            `<img src="${user.photoURL}" alt="${user.displayName || 'User'}">` : 
                            `<i class="fas fa-user-circle"></i>`
                        }
                    </div>
                    <div class="user-info">
                        <span class="user-greeting">Welcome back, <strong>${user.displayName || user.email}</strong>!</span>
                        <span class="user-status">✓ Authenticated</span>
                    </div>
                    <a href="./ucolab/index.html" class="user-dashboard-link">
                        <i class="fas fa-th-large"></i> My Dashboard
                    </a>
                </div>
            `;

            // Pre-fill form with user info
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            
            if (nameInput && !nameInput.value) {
                nameInput.value = user.displayName || '';
            }
            if (emailInput && !emailInput.value) {
                emailInput.value = user.email || '';
                emailInput.readOnly = true; // Prevent changing email
            }

        } else {
            // User is NOT logged in - show login prompt
            console.log('❌ User not authenticated');
            loginPrompt.style.display = 'block';
            contactForm.style.display = 'none';
            userInfoBanner.style.display = 'none';
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactFormAuth);
} else {
    initContactFormAuth();
}

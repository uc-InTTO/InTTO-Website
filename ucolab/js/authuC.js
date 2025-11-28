import { saveApplication, debouncedSaveApplication } from "./saveInfouC.js";
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Initialize Firebase
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
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- 1. INJECT CUSTOM POPUP (MATCHING YOUR IMAGE) ---
const adminModalHTML = `
<div id="admin-redirect-modal" style="
    display: none;
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(245, 245, 245, 0.8); /* Light background like the image context */
    backdrop-filter: blur(2px);
    z-index: 99999;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    opacity: 0;
    transition: opacity 0.3s ease;
">
    <div class="admin-modal-card">
        <div class="success-icon-floating">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>

        <h2 class="modal-title">Login Success!</h2>
        <p class="modal-subtitle">
            Successfully logged in as Admin.<br>
            Redirecting to dashboard...
        </p>
        
        <div class="spinner-border"></div>
    </div>

    <style>
        .admin-modal-card {
            background: white;
            padding: 60px 40px 40px; /* Top padding makes room for the icon */
            border-radius: 6px; /* Slight radius like the image */
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); /* Subtle shadow */
            max-width: 90%;
            width: 400px;
            position: relative;
            overflow: visible; /* CRITICAL: Allows icon to stick out */
            transform: scale(0.95);
            transition: transform 0.3s ease;
            border: 1px solid #e0e0e0;
        }

        /* The Green Circle Icon */
        .success-icon-floating {
            width: 80px;
            height: 80px;
            background-color: #4CAF50; /* The specific green from your image */
            border-radius: 50%;
            position: absolute;
            top: -40px; /* Pulls it up half its height */
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .success-icon-floating svg {
            width: 40px;
            height: 40px;
        }

        /* Typography matching the image */
        .modal-title {
            color: #333;
            font-size: 28px;
            font-weight: 400; /* Lighter weight like the image */
            margin: 10px 0 15px 0;
            letter-spacing: -0.5px;
        }

        .modal-subtitle {
            color: #666;
            font-size: 16px;
            line-height: 1.5;
            margin: 0 0 20px 0;
        }

        /* Simple Spinner */
        .spinner-border {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(0,0,0,0.1);
            border-radius: 50%;
            border-top-color: #4CAF50;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Active State */
        #admin-redirect-modal.visible { opacity: 1; }
        #admin-redirect-modal.visible .admin-modal-card { transform: scale(1); }
    </style>
</div>
`;

// Inject popup into body
document.body.insertAdjacentHTML('beforeend', adminModalHTML);

// Cache for user data to reduce Firebase reads
const USER_CACHE_KEY = 'ucolab_user_data';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

function getCachedUserData(uid) {
    try {
        const cached = localStorage.getItem(`${USER_CACHE_KEY}_${uid}`);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                return data;
            }
        }
    } catch (e) {
        console.warn('Error reading user cache:', e);
    }
    return null;
}

function setCachedUserData(uid, data) {
    try {
        localStorage.setItem(`${USER_CACHE_KEY}_${uid}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('Error setting user cache:', e);
    }
}

/**
 * Redirects user based on admin status
 */
function redirectUser(isAdmin) {
    
    if (isAdmin === true) {
        
        // 1. Hide the login form
        const authModal = document.getElementById('auth-modal-overlay');
        if (authModal) authModal.classList.add('modal-hidden');

        // 2. Show the Custom "Login Success" Popup
        const adminModal = document.getElementById('admin-redirect-modal');
        if (adminModal) {
            adminModal.style.display = 'flex';
            setTimeout(() => {
                adminModal.classList.add('visible');
            }, 10);
        }

        // 3. Redirect after delay
        setTimeout(() => {
            window.location.href = '../admin/dashboard.html';
        }, 2500);

    } else {
        window.location.href = 'index.html';
    }
}

// --- FORM DATA HELPER ---
function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        if (key !== 'password' && key !== 'password2' && key !== 'confirmPassword') {
            data[key] = value;
        }
    }
    return data;
}

// --- Sign In Form Handler ---
const signInForm = document.getElementById('signin-form');
const googleSignInBtn = document.getElementById('google-signin-btn');

if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email-input')?.value || document.getElementById('email')?.value;
        const password = document.getElementById('signin-password-input')?.value || document.getElementById('password')?.value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const userDocRef = doc(db, 'Registered Accounts', user.uid);
            let userData = getCachedUserData(user.uid);
            let userDoc;
            if (!userData) {
                userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    userData = userDoc.data();
                    setCachedUserData(user.uid, userData);
                }
            }
            
            if (!userData) {
                alert('User profile not found. Please complete registration.');
                window.location.href = 'signupform.html';
            } else {
                await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
                const isAdmin = userData.isAdmin || false;
                redirectUser(isAdmin);
            }
        } catch (error) {
            let msg = 'Sign in failed.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-login-credentials') msg = 'Incorrect email or password.';
            else if (error.code === 'auth/wrong-password') msg = 'Incorrect password.';
            alert(msg);
        }
    });
}

// --- Google Sign In Handler ---
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const isNewUser = result._tokenResponse?.isNewUser || false;
            
            const userDocRef = doc(db, 'Registered Accounts', user.uid);
            let userData = getCachedUserData(user.uid);
            let userDoc;
            if (!userData && !isNewUser) {
                userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    userData = userDoc.data();
                    setCachedUserData(user.uid, userData);
                }
            }
            
            if (!userData || isNewUser) {
                const userDataNew = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'N/A',
                    firstName: user.displayName?.split(' ')[0] || 'N/A',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || 'N/A',
                    affiliation: 'N/A',
                    loginType: 'Google',
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    photoURL: user.photoURL || null,
                    isAdmin: false
                };
                await debouncedSaveApplication(userDataNew);
                setCachedUserData(user.uid, userDataNew);
                alert('Welcome! Please complete your profile.');
                window.location.href = 'index.html';
            } else {
                await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
                const isAdmin = userData.isAdmin || false;
                redirectUser(isAdmin);
            }
        } catch (error) {
            alert('Google sign in failed: ' + error.message);
        }
    });
}

// --- Sign Up Form Handler ---
const signUpForm = document.getElementById('signup-form');
if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('signup-email-input')?.value;
        const password = document.getElementById('signup-password-input')?.value;
        const firstName = document.getElementById('signup-first-name-input')?.value || '';
        const lastName = document.getElementById('signup-last-name-input')?.value || '';
        const affiliation = document.getElementById('signup-affiliation-input')?.value || '';
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            if (firstName && lastName) {
                await updateProfile(user, { displayName: `${firstName} ${lastName}` });
            }
            
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || `${firstName} ${lastName}`,
                firstName: firstName || 'N/A',
                lastName: lastName || 'N/A',
                affiliation: affiliation || 'N/A',
                loginType: 'Email/Password',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isAdmin: false
            };
            
            await debouncedSaveApplication(userData);
            alert('Registration successful! Welcome to UCoLab.');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    });
}
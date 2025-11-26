import { db } from "../Contact-Us-DB/apiC.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/**
 * Generate a browser fingerprint to track unique users
 */
export function generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: canvas.toDataURL().slice(-50), // Last 50 chars of canvas fingerprint
        plugins: Array.from(navigator.plugins || []).map(p => p.name).join(','),
        webgl: getWebGLFingerprint()
    };
    
    // Create a hash from the fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    return hashCode(fingerprintString).toString();
}

function getWebGLFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Check rate limits in Firestore
 */
export async function checkRateLimit(email, fingerprint) {
    try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Check by email (last 24 hours)
        const emailQuery = query(
            collection(db, "Contact-us Messages"),
            where("email", "==", email),
            where("submittedAt", ">=", oneDayAgo),
            orderBy("submittedAt", "desc")
        );
        
        const emailSnapshot = await getDocs(emailQuery);
        const emailSubmissions = emailSnapshot.docs.map(doc => doc.data());
        
        // Check by fingerprint (last 24 hours)
        const fingerprintQuery = query(
            collection(db, "Contact-us Messages"),
            where("fingerprint", "==", fingerprint),
            where("submittedAt", ">=", oneDayAgo),
            orderBy("submittedAt", "desc")
        );
        
        const fingerprintSnapshot = await getDocs(fingerprintQuery);
        const fingerprintSubmissions = fingerprintSnapshot.docs.map(doc => doc.data());
        
        // Combine both checks - use the stricter limit
        const allSubmissions = [...emailSubmissions, ...fingerprintSubmissions];
        const uniqueSubmissions = Array.from(
            new Map(allSubmissions.map(s => [s.submittedAt?.seconds || 0, s])).values()
        );
        
        // Check daily limit (2 per day)
        if (uniqueSubmissions.length >= 2) {
            return {
                allowed: false,
                reason: 'daily_limit',
                message: 'You have reached the maximum of 2 submissions per day. Please try again tomorrow.',
                submissions: uniqueSubmissions.length
            };
        }
        
        // Check cooldown (1 hour)
        if (uniqueSubmissions.length > 0) {
            const lastSubmission = uniqueSubmissions[0];
            const lastSubmitTime = lastSubmission.submittedAt?.toDate ? 
                lastSubmission.submittedAt.toDate() : 
                new Date(lastSubmission.submittedAt);
            
            const timeSinceLastSubmit = now - lastSubmitTime;
            const oneHourMs = 60 * 60 * 1000;
            
            if (timeSinceLastSubmit < oneHourMs) {
                const remainingMs = oneHourMs - timeSinceLastSubmit;
                const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
                const remainingHours = Math.floor(remainingMinutes / 60);
                const remainingMins = remainingMinutes % 60;
                
                let timeMessage = '';
                if (remainingHours > 0) {
                    timeMessage = `${remainingHours} hour${remainingHours > 1 ? 's' : ''} and ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
                } else {
                    timeMessage = `${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
                }
                
                return {
                    allowed: false,
                    reason: 'cooldown',
                    message: `Please wait ${timeMessage} before submitting another message.`,
                    remainingTime: timeMessage
                };
            }
        }
        
        return {
            allowed: true,
            remainingSubmissions: 2 - uniqueSubmissions.length - 1
        };
        
    } catch (error) {
        // If rate limit check fails, allow submission but log the error
        return { allowed: true, remainingSubmissions: null };
    }
}

/**
 * Detect spam patterns
 */
export function detectSpam(data) {
    const { name, email, subject, message } = data;
    
    // Check for repeated characters
    const hasRepeatedChars = /(.)\1{10,}/.test(message || '');
    if (hasRepeatedChars) {
        return { isSpam: true, reason: 'Repeated characters detected' };
    }
    
    // Check for excessive URLs
    const urlCount = (message || '').match(/https?:\/\//gi)?.length || 0;
    if (urlCount > 3) {
        return { isSpam: true, reason: 'Too many URLs' };
    }
    
    // Check for common spam words
    const spamWords = ['viagra', 'casino', 'lottery', 'prize', 'click here', 'buy now', 'limited time', 'act now'];
    const lowerMessage = (message || '').toLowerCase();
    const hasSpamWords = spamWords.some(word => lowerMessage.includes(word));
    if (hasSpamWords) {
        return { isSpam: true, reason: 'Spam keywords detected' };
    }
    
    // Check if message is too short
    if ((message || '').trim().length < 10) {
        return { isSpam: true, reason: 'Message too short' };
    }
    
    // Check if name is suspicious
    if ((name || '').length < 2) {
        return { isSpam: true, reason: 'Invalid name' };
    }
    
    // Check for valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email || '')) {
        return { isSpam: true, reason: 'Invalid email format' };
    }
    
    // Check for excessive caps
    const capsRatio = (message || '').replace(/[^A-Z]/g, '').length / (message || '').length;
    if (capsRatio > 0.5 && (message || '').length > 20) {
        return { isSpam: true, reason: 'Excessive capital letters' };
    }
    
    return { isSpam: false };
}

export async function saveApplication(data) {
    try {
        // Verify user authentication data is present
        if (!data.userId || !data.userEmail) {
            throw new Error('Authentication required. Please login or sign up first.');
        }
        
        // Generate fingerprint
        const fingerprint = generateFingerprint();
        
        // Check rate limits using authenticated user's email
        const rateLimitCheck = await checkRateLimit(data.userEmail, fingerprint);
        if (!rateLimitCheck.allowed) {
            throw new Error(rateLimitCheck.message);
        }
        
        // Detect spam
        const spamCheck = detectSpam(data);
        if (spamCheck.isSpam) {
            throw new Error(`Submission rejected: ${spamCheck.reason}`);
        }
        
        // Save to Firestore with user authentication info
        const collectionRef = collection(db, "Contact-us Messages");
        const docRef = await addDoc(collectionRef, {
            ...data,
            fingerprint: fingerprint,
            submittedAt: serverTimestamp(),
            userAgent: navigator.userAgent,
            authenticatedUserId: data.userId,
            authenticatedUserEmail: data.userEmail,
            isSpam: false,
            verified: true // Mark as verified since user is authenticated
        });
        
        return { 
            id: docRef.id, 
            remainingSubmissions: rateLimitCheck.remainingSubmissions 
        };
    } catch (e) {
        throw e;
    }
}
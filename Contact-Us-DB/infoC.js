import { saveApplication } from "../Contact-Us-DB/saveInfoC.js"; 
import { auth } from "../Contact-Us-DB/auth-check-contact.js";

// reCAPTCHA Configuration
const RECAPTCHA_SITE_KEY = '6LcfuRMsAAAAAGP--lIdDS3_olzVmXNiEJ6Wh3Fw'; // Replace with your actual site key
const RECAPTCHA_MIN_SCORE = 0.5; // Minimum score to accept (0.0 = bot, 1.0 = human)

document.addEventListener('DOMContentLoaded', () => {
    // EmailJS is already initialized in the HTML file, no need to init again
    
    const contactForm = document.getElementById('contact-form');
    const submitButton = document.querySelector('.contact-btn');
    
    if (!contactForm || !submitButton) {
        return;
    }

    // Add honeypot field (hidden from real users, but bots will fill it)
    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'website'; // Common field bots fill
    honeypot.style.cssText = 'position: absolute; left: -9999px; opacity: 0; pointer-events: none;';
    honeypot.tabIndex = -1;
    honeypot.autocomplete = 'off';
    contactForm.appendChild(honeypot);

    /**
     * Execute reCAPTCHA and get token
     */
    const executeRecaptcha = async () => {
        try {
            if (typeof grecaptcha === 'undefined') {
                return { success: true, score: null, skipVerification: true };
            }

            const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'contact_form' });
            
            // In a production environment, you should verify this token on your backend
            // For now, we'll just return the token (client-side only check)
            return { success: true, token: token, score: null };
            
        } catch (error) {
            // If reCAPTCHA fails, allow submission but log the error
            return { success: true, error: error.message };
        }
    };

    /**
     * Show error modal
     */
    const showErrorModal = (message, title = 'Error') => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 450px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        modalContent.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h2 style="margin: 0 0 10px 0; color: #d9534f;">${title}</h2>
            <p style="color: #666; margin-bottom: 20px; line-height: 1.5;">${message}</p>
            <button style="background: #d9534f; color: white; border: none; padding: 10px 30px; border-radius: 5px; cursor: pointer; font-size: 16px;">OK</button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        modalContent.querySelector('button').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    };

    const showSuccessPage = (remainingSubmissions) => {
        const btn = document.querySelector('.contact-btn');
        if (btn) {
            btn.innerHTML = 'Send Message <span class="arrow-contact">➜</span>';
            btn.disabled = false;
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        
        let submissionInfo = '';
        if (remainingSubmissions !== null && remainingSubmissions !== undefined) {
            if (remainingSubmissions === 0) {
                submissionInfo = '<p style="color: #f0ad4e; font-size: 14px; margin-top: 10px;">⚠️ You have used all your submissions for today.</p>';
            } else {
                submissionInfo = `<p style="color: #5cb85c; font-size: 14px; margin-top: 10px;">✅ You have ${remainingSubmissions} submission${remainingSubmissions !== 1 ? 's' : ''} remaining today.</p>`;
            }
        }
        
        modalContent.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
            <h2 style="margin: 0 0 10px 0; color: #333;">Message Sent Successfully!</h2>
            <p style="color: #666; margin-bottom: 10px;">Thank you for contacting us. We will respond soon.</p>
            ${submissionInfo}
            <button style="background: #166c41; color: white; border: none; padding: 10px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 10px;">OK</button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        modalContent.querySelector('button').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        contactForm.reset();
    };

    const collectFormData = (form) => {
        const data = {};
        const elements = form.querySelectorAll('input, select, textarea');
        
        elements.forEach(element => {
            if (element.id) { // Only collect elements with IDs
                data[element.id] = element.value;
            }
        });
        return data; 
    };

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Check if user is authenticated
        const currentUser = auth.currentUser;
        if (!currentUser) {
            showErrorModal(
                'You must be logged in to submit the contact form. Please log in through uColab first.',
                'Authentication Required'
            );
            return;
        }
        
        // Check honeypot field (if filled, it's a bot)
        if (honeypot.value) {
            // Pretend success to bot, but don't actually submit
            setTimeout(() => {
                showSuccessPage(null);
            }, 1000);
            return;
        }
        
        if (!contactForm.checkValidity()) {
            return; 
        }

        const formData = collectFormData(contactForm);
        
        // Add authenticated user data
        formData.userId = currentUser.uid;
        formData.userEmail = currentUser.email;
        if (currentUser.displayName) {
            formData.userName = currentUser.displayName;
        }
        
        // Basic client-side validation
        if (!formData.email || !formData.name || !formData.message) {
            showErrorModal('Please fill in all required fields.', 'Validation Error');
            return;
        }

        if (formData.message.trim().length < 10) {
            showErrorModal('Please provide a more detailed message (at least 10 characters).', 'Message Too Short');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Verifying...';
        
        try {
            // Execute reCAPTCHA verification
            const recaptchaResult = await executeRecaptcha();
            
            if (!recaptchaResult.success && !recaptchaResult.skipVerification) {
                showErrorModal('Security verification failed. Please try again.', 'Verification Failed');
                return;
            }

            // Add reCAPTCHA token to form data
            if (recaptchaResult.token) {
                formData.recaptchaToken = recaptchaResult.token;
            }

            submitButton.textContent = 'Sending...';
            
            // First, try to save to database with all security checks
            const dbResult = await saveApplication(formData);
            
            // If database save succeeded (passed all security checks), send email
            const serviceID = "service_3pa2mna";     
            const templateID = "template_8cby16k";
            
            await emailjs.send(serviceID, templateID, formData);
            
            // Both succeeded
            showSuccessPage(dbResult.remainingSubmissions);
            
        } catch (error) {
            // Get error message safely
            const errorMessage = error?.message || error?.text || String(error) || 'Unknown error';
            
            // Check if it's a rate limit or spam detection error
            if (errorMessage.includes('wait') || 
                errorMessage.includes('maximum') || 
                errorMessage.includes('rejected') ||
                errorMessage.includes('Gmail_API') ||
                errorMessage.includes('Invalid grant')) {
                showErrorModal(
                    errorMessage.includes('Gmail_API') || errorMessage.includes('Invalid grant') 
                        ? '⚠️ Email service configuration error. Please contact the administrator.\n\nYour message was saved but email notification failed.'
                        : errorMessage,
                    'Submission Blocked'
                );
            } else {
                showErrorModal('Failed to send message. Please try again later.\n\n' + errorMessage, 'Submission Failed');
            }
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Send Message <span class="arrow-contact">➜</span>';
        }
    });
});
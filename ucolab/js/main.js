document.addEventListener('DOMContentLoaded', function() {
    
    // Get Firebase instances from global scope (initialized in index.html)
    const auth = window.auth || firebase.auth();
    const db = window.db || firebase.firestore();
    
    // --- REMOVED DEFAULT PROJECTS (IDs 1-15) ---
    const defaultProjects = []; 

    // --- 2. GLOBAL VARIABLES ---
    let allProjectsData = [];

    // --- 3. DOM ELEMENT REFERENCES (COMBINED) ---
    
    // --- Project Grid / Filter Elements ---
    const projectGrid = document.getElementById('project-list');
    const projectsCountHeader = document.getElementById('projects-count');
    const searchInput = document.getElementById('search-input');
    
    // === THIS IS THE UPDATED LINE ===
    const industryFilter = document.getElementById('filter-startup-category'); // <-- ID CHANGED
    // === END OF UPDATE ===
    
    const collegeFilter = document.getElementById('filter-college');
    const trlFilter = document.getElementById('filter-trl');
    const typeFilter = document.getElementById('filter-type');
    const sortFilter = document.getElementById('filter-sort');
    const allDropdowns = document.querySelectorAll('.custom-dropdown');
    
    // --- Auth Modal Elements ---
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    const signinPanel = document.getElementById('signin-panel');
    const signupPanel = document.getElementById('signup-panel');
    const openSigninBtn = document.getElementById('open-signin-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const showSignupLink = document.getElementById('show-signup-link');
    const showSigninLink = document.getElementById('show-signin-link');
    const signoutBtnMain = document.getElementById('signout-btn-main');
    const userInfoContainer = document.getElementById('user-info-container');
    const userDisplayMain = document.getElementById('user-display-main');
    const submitProjectBtn = document.getElementById('submit-project-btn');

    // --- Alert Modal Elements ---
    const alertModalOverlay = document.getElementById('alert-modal-overlay');
    const alertModalOkBtn = document.getElementById('alert-modal-ok-btn');
    const alertModalMessage = document.getElementById('alert-modal-message');
    const alertModalTitle = document.getElementById('alert-modal-title');

    // --- Profile Modal Elements ---
    const profileModalOverlay = document.getElementById('profile-modal-overlay');
    const profileForm = document.getElementById('profile-form');
    const profileNameInput = document.getElementById('profile-name-input');
    const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const cancelProfileBtn = document.getElementById('cancel-profile-btn');

    // --- Auth Form Elements ---
    const signinForm = document.getElementById('signin-form');
    const signinEmailInput = document.getElementById('signin-email-input');
    const signinPasswordInput = document.getElementById('signin-password-input');
    const signupForm = document.getElementById('signup-form');
    const signupFirstNameInput = document.getElementById('signup-first-name-input');
    const signupLastNameInput = document.getElementById('signup-last-name-input');
    const signupEmailInput = document.getElementById('signup-email-input');
    const signupPasswordInput = document.getElementById('signup-password-input');
    const signupPassword2Input = document.getElementById('signup-password2-input');
    const signupAffiliationInput = document.getElementById('signup-affiliation-input');
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const googleSignupBtn = document.getElementById('google-signup-btn');
    
    // --- Forgot Password Modal Elements ---
    const forgotPasswordModalOverlay = document.getElementById('forgot-password-modal-overlay');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const closeForgotPasswordModalBtn = document.getElementById('close-forgot-password-modal-btn');
    const cancelForgotPasswordBtn = document.getElementById('cancel-forgot-password-btn');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordEmailInput = document.getElementById('forgot-password-email-input');

    // --- 4. FIREBASE PROVIDER ---
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // --- Admin Email ---
    const ADMIN_EMAIL = "admin@uc.edu.ph"; 


    // --- 5. AUTH UI FUNCTIONS ---

    function openAuthModal(panelId = 'signin-panel') {
        if (!authModalOverlay || !signinPanel || !signupPanel) return;
        signinPanel.classList.toggle('hidden', panelId !== 'signin-panel');
        signupPanel.classList.toggle('hidden', panelId !== 'signup-panel');
        authModalOverlay.classList.remove('modal-hidden');
        clearFormErrors();
    }

    function closeAuthModal() {
        if (authModalOverlay) authModalOverlay.classList.add('modal-hidden');
    }

    function showAlertModal(message, title = 'Alert') {
        if (!alertModalOverlay || !alertModalMessage || !alertModalTitle) return;
        
        alertModalTitle.textContent = title;
        alertModalMessage.textContent = message;
        alertModalOverlay.classList.remove('modal-hidden');
    }

    function closeAlertModal() {
        if (alertModalOverlay) alertModalOverlay.classList.add('modal-hidden');
    }

    function openProfileModal() {
        if (!profileModalOverlay || !profileNameInput) return;
        const currentUser = auth.currentUser;
        if (!currentUser) return; 

        profileNameInput.value = currentUser.displayName || '';
        
        clearFormErrors();
        profileModalOverlay.classList.remove('modal-hidden');
    }

    function closeProfileModal() {
        if (profileModalOverlay) profileModalOverlay.classList.add('modal-hidden');
    }
    
    // --- Forgot Password Modal Functions ---
    function openForgotPasswordModal() {
        if (authModalOverlay) authModalOverlay.classList.add('modal-hidden'); // Close sign-in modal
        if (forgotPasswordModalOverlay) {
            forgotPasswordModalOverlay.classList.remove('modal-hidden');
            clearFormErrors(); // Clear errors on the main modal
        }
    }

    function closeForgotPasswordModal() {
        if (forgotPasswordModalOverlay) {
            forgotPasswordModalOverlay.classList.add('modal-hidden');
            clearFormErrors(); // Clear errors on the forgot password modal
        }
    }

    function displayFormError(formElement, message) {
        if (!formElement) return;
        let errorElement = formElement.querySelector('.form-error-message');
        if (!errorElement) {
            errorElement = document.createElement('p');
            errorElement.className = 'form-error-message';
            const primaryBtn = formElement.querySelector('.btn-form-primary');
            const googleBtn = formElement.querySelector('.btn-google');
            const insertBeforeElement = primaryBtn || googleBtn || formElement.lastElementChild;
            if (insertBeforeElement) {
                formElement.insertBefore(errorElement, insertBeforeElement);
            } else {
                formElement.appendChild(errorElement);
            }
        }
        errorElement.textContent = `Error: ${message}`;
        errorElement.style.color = '#dc3545';
        errorElement.style.marginTop = '10px';
    }

    function clearFormErrors() {
        document.querySelectorAll('.form-error-message').forEach(el => el.remove());
    }

    // --- 6. PROJECT AUTH ALERT ---
    function handleSubmitProjectClick(e) {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (currentUser) {
            window.open('submit-project.html', '_blank');
        } else {
            showAlertModal('You must be signed in to submit a project. Please sign in or create an account.', 'Sign In Required');
        }
    }

    // --- 7. MAIN UI UPDATE FUNCTION (COMBINED) ---
    function updateUI(user) {
        if (user) {
            // --- User is SIGNED IN ---
            if (openSigninBtn) openSigninBtn.classList.add('hidden');
            if (userInfoContainer) userInfoContainer.classList.remove('hidden');
            if (userDisplayMain) {
                const displayName = user.displayName || user.email;
                userDisplayMain.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${displayName.split('@')[0]}
                `;
                
                userDisplayMain.onclick = () => {
                    openProfileModal();
                };
            }
        } else {
            // --- User is SIGNED OUT ---
            if (openSigninBtn) openSigninBtn.classList.remove('hidden');
            if (userInfoContainer) userInfoContainer.classList.add('hidden');
            
            if (userDisplayMain) {
                userDisplayMain.onclick = null;
            }
        }
        
        renderProjects(); 
    }

    // --- 8. FIREBASE AUTH FUNCTIONS ---

    async function handleSignUp(email, password, firstName, lastName) {
        try {
            console.log("📝 Creating user account for:", email);
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log("✅ User account created. UID:", user.uid);
            
            await user.updateProfile({
                displayName: `${firstName} ${lastName}`
            });
            console.log("✅ User profile updated");
            
            const affiliation = signupAffiliationInput ? signupAffiliationInput.value : 'N/A';
            
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: `${firstName} ${lastName}`,
                firstName: firstName || 'N/A',
                lastName: lastName || 'N/A',
                affiliation: affiliation,
                loginType: 'Email/Password',
                isAdmin: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log("💾 Saving user data to Firestore:", userData);
            
            await db.collection('Registered Accounts').doc(user.uid).set(userData);
            console.log("✅ User data saved to Firestore successfully with document ID:", user.uid);
            
            closeAuthModal();
            alert('Registration successful! Welcome to UCoLab.');
            console.log('User signed up and profile updated:', user);
        } catch (error) {
            console.error('❌ Sign Up Error:', error.code, error.message);
            displayFormError(signupForm, error.message);
        }
    }

    async function handleSignIn(email, password) {
        try {
            console.log('🔵 Starting email/password sign in...');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('✅ User signed in successfully. UID:', user.uid);
            console.log('📧 Email:', user.email);

            console.log('🔍 Checking Firestore for user document...');
            console.log('🔍 DB instance:', db);
            console.log('🔍 User UID:', user.uid);
            
            const userDocRef = db.collection('Registered Accounts').doc(user.uid);
            console.log('🔍 Document reference created:', userDocRef);
            
            const userDoc = await userDocRef.get();
            console.log('🔍 Document snapshot:', userDoc);
            console.log('🔍 userDoc.exists (property):', userDoc.exists);
            
            if (userDoc.exists) { 
                console.log('✅ User document found in Firestore');
                const userData = userDoc.data();
                console.log('📄 User data:', JSON.stringify(userData, null, 2));
                
                const isAdmin = userData.isAdmin || false;
                console.log('🛡️  isAdmin (raw):', userData.isAdmin);
                console.log('🛡️  isAdmin (type):', typeof userData.isAdmin);
                console.log('🛡️  isAdmin || false:', isAdmin);
                console.log('🛡️  isAdmin === true:', isAdmin === true);
                
                console.log('⏰ Updating last login timestamp...');
                await userDocRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Last login updated');
                
                if (isAdmin === true) {
                    console.log('👑 ADMIN USER DETECTED!');
                    console.log('🚀 Redirecting to: ../admin/dashboard.html');
                    console.log('⚠️  About to redirect in 1 second...');
                    
                    setTimeout(() => {
                        alert('Welcome Admin! You will be redirected to the dashboard.');
                        console.log('🚀 EXECUTING REDIRECT NOW!');
                        window.location.href = '../admin/dashboard.html';
                    }, 500);
                    return;
                } else {
                    console.log('👤 Regular user detected');
                    console.log('✅ Closing modal and staying on page');
                    closeAuthModal();
                }
            } else {
                console.warn('⚠️  User not found in Firestore, creating profile...');
                closeAuthModal();
            }

        } catch (error) {
            console.error('❌ Sign In Error:', error.code, error.message);
            
            let errorMessage;
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'This account is not registered yet. Please register first before logging in.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = "The password you've entered is incorrect.";
            } else if (error.code === 'auth/invalid-login-credentials') {
                errorMessage = "This account is not registered yet or the password is incorrect. Please register first if you don't have an account.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else {
                errorMessage = 'Sign in failed. Please check your credentials and try again.';
            }
            
            displayFormError(signinForm, errorMessage);
        }
    }

    async function handleGoogleSignIn() {
        clearFormErrors();
        try {
            console.log("🔵 Starting Google Sign-In...");
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            const isNewUser = result.additionalUserInfo?.isNewUser || false;
            console.log("Google Sign-in successful:", user.displayName, user.email, "New user:", isNewUser);

            const userDocRef = db.collection('Registered Accounts').doc(user.uid);
            const userDoc = await userDocRef.get();
            
            if (isNewUser || !userDoc.exists) {
                console.log("💾 Saving new Google user to Firestore...");
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'N/A',
                    firstName: user.displayName?.split(' ')[0] || 'N/A',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || 'N/A',
                    affiliation: 'N/A',
                    loginType: 'Google',
                    photoURL: user.photoURL || null,
                    isAdmin: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await userDocRef.set(userData);
                console.log("✅ Google user data saved successfully with document ID:", user.uid);
                
                closeAuthModal();
                setTimeout(() => {
                    showAlertModal("Welcome! Please complete your profile (Affiliation) to submit a project.");
                }, 500);
            } else {
                const userData = userDoc.data();
                console.log("✅ Existing Google user found in Firestore");
                console.log("📄 User data:", JSON.stringify(userData, null, 2));
                
                const isAdmin = userData.isAdmin || false;
                console.log("🛡️  isAdmin (raw):", userData.isAdmin);
                console.log("🛡️  isAdmin (type):", typeof userData.isAdmin);
                console.log("🛡️  isAdmin || false:", isAdmin);
                console.log("🛡️  isAdmin === true:", isAdmin === true);
                
                console.log("⏰ Updating last login for existing user...");
                await userDocRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("✅ Last login updated");
                
                if (isAdmin === true) {
                    console.log("👑 ADMIN USER DETECTED!");
                    console.log("🚀 Redirecting to: ../admin/dashboard.html");
                    console.log("⚠️  About to redirect in 1 second...");
                    
                    setTimeout(() => {
                        alert('Welcome Admin! You will be redirected to the dashboard.');
                        console.log('🚀 EXECUTING REDIRECT NOW!');
                        window.location.href = '../admin/dashboard.html';
                    }, 500);
                    return;
                } else {
                    console.log("👤 Regular user, closing modal...");
                    closeAuthModal();
                }
            }

        } catch (error) {
            console.error('❌ Google Sign-In Error:', error.code, error.message);
            const activeForm = signinPanel && signinPanel.classList.contains('hidden') ? signupForm : signinForm;
            displayFormError(activeForm, `Google Sign-In Failed: ${error.message}`);
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        clearFormErrors();
        const newName = profileNameInput.value;
        const user = auth.currentUser;

        if (!newName || newName.trim() === '') {
            displayFormError(profileForm, 'Name cannot be empty.');
            return;
        }
        if (!user) {
            displayFormError(profileForm, 'You are not signed in.');
            return;
        }

        try {
            await user.updateProfile({
                displayName: newName
            });
            
            console.log('Profile updated successfully.');
            closeProfileModal();
            
            updateUI(auth.currentUser); 

            showAlertModal('Your profile has been updated.', 'Profile Updated');
            
        } catch (error) {
            console.error('Profile Update Error:', error);
            displayFormError(profileForm, error.message);
        }
    }

    async function handleSignOut() {
        try {
            await auth.signOut();
            console.log('User signed out successfully.');
        } catch (error) {
            showAlertModal('Error signing out. Please try again.', 'Error');
            console.error('Sign Out Error:', error.code, error.message);
        }
    }

    // --- Forgot Password Handler ---
    async function handleForgotPassword(email) {
        if (!email || email.trim() === '') {
            displayFormError(forgotPasswordForm, 'Please enter your email address.');
            return;
        }

        try {
            console.log('🔄 Attempting to send password reset email to:', email);
            
            const actionCodeSettings = {
                url: window.location.origin + '/ucolab/index.html',
                handleCodeInApp: false
            };
            
            await auth.sendPasswordResetEmail(email, actionCodeSettings);
            console.log('✅ Password reset email sent successfully to:', email);
            
            closeForgotPasswordModal();
            
            showAlertModal(
                `A password reset link has been sent to ${email}. Please check your email inbox (and spam folder) and follow the instructions to reset your password.`,
                'Reset Email Sent'
            );
            
            if (forgotPasswordEmailInput) {
                forgotPasswordEmailInput.value = '';
            }
        } catch (error) {
            console.error('❌ Password Reset Error:', error.code, error.message);
            console.error('Full error:', error);
            
            let errorMessage;
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address. Please check your email or sign up for a new account.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please try again later.';
            } else {
                errorMessage = 'Failed to send reset email. Please try again.';
            }
            
            displayFormError(forgotPasswordForm, errorMessage);
        }
    }

    // --- 9. PROJECT RENDERING FUNCTIONS ---

    function createProjectCardHTML(project) {
        if (!project || typeof project !== 'object') {
            console.error("Invalid project data for createProjectCardHTML:", project); return '';
        }
        
        const trlNumMatch = project.trl?.match(/TRL (\d+)/); const trlNum = trlNumMatch ? parseInt(trlNumMatch[1], 10) : 0; let trlClass = 'grey'; let trlText = project.trl || 'TRL ?'; if (trlNum <= 3) { trlClass = 'blue'; trlText = `TRL ${trlNum} – Proof of Concept`; } else if (trlNum <= 4) { trlClass = 'yellow'; trlText = `TRL ${trlNum} – Laboratory Testing`; } else if (trlNum <= 6) { trlClass = 'orange'; trlText = `TRL ${trlNum} – Prototype/Pilot`; } else if (trlNum <= 9) { trlClass = 'green'; trlText = `TRL ${trlNum} – System Prototype/Demo`; }
        let typeClass = 'grey'; if (project.type?.toLowerCase() === 'thesis') typeClass = 'blue'; else if (project.type?.toLowerCase() === 'capstone') typeClass = 'green'; else if (project.type?.toLowerCase() === 'research') typeClass = 'blue'; else if (project.type?.toLowerCase() === 'startup') typeClass = 'purple';

        const detailPageLink = (`project-detail.html?id=${project.id}`);

        const currentUser = auth.currentUser;
        let showActions = false;
        if (currentUser) {
            const userIdentifier = currentUser.displayName || currentUser.email;
            showActions = (project.userId === userIdentifier);
        }

        const imageUrl = (project.imageUrls && Array.isArray(project.imageUrls) && project.imageUrls.length > 0)
            ? project.imageUrls[0]
            : 'Logo/No image.png'; 

        const collegeText = (Array.isArray(project.college) ? project.college.join(', ') : project.college) || 'N/A';

        return `
            <article class="project-card animate-on-scroll" data-id="${project.id}" data-views="${project.views || 0}" data-inquiries="${project.inquiries || 0}" data-title="${project.title || ''}" data-type="${project.type || ''}" data-industry="${project.industry || ''}" data-college="${collegeText}" data-trl="TRL ${trlNum}" data-user-id="${project.userId || ''}">
                
                <div class="card-image-container">
                    <img src="${imageUrl}" alt="${project.title || 'Project'} cover image">
                </div>

                <div class="card-content-wrapper">
                    <h3>${project.title || 'Untitled Project'}</h3>
                    <div class="card-tags">${project.type ? `<span class="tag tag-${typeClass}">${project.type}</span>` : ''} ${project.industry ? `<span class="tag tag-grey">${project.industry}</span>` : ''}</div>
                    <p class="card-college">${collegeText}</p>
                    <span class="card-trl trl-${trlClass}">${trlText}</span>
                    <p class="card-description">${project.shortDescription || 'No description available.'}</p>
                    
                    <div class="card-footer">
                        <a href="${detailPageLink}" class="card-link">View Details →</a>
                        ${showActions ? `<div class="card-actions"><button class="btn-edit" data-id="${project.id}">Edit</button><button class="btn-delete" data-id="${project.id}">Delete</button></div>` : ''}
                    </div>
                </div>
            </article>`;
    }

    function loadProjects() {
        try {
            const storedProjects = localStorage.getItem('ucolabProjects'); 
            if (!storedProjects || storedProjects === '[]' || storedProjects === 'null' || !storedProjects.startsWith('[')) {
                localStorage.setItem('ucolabProjects', JSON.stringify(defaultProjects));
                allProjectsData = [...defaultProjects];
            } else {
                allProjectsData = JSON.parse(storedProjects);
                if (!Array.isArray(allProjectsData)) {
                    localStorage.setItem('ucolabProjects', JSON.stringify(defaultProjects));
                    allProjectsData = [...defaultProjects];
                }
            }
            if (!Array.isArray(allProjectsData)) {
                allProjectsData = [];
            }
        } catch (error) {
            allProjectsData = [...defaultProjects];
            try {
                localStorage.setItem('ucolabProjects', JSON.stringify(defaultProjects));
            } catch (saveError) {
                console.error("Failed to save default projects after error:", saveError);
            }
        }
    }

    function renderProjects() {
        if (!projectGrid || !projectsCountHeader) {
            console.error("Missing project-list or projects-count element.");
            return;
        }

        if (!Array.isArray(allProjectsData)) {
            console.error("allProjectsData is not an array! Cannot render. Data:", allProjectsData);
            projectGrid.innerHTML = '<p class="no-projects-message">Error loading project data.</p>';
            projectsCountHeader.textContent = `0 Projects Found`;
            return;
        }

        // === THIS IS THE UPDATED BLOCK ===
        // Changed default to 'All Categories' matching the new HTML dropdown
        const filters = {
            search: searchInput ? searchInput.value.toLowerCase() : '',
            industry: industryFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All Categories',
            college: collegeFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All Colleges',
            trl: trlFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All TRL Levels',
            type: typeFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All Types'
        };
        // === END OF UPDATED BLOCK ===
        
        const sortByElement = sortFilter?.querySelector('span:not(.visually-hidden)');
        const sortBy = sortByElement ? sortByElement.textContent : 'Newest';


        const filteredData = allProjectsData.filter(project => {
            if (!project) return false;
            
            const collegeText = (Array.isArray(project.college) ? project.college.join(', ') : project.college) || '';
            const collegeMatch = (filters.college === 'All Colleges') || (collegeText.includes(filters.college));
            
            const searchMatch = (project.title?.toLowerCase().includes(filters.search) || project.shortDescription?.toLowerCase().includes(filters.search));
            
            // === THIS IS THE UPDATED BLOCK ===
            // Allow 'All Categories' or 'Startup Categories' (fallback) to match everything
            const industryMatch = (filters.industry === 'All Categories') || 
                                  (filters.industry === 'All Startups') || 
                                  (project.industry === filters.industry); 
            // === END OF UPDATED BLOCK ===
            
            const trlMatch = (filters.trl === 'All TRL Levels') || (project.trl && project.trl.startsWith(filters.trl.split(' ')[0]));
            const typeMatch = (filters.type === 'All Types') || (project.type === filters.type);
            
            return searchMatch && industryMatch && collegeMatch && trlMatch && typeMatch;
        });

        filteredData.sort((a, b) => {
            switch (sortBy) {
                case 'Most Viewed': return (b.views || 0) - (a.views || 0);
                case 'Most Inquiries': return (b.inquiries || 0) - (a.inquiries || 0);
                case 'Newest': default: return (b.id || 0) - (a.id || 0);
            }
        });

        projectGrid.innerHTML = '';
        if (filteredData.length === 0) {
            projectGrid.innerHTML = '<p class="no-projects-message">No projects match the current filters.</p>';
        } else {
            filteredData.forEach(project => {
                if (project && project.id) {
                    projectGrid.innerHTML += createProjectCardHTML(project);
                } else {
                    console.warn("Skipping invalid project object during render:", project);
                }
            });
        }

        const count = filteredData.length;
        projectsCountHeader.textContent = `${count} Project${count === 1 ? '' : 's'} Found`;
        addEditDeleteListeners();
        setupScrollAnimations();
    }

    function addEditDeleteListeners() {
        const editButtons = projectGrid.querySelectorAll('.btn-edit');
        const deleteButtons = projectGrid.querySelectorAll('.btn-delete');
        editButtons.forEach(button => button.addEventListener('click', handleEditClick));
        deleteButtons.forEach(button => button.addEventListener('click', handleDeleteClick));
    }

    function handleEditClick(event) {
        const projectId = event.target.dataset.id;
        console.log(`Edit clicked for project ID: ${projectId}`);
        window.open(`edit-project.html?id=${projectId}`, '_blank');
    }

    function handleDeleteClick(event) {
        const projectId = event.target.dataset.id;
        if (confirm(`Are you sure you want to delete this project? This action cannot be undone.`)) {
            deleteProject(projectId);
        }
    }

    function deleteProject(idToDelete) {
        try {
            let projects = JSON.parse(localStorage.getItem('ucolabProjects') || '[]');
            projects = projects.filter(project => String(project.id) !== String(idToDelete));
            localStorage.setItem('ucolabProjects', JSON.stringify(projects));
            
            loadProjects(); 
            renderProjects(); 
            alert("Project deleted successfully.");
        } catch(error) {
            console.error("Error deleting project:", error);
            alert("Could not delete the project.");
        }
    }

    // --- 10. OTHER UI FUNCTIONS ---

    function closeOtherDropdowns(currentDropdown) {
        allDropdowns.forEach(dropdown => {
            if (dropdown !== currentDropdown) {
                const menu = dropdown.querySelector('.dropdown-menu');
                if (menu) menu.classList.remove('show');
            }
        });
    }

    function createRandomCircles() {
        const body = document.body; if (!body) return;
        const circleCount = Math.floor(Math.random() * 6) + 5;
        const colors = ['#B9F8CF', '#cff8b9', '#b9eef8', '#f8b9d4', '#f8e0b9'];
        for (let i = 0; i < circleCount; i++) {
            const circle = document.createElement('div'); circle.classList.add('blur-circle');
            const size = Math.floor(Math.random() * 401) + 200;
            circle.style.width = `${size}px`; circle.style.height = `${size}px`;
            circle.style.top = `${Math.random() * 140 - 20}vh`; circle.style.left = `${Math.random() * 140 - 20}vw`;
            circle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            circle.style.filter = `blur(${Math.floor(Math.random() * 101) + 100}px)`;
            circle.style.opacity = Math.random() * 0.4 + 0.3;
            body.prepend(circle);
        }
    }

    function setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        if ("IntersectionObserver" in window) {
            if (window.scrollObserver) {
                window.scrollObserver.disconnect();
            }
            window.scrollObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1 
            });
            animatedElements.forEach(el => {
                if (!el.classList.contains('is-visible')) {
                    window.scrollObserver.observe(el);
                }
            });
        } else {
            animatedElements.forEach(el => {
                el.classList.add('is-visible');
            });
        }
    }

    // --- 11. INITIALIZATION & EVENT LISTENERS ---
    
    // --- Filter/Search Listeners ---
    allDropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                closeOtherDropdowns(dropdown);
                menu.classList.toggle('show');
            });
            menu.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', () => {
                    const spanToUpdate = toggle.querySelector('span:not(.visually-hidden)');
                    if (spanToUpdate) spanToUpdate.textContent = item.textContent;
                    menu.classList.remove('show');
                    renderProjects();
                });
            });
        }
    });
    window.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            closeOtherDropdowns(null);
        }
    });
    if (searchInput) searchInput.addEventListener('input', renderProjects);

    // --- Auth Modal Listeners ---
    if (openSigninBtn) {
        openSigninBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('signin-panel');
        });
    }
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeAuthModal);
    }
    if (alertModalOkBtn) {
        alertModalOkBtn.addEventListener('click', closeAlertModal);
    }
    if (authModalOverlay) {
        authModalOverlay.addEventListener('click', (e) => {
            if (e.target === authModalOverlay) {
                closeAuthModal();
            }
        });
    }
    if (alertModalOverlay) {
        alertModalOverlay.addEventListener('click', (e) => {
            if (e.target === alertModalOverlay) {
                closeAlertModal();
            }
        });
    }
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            clearFormErrors();
            signinPanel.classList.add('hidden');
            signupPanel.classList.remove('hidden');
        });
    }
    if (showSigninLink) {
        showSigninLink.addEventListener('click', (e) => {
            e.preventDefault();
            clearFormErrors();
            signupPanel.classList.add('hidden');
            signinPanel.classList.remove('hidden');
        });
    }
    if (signinForm) {
        signinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFormErrors();
            handleSignIn(signinEmailInput.value, signinPasswordInput.value);
        });
    }
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFormErrors();
            if (signupPasswordInput.value !== signupPassword2Input.value) {
                displayFormError(signupForm, 'Passwords do not match.');
                return;
            }
            if (signupPasswordInput.value.length < 6) {
                displayFormError(signupForm, 'Password must be at least 6 characters.');
                return;
            }
            handleSignUp(signupEmailInput.value, signupPasswordInput.value, signupFirstNameInput.value, signupLastNameInput.value);
        });
    }
    if (signoutBtnMain) {
        signoutBtnMain.addEventListener('click', (e) => {
            e.preventDefault();
            handleSignOut();
        });
    }
    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', handleGoogleSignIn);
    }
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', handleGoogleSignIn);
    }

    // --- Forgot Password Modal Listeners ---
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }
    if (closeForgotPasswordModalBtn) {
        closeForgotPasswordModalBtn.addEventListener('click', closeForgotPasswordModal);
    }
    if (cancelForgotPasswordBtn) {
        cancelForgotPasswordBtn.addEventListener('click', closeForgotPasswordModal);
    }
    if (forgotPasswordModalOverlay) {
        forgotPasswordModalOverlay.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModalOverlay) {
                closeForgotPasswordModal();
            }
        });
    }
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearFormErrors();
            await handleForgotPassword(forgotPasswordEmailInput.value);
        });
    }

    // --- NEW: Profile Modal Listeners ---
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', closeProfileModal);
    }
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', closeProfileModal);
    }
    if (profileModalOverlay) {
        profileModalOverlay.addEventListener('click', (e) => {
            if (e.target === profileModalOverlay) { // Only close if clicking overlay
                closeProfileModal();
            }
        });
    }
    // --- END NEW ---

    // --- Submit Project Button Listener ---
    if (submitProjectBtn) {
        submitProjectBtn.addEventListener('click', handleSubmitProjectClick);
    }

    // --- NEW: Check Admin Status Function ---
    async function checkAdminStatus(user) {
        const adminBtn = document.getElementById('dashboard-admin-btn');
        if (!adminBtn) {
            console.log('❌ Admin button not found in DOM');
            return;
        }
        
        if (!user) {
            console.log('👤 No user signed in, hiding admin button');
            adminBtn.style.display = 'none';
            return;
        }
        
        try {
            const userDocRef = db.collection('Registered Accounts').doc(user.uid);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const isAdmin = userData.isAdmin === true;
                if (isAdmin) {
                    adminBtn.style.display = '';
                } else {
                    console.log('👤 Regular user - Hiding admin button');
                    adminBtn.style.display = 'none';
                }
            } else {
                adminBtn.style.display = 'none';
            }
        } catch (error) {
            adminBtn.style.display = 'none';
        }
    }
    // --- END NEW ---

    // --- CRITICAL: FIREBASE AUTH STATE LISTENER ---
    auth.onAuthStateChanged((user) => {
        updateUI(user);
        checkAdminStatus(user); // <-- Check admin status whenever auth state changes
        
        if (!user) {
            if(signinPanel && signupPanel) {
                signinPanel.classList.remove('hidden');
                signupPanel.classList.add('hidden');
            }
        }
    });

    // --- INITIAL PAGE LOAD ---
    loadProjects();
    createRandomCircles();

    // --- AUTO-RELOAD (NEW) ---
    window.addEventListener('focus', () => {
        console.log('🔄 Tab focused: Reloading projects...');
        loadProjects();
        renderProjects();
    });

}); // --- END OF DOMCONTENTLOADED ---


// --- Hero Image Slideshow ---
// This code runs *after* the main DOMContentLoaded event for the projects
document.addEventListener('DOMContentLoaded', () => {
    const slideshowContainer = document.querySelector('.hero-image-slideshow');
    
    if (slideshowContainer) {
        const images = Array.from(slideshowContainer.querySelectorAll('.slideshow-img'));
        let currentImageIndex = 0;
        let intervalTime = 5000; // 5 seconds per image

        // Function to show a specific image
        const showImage = (index) => {
            if (!images[index]) return; // Safety check
            images.forEach((img, i) => {
                img.classList.remove('active');
                if (i === index) {
                    img.classList.add('active');
                }
            });
        };

        // Function to get a random image index different from the current one
        const getRandomIndex = (max, current) => {
            let randomIndex;
            if (max <= 1) return 0; // Don't loop if only one image
            do {
                randomIndex = Math.floor(Math.random() * max);
            } while (randomIndex === current);
            return randomIndex;
        };

        // Initialize: Show a random image first
        if (images.length > 0) {
            currentImageIndex = getRandomIndex(images.length, -1);
            showImage(currentImageIndex);
        }

        // Start the slideshow
        setInterval(() => {
            if (images.length > 1) {
                currentImageIndex = getRandomIndex(images.length, currentImageIndex);
                showImage(currentImageIndex);
            }
        }, intervalTime);
    }
});
document.addEventListener('DOMContentLoaded', function() {

    const auth = window.auth || firebase.auth();
    const db = window.db || firebase.firestore();

    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    let allProjectsData = [];
    let currentFilteredProjects = [];
    let currentPage = 1;
    const ITEMS_PER_PAGE = 6;
    const MAX_VISIBLE_PAGINATION = 10;

    const projectGrid = document.getElementById('project-list');
    const projectsCountHeader = document.getElementById('projects-count');
    const searchInput = document.getElementById('search-input');
    const paginationContainer = document.getElementById('pagination-controls');

    const industryFilter = document.getElementById('filter-startup-category'); 
    const collegeFilter = document.getElementById('filter-college');
    const trlFilter = document.getElementById('filter-trl');
    const typeFilter = document.getElementById('filter-type');
    const sortFilter = document.getElementById('filter-sort');
    const allDropdowns = document.querySelectorAll('.custom-dropdown');
    
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    const signinPanel = document.getElementById('signin-panel');
    const signupPanel = document.getElementById('signup-panel');
    const openSigninBtn = document.getElementById('open-signin-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const showSignupLink = document.getElementById('show-signup-link');
    const showSigninLink = document.getElementById('show-signin-link');
    const signoutBtnModal = document.getElementById('signout-btn-modal');
    const userInfoContainer = document.getElementById('user-info-container');
    const userDisplayMain = document.getElementById('user-display-main');
    const submitProjectBtn = document.getElementById('submit-project-btn');

    const alertModalOverlay = document.getElementById('alert-modal-overlay');
    const alertModalOkBtn = document.getElementById('alert-modal-ok-btn');
    const alertModalMessage = document.getElementById('alert-modal-message');
    const alertModalTitle = document.getElementById('alert-modal-title');

    const profileModalOverlay = document.getElementById('profile-modal-overlay');
    const profileForm = document.getElementById('profile-form');
    const profileNameInput = document.getElementById('profile-name-input');
    const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const cancelProfileBtn = document.getElementById('cancel-profile-btn');

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
    
    const forgotPasswordModalOverlay = document.getElementById('forgot-password-modal-overlay');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const closeForgotPasswordModalBtn = document.getElementById('close-forgot-password-modal-btn');
    const cancelForgotPasswordBtn = document.getElementById('cancel-forgot-password-btn');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordEmailInput = document.getElementById('forgot-password-email-input');

    const googleProvider = new firebase.auth.GoogleAuthProvider();

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
    
    function openForgotPasswordModal() {
        if (authModalOverlay) authModalOverlay.classList.add('modal-hidden');
        if (forgotPasswordModalOverlay) {
            forgotPasswordModalOverlay.classList.remove('modal-hidden');
            clearFormErrors(); 
        }
    }

    function closeForgotPasswordModal() {
        if (forgotPasswordModalOverlay) {
            forgotPasswordModalOverlay.classList.add('modal-hidden');
            clearFormErrors();
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

    function handleSubmitProjectClick(e) {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (currentUser) {
            window.open('submit-project.html', '_blank');
        } else {
            showAlertModal('You must be signed in to submit a project. Please sign in or create an account.', 'Sign In Required');
        }
    }

    function updateUI(user) {
        if (user) {
            if (openSigninBtn) openSigninBtn.classList.add('hidden');
            if (userInfoContainer) userInfoContainer.classList.remove('hidden');
            if (userDisplayMain) {
                const displayName = user.displayName || user.email;
                userDisplayMain.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${displayName.split('@')[0]}
                `;
                userDisplayMain.onclick = () => { openProfileModal(); };
            }
        } else {
            if (openSigninBtn) openSigninBtn.classList.remove('hidden');
            if (userInfoContainer) userInfoContainer.classList.add('hidden');
            if (userDisplayMain) { userDisplayMain.onclick = null; }
        }
        loadProjects(); 
    }

    async function handleSignUp(email, password, firstName, lastName) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await user.updateProfile({ displayName: `${firstName} ${lastName}` });
            
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
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const debouncedSet = debounce(async (data) => {
                await db.collection('Registered Accounts').doc(user.uid).set(data);
            }, 1000);
            await debouncedSet(userData);
            closeAuthModal();
            alert('Registration successful! Welcome to UCoLab.');
        } catch (error) {
            displayFormError(signupForm, error.message);
        }
    }

    async function handleSignIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            const userDocRef = db.collection('Registered Accounts').doc(user.uid);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) { 
                const userData = userDoc.data();
                const debouncedUpdate = debounce(async (ref) => {
                    await ref.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
                }, 1000);
                await debouncedUpdate(userDocRef);
                
                if (userData.isAdmin === true) {
                    setTimeout(() => {
                        alert('Welcome Admin! Redirecting to dashboard.');
                        window.location.href = '../admin/dashboard.html';
                    }, 500);
                    return;
                } else {
                    closeAuthModal();
                }
            } else {
                closeAuthModal();
            }
        } catch (error) {
            displayFormError(signinForm, error.message);
        }
    }

    async function handleGoogleSignIn() {
        clearFormErrors();
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            const isNewUser = result.additionalUserInfo?.isNewUser || false;

            const userDocRef = db.collection('Registered Accounts').doc(user.uid);
            const userDoc = await userDocRef.get();
            
            if (isNewUser || !userDoc.exists) {
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'N/A',
                    loginType: 'Google',
                    isAdmin: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                };
                const debouncedSet = debounce(async (ref, data) => {
                    await ref.set(data);
                }, 1000);
                await debouncedSet(userDocRef, userData);
                closeAuthModal();
                setTimeout(() => { showAlertModal("Welcome! Please complete your profile."); }, 500);
            } else {
                const userData = userDoc.data();
                const debouncedUpdate = debounce(async (ref) => {
                    await ref.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
                }, 1000);
                await debouncedUpdate(userDocRef);
                if (userData.isAdmin === true) {
                    setTimeout(() => {
                        alert('Welcome Admin! Redirecting to dashboard.');
                        window.location.href = '../admin/dashboard.html';
                    }, 500);
                    return;
                } else {
                    closeAuthModal();
                }
            }
        } catch (error) {
            const activeForm = signinPanel && signinPanel.classList.contains('hidden') ? signupForm : signinForm;
            displayFormError(activeForm, `Google Sign-In Failed: ${error.message}`);
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        clearFormErrors();
        const newName = profileNameInput.value;
        const user = auth.currentUser;

        if (!newName || !newName.trim()) { displayFormError(profileForm, 'Name cannot be empty.'); return; }
        if (!user) { displayFormError(profileForm, 'You are not signed in.'); return; }

        try {
            await user.updateProfile({ displayName: newName });
            closeProfileModal();
            updateUI(auth.currentUser); 
            showAlertModal('Your profile has been updated.', 'Profile Updated');
        } catch (error) {
            displayFormError(profileForm, error.message);
        }
    }

    async function handleSignOut() {
        try {
            await auth.signOut();
            closeProfileModal(); 
        } catch (error) {
            showAlertModal('Error signing out.', 'Error');
        }
    }

    async function handleForgotPassword(email) {
        if (!email || !email.trim()) { displayFormError(forgotPasswordForm, 'Please enter your email.'); return; }
        try {
            await auth.sendPasswordResetEmail(email, { url: window.location.origin + '/ucolab/index.html' });
            closeForgotPasswordModal();
            showAlertModal(`Password reset link sent to ${email}.`, 'Reset Email Sent');
        } catch (error) {
            displayFormError(forgotPasswordForm, error.message);
        }
    }

    function createProjectCardHTML(project) {
        if (!project || typeof project !== 'object') return '';
        
        const trlNumMatch = (project.trl && typeof project.trl === 'string') ? project.trl.match(/(\d+)/) : null; 
        const trlNum = trlNumMatch ? parseInt(trlNumMatch[1], 10) : (parseInt(project.trl) || 0); 
        
        let trlClass = 'grey'; 
        let trlText = typeof project.trl === 'string' && project.trl.includes('TRL') ? project.trl : `TRL ${trlNum}`;
        
        if (trlNum <= 3) { trlClass = 'blue'; } 
        else if (trlNum <= 6) { trlClass = 'orange'; } 
        else if (trlNum <= 9) { trlClass = 'green'; } 
        else { trlClass = 'grey'; }

        let typeClass = 'grey'; 
        if (project.type?.toLowerCase() === 'thesis') typeClass = 'blue'; 
        else if (project.type?.toLowerCase() === 'capstone') typeClass = 'green'; 
        else if (project.type?.toLowerCase() === 'research') typeClass = 'blue'; 
        else if (project.type?.toLowerCase() === 'startup') typeClass = 'purple';

        const detailPageLink = (`project-detail.html?id=${project.id}`);

        const currentUser = auth.currentUser;
        let showActions = false;
        
        if (currentUser) {
            const userIdentifier = currentUser.displayName || currentUser.email;
            const userId = currentUser.uid;
            if (project.userId === userId || project.userId === userIdentifier) {
                showActions = true;
            }
        }

        const imageUrl = (project.imageUrls && Array.isArray(project.imageUrls) && project.imageUrls.length > 0)
            ? project.imageUrls[0]
            : (project.logo || 'Logo/No image.png'); 

        const collegeText = (Array.isArray(project.college) ? project.college.join(', ') : project.college) || 'N/A';
        const industryText = Array.isArray(project.industry) ? project.industry.join(', ') : (project.industry || 'General');

        return `
            <article class="project-card animate-on-scroll" data-id="${project.id}">
                <div class="card-image-container">
                    <img src="${imageUrl}" alt="${project.title} cover image" onerror="this.src='Logo/No image.png'">
                </div>
                <div class="card-content-wrapper">
                    <h3>${project.title}</h3>
                    <div class="card-tags">
                        ${project.type ? `<span class="tag tag-${typeClass}">${project.type}</span>` : ''} 
                        <span class="tag tag-grey" title="${industryText}">${industryText.substring(0, 25)}${industryText.length > 25 ? '...' : ''}</span>
                    </div>
                    <p class="card-college" title="${collegeText}">${collegeText}</p>
                    <span class="card-trl trl-${trlClass}">${trlText}</span>
                    <p class="card-description">${project.shortDescription || project.description || 'No description available.'}</p>
                    
                    <div class="card-footer">
                        <a href="${detailPageLink}" class="card-link">View Details →</a>
                    </div>
                </div>
            </article>`;
    }

    async function loadProjects() {
        try {
            const snapshot = await db.collection('startups').get();
            allProjectsData = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'pending') return; 
                allProjectsData.push({
                    id: doc.id,
                    title: data.name || data.title || 'Untitled Project',
                    shortDescription: data.shortDescription || data.description || '',
                    description: data.description || '',
                    industry: data.category || data.industry || 'Other',
                    college: data.college || data.affiliation || 'University of the Cordilleras',
                    trl: data.trl || 'TRL 1',
                    type: data.type || 'Startup',
                    imageUrls: data.imageUrls || (data.logo ? [data.logo] : []),
                    logo: data.logo,
                    userId: data.userId || data.founderEmail,
                    views: data.views || 0,
                    inquiries: data.inquiries || 0
                });
            });
            filterProjects();
        } catch (error) {
            console.error("Error loading projects from Firestore:", error);
            projectGrid.innerHTML = '<p class="no-projects-message">Error loading projects from database. Please check your connection.</p>';
        }
    }

    function filterProjects() {
        if (!Array.isArray(allProjectsData)) return;

        const filters = {
            search: searchInput ? searchInput.value.toLowerCase() : '',
            industry: industryFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All Categories',
            college: collegeFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All Colleges',
            trl: trlFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All TRL Levels',
            type: typeFilter?.querySelector('span:not(.visually-hidden)').textContent || 'All Types'
        };
        
        const sortByElement = sortFilter?.querySelector('span:not(.visually-hidden)');
        const sortBy = sortByElement ? sortByElement.textContent : 'Newest';

        currentFilteredProjects = allProjectsData.filter(project => {
            if (!project) return false;
            
            const searchMatch = (project.title?.toLowerCase().includes(filters.search) || project.shortDescription?.toLowerCase().includes(filters.search));
            
            const filterInd = filters.industry.trim();
            const isAllInd = filterInd === 'All Categories' || filterInd === 'All Startups';
            let industryMatch = isAllInd;

            if (!industryMatch) {
                if (Array.isArray(project.industry)) {
                    industryMatch = project.industry.some(item => 
                        item.trim().toLowerCase() === filterInd.toLowerCase()
                    );
                } else {
                    industryMatch = project.industry.trim().toLowerCase() === filterInd.toLowerCase();
                }
            }

            const filterCol = filters.college.trim();
            const isAllCol = filterCol === 'All Colleges';
            let collegeMatch = isAllCol;

            if (!collegeMatch) {
                const projColStr = Array.isArray(project.college) 
                    ? project.college.join(' ').toLowerCase() 
                    : (project.college || '').toLowerCase();
                collegeMatch = projColStr.includes(filterCol.toLowerCase());
            }

            const typeMatch = (filters.type === 'All Types') || (project.type === filters.type);

            let trlMatch = true;
            if (filters.trl !== 'All TRL Levels') {
                const filterMatch = filters.trl.match(/TRL\s?(\d+)/i);
                const filterTrlNum = filterMatch ? parseInt(filterMatch[1], 10) : null;

                let projectTrlNum = 0;
                if (typeof project.trl === 'number') {
                    projectTrlNum = project.trl;
                } else if (typeof project.trl === 'string') {
                    const pMatch = project.trl.match(/(\d+)/);
                    if (pMatch) projectTrlNum = parseInt(pMatch[1], 10);
                }

                if (filterTrlNum !== null) {
                    trlMatch = (projectTrlNum === filterTrlNum);
                }
            }
            
            return searchMatch && industryMatch && collegeMatch && trlMatch && typeMatch;
        });

        currentFilteredProjects.sort((a, b) => {
            switch (sortBy) {
                case 'Most Viewed': return (b.views || 0) - (a.views || 0);
                case 'Most Inquiries': return (b.inquiries || 0) - (a.inquiries || 0);
                case 'Newest': default: return 0;
            }
        });

        currentPage = 1;
        renderPage();
    }

    function renderPage() {
        if (!projectGrid || !projectsCountHeader) return;

        const count = currentFilteredProjects.length;
        projectsCountHeader.textContent = `${count} Project${count === 1 ? '' : 's'} Found`;

        if (count === 0) {
            projectGrid.innerHTML = '<p class="no-projects-message">No projects match the current filters.</p>';
            if(paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const projectsToShow = currentFilteredProjects.slice(startIndex, endIndex);

        projectGrid.innerHTML = '';
        projectsToShow.forEach(project => {
            projectGrid.innerHTML += createProjectCardHTML(project);
        });

        renderPaginationControls();
        addEditDeleteListeners();
        setupScrollAnimations();
    }

    function renderPaginationControls() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';

        const totalPages = Math.ceil(currentFilteredProjects.length / ITEMS_PER_PAGE);
        if (totalPages <= 1) return;

        let startPage, endPage;
        if (totalPages <= MAX_VISIBLE_PAGINATION) {
            startPage = 1;
            endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(MAX_VISIBLE_PAGINATION / 2);
            const maxPagesAfterCurrent = Math.ceil(MAX_VISIBLE_PAGINATION / 2) - 1;

            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = MAX_VISIBLE_PAGINATION;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - MAX_VISIBLE_PAGINATION + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        const prevBtn = document.createElement('a');
        prevBtn.className = `page-btn ${currentPage === 1 ? 'disabled' : ''}`;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                renderPage();
                document.getElementById('projects-grid').scrollIntoView({ behavior: 'smooth' });
            }
        });
        paginationContainer.appendChild(prevBtn);

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('a');
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                renderPage();
                document.getElementById('projects-grid').scrollIntoView({ behavior: 'smooth' });
            });
            paginationContainer.appendChild(btn);
        }

        const nextBtn = document.createElement('a');
        nextBtn.className = `page-btn ${currentPage === totalPages ? 'disabled' : ''}`;
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
                document.getElementById('projects-grid').scrollIntoView({ behavior: 'smooth' });
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    function addEditDeleteListeners() {
        projectGrid.querySelectorAll('.btn-edit').forEach(button => button.addEventListener('click', handleEditClick));
        projectGrid.querySelectorAll('.btn-delete').forEach(button => button.addEventListener('click', handleDeleteClick));
    }

    function handleEditClick(event) {
        const projectId = event.target.dataset.id;
        window.open(`edit-project.html?id=${projectId}`, '_blank');
    }

    async function handleDeleteClick(event) {
        const projectId = event.target.dataset.id;
        if (confirm(`Are you sure you want to delete this project? This action cannot be undone.`)) {
            try {
                await db.collection('startups').doc(projectId).delete();
                alert("Project deleted successfully.");
                loadProjects(); 
            } catch(error) {
                console.error("Error deleting project:", error);
                alert("Could not delete the project from the database.");
            }
        }
    }

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
            if (window.scrollObserver) window.scrollObserver.disconnect();
            window.scrollObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            animatedElements.forEach(el => { if (!el.classList.contains('is-visible')) window.scrollObserver.observe(el); });
        } else {
            animatedElements.forEach(el => el.classList.add('is-visible'));
        }
    }
    
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
                    filterProjects();
                });
            });
        }
    });
    window.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) closeOtherDropdowns(null);
    });
    
    if (searchInput) searchInput.addEventListener('input', filterProjects);

    if (openSigninBtn) openSigninBtn.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('signin-panel'); });
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAuthModal);
    if (alertModalOkBtn) alertModalOkBtn.addEventListener('click', closeAlertModal);
    if (authModalOverlay) authModalOverlay.addEventListener('click', (e) => { if (e.target === authModalOverlay) closeAuthModal(); });
    if (alertModalOverlay) alertModalOverlay.addEventListener('click', (e) => { if (e.target === alertModalOverlay) closeAlertModal(); });
    
    if (showSignupLink) showSignupLink.addEventListener('click', (e) => { e.preventDefault(); clearFormErrors(); signinPanel.classList.add('hidden'); signupPanel.classList.remove('hidden'); });
    if (showSigninLink) showSigninLink.addEventListener('click', (e) => { e.preventDefault(); clearFormErrors(); signupPanel.classList.add('hidden'); signinPanel.classList.remove('hidden'); });
    
    if (signinForm) signinForm.addEventListener('submit', (e) => { e.preventDefault(); clearFormErrors(); handleSignIn(signinEmailInput.value, signinPasswordInput.value); });
    if (signupForm) signupForm.addEventListener('submit', (e) => { 
        e.preventDefault(); clearFormErrors();
        if (signupPasswordInput.value !== signupPassword2Input.value) { displayFormError(signupForm, 'Passwords do not match.'); return; }
        if (signupPasswordInput.value.length < 6) { displayFormError(signupForm, 'Password must be at least 6 characters.'); return; }
        handleSignUp(signupEmailInput.value, signupPasswordInput.value, signupFirstNameInput.value, signupLastNameInput.value);
    });
    
    if (signoutBtnModal) {
    signoutBtnModal.addEventListener('click', (e) => {
        e.preventDefault();
        handleSignOut();
    });
}
    if (googleSigninBtn) googleSigninBtn.addEventListener('click', handleGoogleSignIn);
    if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleSignIn);

    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); openForgotPasswordModal(); });
    if (closeForgotPasswordModalBtn) closeForgotPasswordModalBtn.addEventListener('click', closeForgotPasswordModal);
    if (cancelForgotPasswordBtn) cancelForgotPasswordBtn.addEventListener('click', closeForgotPasswordModal);
    if (forgotPasswordModalOverlay) forgotPasswordModalOverlay.addEventListener('click', (e) => { if (e.target === forgotPasswordModalOverlay) closeForgotPasswordModal(); });
    if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', async (e) => { e.preventDefault(); clearFormErrors(); await handleForgotPassword(forgotPasswordEmailInput.value); });

    if (profileForm) profileForm.addEventListener('submit', handleProfileUpdate);
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', closeProfileModal);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeProfileModal);
    if (profileModalOverlay) profileModalOverlay.addEventListener('click', (e) => { if (e.target === profileModalOverlay) closeProfileModal(); });

    if (submitProjectBtn) submitProjectBtn.addEventListener('click', handleSubmitProjectClick);

    async function checkAdminStatus(user) {
        const adminBtn = document.getElementById('dashboard-admin-btn');
        if (!adminBtn) return;
        if (!user) { adminBtn.style.display = 'none'; return; }
        try {
            const userDoc = await db.collection('Registered Accounts').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().isAdmin === true) { adminBtn.style.display = ''; } 
            else { adminBtn.style.display = 'none'; }
        } catch (error) { adminBtn.style.display = 'none'; }
    }

    auth.onAuthStateChanged((user) => {
        updateUI(user);
        checkAdminStatus(user);
        if (!user && signinPanel && signupPanel) { signinPanel.classList.remove('hidden'); signupPanel.classList.add('hidden'); }
    });

    createRandomCircles();
    loadProjects();

    window.addEventListener('focus', () => { loadProjects(); });

});

document.addEventListener('DOMContentLoaded', () => {
    const slideshowContainer = document.querySelector('.hero-image-slideshow');
    if (slideshowContainer) {
        const images = Array.from(slideshowContainer.querySelectorAll('.slideshow-img'));
        let currentImageIndex = 0;
        let intervalTime = 5000; 
        const showImage = (index) => {
            if (!images[index]) return; 
            images.forEach((img, i) => { img.classList.remove('active'); if (i === index) img.classList.add('active'); });
        };
        const getRandomIndex = (max, current) => {
            let randomIndex; if (max <= 1) return 0;
            do { randomIndex = Math.floor(Math.random() * max); } while (randomIndex === current);
            return randomIndex;
        };
        if (images.length > 0) {
            currentImageIndex = getRandomIndex(images.length, -1);
            showImage(currentImageIndex);
        }
        setInterval(() => {
            if (images.length > 1) {
                currentImageIndex = getRandomIndex(images.length, currentImageIndex);
                showImage(currentImageIndex);
            }
        }, intervalTime);
    }
});
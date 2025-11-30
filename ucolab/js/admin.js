document.addEventListener('DOMContentLoaded', function() {

    const projectGrid = document.getElementById('project-list');
    const projectsCountHeader = document.getElementById('projects-count');
    const signOutBtn = document.getElementById('admin-signout-btn');
    const ADMIN_EMAIL = "admin@ucolab.com"; // Must match main.js

    const PENDING_COLLECTION = 'pending_projects';
    const PUBLIC_COLLECTION = 'startups';

    let pendingProjects = []; // local in-memory list derived from Firestore
    let publicProjects = [];
    let unsubscribePending = null;
    let unsubscribePublic = null;

    // --- 1. AUTH CHECK ---
    auth.onAuthStateChanged(async function(user) {
        if (user && user.email === ADMIN_EMAIL) {
            // User is admin, load the page
                const migrated = await migrateLocalDataToFirestore();
                setupFirestoreListeners();
                if (!migrated) {
                    // If migration didn't run, attempt to load from localStorage only if no Firestore
                    if (!window.db) loadProjectsFromLocalStorage();
                }
                renderProjects();
        } else {
            // Not admin or not logged in, kick to index
            window.location.href = 'index.html';
        }
    });

    // --- 2. SIGN OUT ---
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }

    function showSuccess(message) {
        alert(message);
    }

    // --- 3. PROJECT FUNCTIONS ---
    // Firestore listener setup
    function setupFirestoreListeners() {
        // Unsubscribe existing listeners
        if (typeof unsubscribePending === 'function') { try { unsubscribePending(); } catch (e) {} }
        if (typeof unsubscribePublic === 'function') { try { unsubscribePublic(); } catch (e) {} }

        if (!window.db) {
            // No Firestore — fallback to localStorage for now
            loadProjectsFromLocalStorage();
            renderProjects();
            return;
        }

        unsubscribePending = db.collection(PENDING_COLLECTION)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                pendingProjects = [];
                snapshot.forEach(doc => {
                    const data = doc.data() || {};
                    pendingProjects.push({ docId: doc.id, ...data });
                });
                renderProjects();
            }, err => console.error('Failed to load pending projects', err));

        unsubscribePublic = db.collection(PUBLIC_COLLECTION)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                publicProjects = [];
                snapshot.forEach(doc => {
                    const data = doc.data() || {};
                    publicProjects.push({ docId: doc.id, ...data });
                });
            }, err => console.error('Failed to load public projects', err));
    }

    function loadProjectsFromLocalStorage() {
        try {
            pendingProjects = JSON.parse(localStorage.getItem('pendingProjects') || '[]');
            publicProjects = JSON.parse(localStorage.getItem('ucolabProjects') || '[]');
        } catch (e) {
            pendingProjects = [];
            publicProjects = [];
        }
    }

    // Migrate any localStorage data to Firestore when Firestore is empty and user confirms
    async function migrateLocalDataToFirestore() {
        if (!window.db) return false;
        try {
            const pendingRaw = JSON.parse(localStorage.getItem('pendingProjects') || '[]');
            const publicRaw = JSON.parse(localStorage.getItem('ucolabProjects') || '[]');
            // Check if Firestore already has data
            const pendingSnapshot = await db.collection(PENDING_COLLECTION).limit(1).get();
            const publicSnapshot = await db.collection(PUBLIC_COLLECTION).limit(1).get();
            const firestoreHasData = !pendingSnapshot.empty || !publicSnapshot.empty;

            if (firestoreHasData) return false; // nothing to migrate

            if ((pendingRaw && pendingRaw.length) || (publicRaw && publicRaw.length)) {
                const proceed = confirm('Found local project data stored on this browser. Do you want to upload it to Firestore database?');
                if (!proceed) return false;

                // Upload pending projects
                for (const p of (pendingRaw || [])) {
                    const { id, ...payload } = p;
                    payload.createdAt = payload.createdAt ? firebase.firestore.Timestamp.fromDate(new Date(payload.createdAt)) : firebase.firestore.Timestamp.now();
                    payload.updatedAt = firebase.firestore.Timestamp.now();
                    try { await db.collection(PENDING_COLLECTION).add(payload); } catch (e) { console.error('Failed to migrate pending project', e); }
                }

                // Upload public projects
                for (const p of (publicRaw || [])) {
                    const { id, ...payload } = p;
                    payload.createdAt = payload.createdAt ? firebase.firestore.Timestamp.fromDate(new Date(payload.createdAt)) : firebase.firestore.Timestamp.now();
                    payload.updatedAt = firebase.firestore.Timestamp.now();
                    try { await db.collection(PUBLIC_COLLECTION).add(payload); } catch (e) { console.error('Failed to migrate public project', e); }
                }

                // Remove localStorage after migration
                localStorage.removeItem('pendingProjects');
                localStorage.removeItem('ucolabProjects');
                alert('Migration complete: local projects were uploaded to Firestore.');
                return true;
            }
            return false;
        } catch (e) {
            console.error('Migration failed', e);
            return false;
        }
    }

    function renderProjects() {
        if (!projectGrid || !projectsCountHeader) return;
        
        projectGrid.innerHTML = ''; // Clear grid

        if (pendingProjects.length === 0) {
            projectGrid.innerHTML = '<p class="no-projects-message">No projects are awaiting approval.</p>';
        } else {
            pendingProjects.forEach(project => {
                projectGrid.innerHTML += createPendingCardHTML(project);
            });
        }
        projectsCountHeader.textContent = `Pending Projects (${pendingProjects.length})`;
        
        // Add listeners to new buttons
        addAdminActionListeners();
    }

function createPendingCardHTML(project) {
        
        // --- NEW: Get the cover image (Slot 1) ---
        const imageUrl = (project.imageUrls && Array.isArray(project.imageUrls) && project.imageUrls.length > 0)
            ? project.imageUrls[0] // Use the first image
            : `https://via.placeholder.com/500x350.png?text=${(project.title || 'Project').replace(/ /g, '+')}`; // Fallback

        // --- NEW: Convert college array to string ---
        const collegeText = (Array.isArray(project.college) ? project.college.join(', ') : project.college) || 'N/A';

        return `
            <article class="project-card" data-docid="${project.docId || project.id}">

                <!-- NEW: Image Header -->
                <div class="card-image-container">
                    <img src="${imageUrl}" alt="${project.title || 'Project'} cover image">
                </div>

                <!-- NEW: Content Wrapper -->
                <div class="card-content-wrapper">
                    <h3>${project.title || 'Untitled Project'}</h3>
                    <p class="card-college">${collegeText}</p>
                    <p class="card-description">${project.shortDescription || 'No description.'}</p>
                    
                    <div class="card-footer">
                        <a href="project-detail.html?id=${project.docId || project.id}" target="_blank" class="card-link">Preview →</a>
                        <div class="admin-actions">
                            <button class="btn-reject" data-docid="${project.docId || project.id}">Reject</button>
                            <button class="btn-approve" data-docid="${project.docId || project.id}">Approve</button>
                        </div>
                    </div>
                </div> <!-- End content wrapper -->
            </article>`;
    }

    // --- 4. ACTION LISTENERS ---
    function addAdminActionListeners() {
        projectGrid.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => approveProject(btn.dataset.docid));
        });
        projectGrid.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', () => rejectProject(btn.dataset.docid));
        });
    }

    async function approveProject(docId) {
        if (!confirm("Are you sure you want to approve this project?")) return;
        if (!window.db) { alert('No database connection.'); return; }

        try {
            // Get the pending project doc
            const docRef = db.collection(PENDING_COLLECTION).doc(docId);
            const docSnapshot = await docRef.get();
            if (!docSnapshot.exists) { alert('Project not found'); return; }
            const projectToApprove = docSnapshot.data();

            // Add to public collection
            await db.collection(PUBLIC_COLLECTION).add({ ...projectToApprove, approvedAt: firebase.firestore.Timestamp.now(), updatedAt: firebase.firestore.Timestamp.now() });

            // Delete from pending collection
            await docRef.delete();

            showSuccess('Project approved and published');
        } catch (e) {
            console.error('Approve failed', e);
            alert('Failed to approve project: ' + (e.message || e));
        }
    }

    async function rejectProject(docId) {
        if (!confirm("Are you sure you want to REJECT this project? This will delete it.")) return;
        if (!window.db) { alert('No database connection.'); return; }

        try {
            // Delete directly from pending collection
            await db.collection(PENDING_COLLECTION).doc(docId).delete();
            showSuccess('Project rejected and removed');
        } catch (e) {
            console.error('Reject failed', e);
            alert('Failed to reject project: ' + (e.message || e));
        }
    }

});
document.addEventListener('DOMContentLoaded', function() {

    const projectGrid = document.getElementById('project-list');
    const projectsCountHeader = document.getElementById('projects-count');
    const signOutBtn = document.getElementById('admin-signout-btn');
    const ADMIN_EMAIL = "admin@ucolab.com"; // Must match main.js

    let pendingProjects = [];
    let publicProjects = [];

    // --- 1. AUTH CHECK ---
    auth.onAuthStateChanged(function(user) {
        if (user && user.email === ADMIN_EMAIL) {
            // User is admin, load the page
            loadProjects();
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

    // --- 3. PROJECT FUNCTIONS ---
    function loadProjects() {
        try {
            pendingProjects = JSON.parse(localStorage.getItem('pendingProjects') || '[]');
            publicProjects = JSON.parse(localStorage.getItem('ucolabProjects') || '[]');
        } catch (e) {
            pendingProjects = [];
            publicProjects = [];
        }
    }

    function saveProjects() {
        localStorage.setItem('pendingProjects', JSON.stringify(pendingProjects));
        localStorage.setItem('ucolabProjects', JSON.stringify(publicProjects));
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
            <article class="project-card" data-id="${project.id}">

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
                        <a href="project-detail.html?id=${project.id}" target="_blank" class="card-link">Preview →</a>
                        <div class="admin-actions">
                            <button class="btn-reject" data-id="${project.id}">Reject</button>
                            <button class="btn-approve" data-id="${project.id}">Approve</button>
                        </div>
                    </div>
                </div> <!-- End content wrapper -->
            </article>`;
    }

    // --- 4. ACTION LISTENERS ---
    function addAdminActionListeners() {
        projectGrid.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => approveProject(btn.dataset.id));
        });
        projectGrid.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', () => rejectProject(btn.dataset.id));
        });
    }

    function approveProject(id) {
        if (!confirm("Are you sure you want to approve this project?")) return;

        // Find the project in the pending list
        const projectToApprove = pendingProjects.find(p => String(p.id) === String(id));
        if (!projectToApprove) {
            return;
        }

        // Add to public list
        publicProjects.push(projectToApprove);
        
        // Remove from pending list
        pendingProjects = pendingProjects.filter(p => String(p.id) !== String(id));

        // Save and re-render
        saveProjects();
        renderProjects();
    }

    function rejectProject(id) {
        if (!confirm("Are you sure you want to REJECT this project? This will delete it.")) return;

        // Remove from pending list
        pendingProjects = pendingProjects.filter(p => String(p.id) !== String(id));
        
        // Save and re-render
        saveProjects();
        renderProjects();
    }

});
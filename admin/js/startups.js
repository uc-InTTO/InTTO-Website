document.addEventListener('DOMContentLoaded', () => {
    // *** CRITICAL: Must match the frontend load-startups.js storage key ***
    const STORAGE_KEY = 'ucInttoStartupsData'; 
    const PENDING_KEY = 'pendingProjects';

    // Default data (Used if storage is empty)
    const defaultStartups = [
        { id: 1, createdAt: "2025-01-15", name: "AgroTech Solutions", title: "AgroTech Solutions", logo: "🧑‍🌾", category: "Agriculture and Food", industry: "Agriculture and Food", trl: 7, status: "active", collab: true, website: "https://agrotech.example.com", description: "Smart farming solutions using IoT sensors.", tags: ["IoT", "Agriculture"], sdgs: ["SDG 2"] },
        { id: 2, createdAt: "2025-03-20", name: "HealthHub PH", title: "HealthHub PH", logo: "❤️", category: "Health", industry: "Health", trl: 6, status: "active", collab: false, website: "https://healthhub.example.com", description: "Telemedicine platform connecting rural communities.", tags: ["Telemedicine", "Healthcare"], sdgs: ["SDG 3"] },
        { id: 3, createdAt: "2025-05-10", name: "SafeCity Monitor", title: "SafeCity Monitor", logo: "🛡️", category: "Criminology, Forensics, and Public Safety", industry: "Criminology, Forensics, and Public Safety", trl: 5, status: "active", collab: true, website: "https://safecity.example.com", description: "AI-powered community safety monitoring.", tags: ["AI", "Safety"], sdgs: ["SDG 11"] },
        { id: 4, createdAt: "2024-11-05", name: "Cordillera Crafts", title: "Cordillera Crafts", logo: "🏺", category: "Creative Industries", industry: "Creative Industries", trl: 8, status: "graduated", collab: false, website: "https://cordillera.example.com", description: "Digital marketplace showcasing indigenous crafts.", tags: ["E-commerce", "Arts"], sdgs: ["SDG 8"] },
        { id: 5, createdAt: "2025-08-01", name: "EduLearn Platform", title: "EduLearn Platform", logo: "📚", category: "Education Technologies", industry: "Education Technologies", trl: 6, status: "active", collab: true, website: "https://edulearn.example.com", description: "Interactive learning management system.", tags: ["Education", "LMS"], sdgs: ["SDG 4"] }
    ];

    // --- Load & Merge Data ---
    const loadData = () => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        let existingStartups = [];
        
        // If no saved data, use defaults and save them
        if (!savedData) {
            existingStartups = defaultStartups;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStartups));
        } else {
            existingStartups = JSON.parse(savedData);
        }
        
        // CHECK FOR PENDING SUBMISSIONS from the public site
        const pendingProjectsStr = localStorage.getItem(PENDING_KEY);
        
        if (pendingProjectsStr) {
            const pending = JSON.parse(pendingProjectsStr);
            
            pending.forEach(project => {
                // Avoid duplicates visually in the list if IDs conflict, but normally we list them all
                // For the admin view, we want to see EVERYTHING.
                // We treat pending projects as part of the list but with 'pending' status.
                
                // Check if this pending project is already in existingStartups (accepted)
                // This check prevents showing a project twice if it was moved but not cleared correctly, 
                // though typically we handle that in approve logic.
                const exists = existingStartups.find(s => String(s.id) === String(project.id));
                
                if (!exists) {
                    // Normalize data structure
                    const normalizedProject = {
                        ...project,
                        status: 'pending', // Ensure status is pending
                        createdAt: project.createdAt || new Date().toISOString().split('T')[0],
                        name: project.title || project.name, // Ensure Name exists
                        category: project.industry || project.category || 'Other', // Ensure Category exists
                        description: project.shortDescription || project.description || '',
                        logo: project.logo || '🚀',
                        tags: project.tags || [],
                        sdgs: project.sdg ? [project.sdg] : (project.sdgs || [])
                    };
                    existingStartups.push(normalizedProject);
                }
            });
        }
        
        return existingStartups;
    };

    const saveData = () => {
        // We only save the ACTIVE (non-pending) ones back to ucolabProjects from here usually,
        // but since we are merging for display, we need to be careful not to save 'pending' items 
        // into 'ucolabProjects' unless they are approved.
        
        // However, for delete/reject actions, we need to update the respective source.
        // This simple save might need logic to split them back up, but for now, 
        // the approve/reject functions handle the splitting.
        
        // Filter out pending items before saving to main storage
        const activeToSave = startupsData.filter(s => s.status !== 'pending');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeToSave));
    };

    let startupsData = loadData();

    // --- DOM Elements ---
    const startupList = document.querySelector('.startup-list');
    const addStartupBtn = document.getElementById('add-startup-btn');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.category-filters .filter-btn');
    const sortDropdown = document.getElementById('sort-startups');

    // --- Render Function ---
    const renderStartups = () => {
        startupsData = loadData(); // Reload data before render to ensure freshness

        const searchTerm = searchInput.value.toLowerCase();
        const activeFilter = document.querySelector('.category-filters .filter-btn.active').dataset.filter;
        
        let filteredData = startupsData.filter(startup => {
            // Match category more flexibly
            const startupCategory = (startup.category || startup.industry || '').trim();
            const matchesCategory = activeFilter === 'all' || 
                                    startupCategory === activeFilter ||
                                    startupCategory.includes(activeFilter) ||
                                    activeFilter.includes(startupCategory);
            
            const matchesSearch = startup.name.toLowerCase().includes(searchTerm) ||
                                  (startup.description && startup.description.toLowerCase().includes(searchTerm));
            
            // Show all statuses including pending, active, graduated
            return matchesCategory && matchesSearch;
        });

        // Sorting
        const sortValue = sortDropdown.value;
        if (sortValue === 'recent') {
            filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortValue === 'oldest') {
            filteredData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortValue === 'a-z') {
            filteredData.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortValue === 'z-a') {
            filteredData.sort((a, b) => b.name.localeCompare(a.name));
        }

        startupList.innerHTML = '';
        if (filteredData.length === 0) {
            startupList.innerHTML = `<p style="text-align: center; color: var(--text-light);">No startups found.</p>`;
            return;
        }

        filteredData.forEach(startup => {
            const card = document.createElement('div');
            card.className = 'startup-card';
            card.dataset.id = startup.id;
            
            const sdgTagsHTML = (startup.sdgs && Array.isArray(startup.sdgs))
                ? startup.sdgs.map(sdg => `<span class="tag tag-sdg">${sdg}</span>`).join('')
                : '';
            
            // Determine Status Badge Style
            let statusClass = 'tag-status-' + (startup.status || 'active');
            let statusText = startup.status || 'active';
            
            if (startup.status === 'pending') {
                statusClass = 'tag-status-pending';
                statusText = '⏳ Pending Review';
            } else if (startup.status === 'rejected') {
                statusClass = 'tag-status-rejected';
                statusText = '❌ Rejected';
            } else if (startup.status === 'active') {
                statusClass = 'tag-status-active';
                statusText = '✅ Active';
            }

            // Only show Approve/Reject buttons for Pending items
            const approvalButtonsHTML = startup.status === 'pending' ? `
                <button class="icon-btn approve-btn" title="Approve & Publish"><i class="fa-solid fa-check"></i></button>
                <button class="icon-btn reject-btn" title="Reject"><i class="fa-solid fa-xmark"></i></button>
            ` : '';

            // Safe tag rendering
            const tagsArray = Array.isArray(startup.tags) ? startup.tags : [];
            
            const tagsHTML = `
                <span class="tag ${statusClass}">${statusText}</span>
                <span class="tag">${startup.category || 'Uncategorized'}</span>
                <span class="tag">TRL ${startup.trl || '?'}</span>
                ${startup.collab ? `<span class="tag tag-collab">Open for Collab</span>` : ''}
                ${tagsHTMLFromList(tagsArray)}
                ${sdgTagsHTML}
            `;
            
            // Generate a safe class for the logo background
            const logoClass = `logo-${(startup.category || 'other').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

            card.innerHTML = `
                <div class="startup-logo ${logoClass}">${startup.logo || '🚀'}</div>
                <div class="startup-details">
                    <h3>${startup.name}</h3>
                    <p>${startup.description || 'No description provided.'}</p>
                    <div class="tags-container">${tagsHTML}</div>
                </div>
                <div class="startup-actions">
                    ${approvalButtonsHTML}
                    <button class="icon-btn edit-btn" title="Edit in Full Editor"><i class="fa-solid fa-pencil"></i></button>
                    <button class="icon-btn delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            startupList.appendChild(card);
        });
        
        attachActionListeners();
    };

    function tagsHTMLFromList(tags) {
        return tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    }

    // --- Action Listeners ---
    const attachActionListeners = () => {
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = e.target.closest('.startup-card').dataset.id;
                approveStartup(id);
            });
        });
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = e.target.closest('.startup-card').dataset.id;
                rejectStartup(id);
            });
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = e.target.closest('.startup-card').dataset.id;
                openViewEditModal(id);
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = e.target.closest('.startup-card').dataset.id;
                deleteStartup(id);
            });
        });
        
        // Make entire card clickable to view
        document.querySelectorAll('.startup-card').forEach(card => {
            card.addEventListener('click', e => {
                // Don't trigger if clicking on action buttons
                if (!e.target.closest('.startup-actions')) {
                    const id = card.dataset.id;
                    openViewEditModal(id);
                }
            });
            card.style.cursor = 'pointer';
        });
    };

    // --- Actions ---
    const approveStartup = (id) => {
        if (!confirm("Approve this project? It will become visible on the public website.")) return;
        
        // Load pending
        let pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        const projectIndex = pending.findIndex(s => String(s.id) === String(id));
        
        if (projectIndex !== -1) {
            const project = pending[projectIndex];
            project.status = 'active'; // Change status
            
            // Add to active list
            let active = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            active.push(project);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
            
            // Remove from pending
            pending.splice(projectIndex, 1);
            localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
            
            renderStartups();
        }
    };

    const rejectStartup = (id) => {
        if (!confirm("Reject this project? It will be removed from the pending list.")) return;

        let pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        const newPending = pending.filter(s => String(s.id) !== String(id));
        localStorage.setItem(PENDING_KEY, JSON.stringify(newPending));
        
        renderStartups();
    };

    const deleteStartup = (id) => {
        if (!confirm('Are you sure you want to permanently delete this startup?')) return;

        // Check both lists
        let active = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        let pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        
        const newActive = active.filter(s => String(s.id) !== String(id));
        const newPending = pending.filter(s => String(s.id) !== String(id));
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newActive));
        localStorage.setItem(PENDING_KEY, JSON.stringify(newPending));
        
        renderStartups();
    };

    // --- View/Edit Modal Functions ---
    let currentEditingId = null;

    const openViewEditModal = (id) => {
        currentEditingId = id;
        
        // Find startup in both lists
        let startup = startupsData.find(s => String(s.id) === String(id));
        
        if (!startup) {
            console.error('❌ Startup not found with ID:', id);
            alert('Startup not found');
            return;
        }


        // Populate form
        document.getElementById('edit-name').value = startup.name || startup.title || '';
        document.getElementById('edit-logo').value = startup.logo || '🚀';
        document.getElementById('edit-category').value = startup.category || startup.industry || '';
        document.getElementById('edit-trl').value = startup.trl || '';
        document.getElementById('edit-status').value = startup.status || 'pending';
        document.getElementById('edit-collab').checked = startup.collab || false;
        document.getElementById('edit-description').value = startup.description || startup.shortDescription || '';
        document.getElementById('edit-detailed-description').value = startup.detailedDescription || '';
        document.getElementById('edit-problem-statement').value = startup.problemStatement || '';
        document.getElementById('edit-solution').value = startup.solution || '';
        document.getElementById('edit-start-date').value = startup.startDate || '';
        document.getElementById('edit-team-size').value = startup.teamSize || '';
        document.getElementById('edit-website').value = startup.website || '';
        document.getElementById('edit-founder-name').value = startup.founderName || '';
        document.getElementById('edit-founder-role').value = startup.founderRole || '';
        document.getElementById('edit-founder-email').value = startup.founderEmail || '';
        document.getElementById('edit-founder-phone').value = startup.founderPhone || '';
        document.getElementById('edit-founder-affiliation').value = startup.founderAffiliation || '';

        // Populate SDGs
        const sdgCheckboxes = document.querySelectorAll('#edit-sdgs-container input[type="checkbox"]');
        sdgCheckboxes.forEach(cb => cb.checked = false);
        if (startup.sdgs && Array.isArray(startup.sdgs)) {
            startup.sdgs.forEach(sdg => {
                const checkbox = document.querySelector(`#edit-sdgs-container input[value="${sdg}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Display images
        const imagesPreview = document.getElementById('edit-images-preview');
        imagesPreview.innerHTML = '';
        if (startup.imageUrls && Array.isArray(startup.imageUrls) && startup.imageUrls.length > 0) {
            startup.imageUrls.forEach((url, index) => {
                if (url) {
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'preview-image-item';
                    imgDiv.innerHTML = `
                        <img src="${url}" alt="Project image ${index + 1}">
                        <div class="preview-image-label">${index === 0 ? 'Cover Image' : `Image ${index + 1}`}</div>
                    `;
                    imagesPreview.appendChild(imgDiv);
                }
            });
        } else {
            imagesPreview.innerHTML = '<p style="color: var(--text-light); padding: 20px; text-align: center;">No images uploaded</p>';
        }

        // Show modal
        const modal = document.getElementById('startup-modal-overlay');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('modal-title').textContent = `Edit Startup: ${startup.name || startup.title}`;
        } else {
            console.error('❌ Modal element not found!');
        }
    };

    const closeModal = () => {
        const modal = document.getElementById('startup-modal-overlay');
        if (modal) {
            modal.style.display = 'none';
        }
        currentEditingId = null;
    };

    const saveStartupChanges = (e) => {
        e.preventDefault();

        if (!currentEditingId) return;

        // Collect form data
        const updatedData = {
            name: document.getElementById('edit-name').value,
            title: document.getElementById('edit-name').value, // Keep both for compatibility
            logo: document.getElementById('edit-logo').value || '🚀',
            category: document.getElementById('edit-category').value,
            industry: document.getElementById('edit-category').value, // Keep both for compatibility
            trl: parseInt(document.getElementById('edit-trl').value) || 0,
            status: document.getElementById('edit-status').value,
            collab: document.getElementById('edit-collab').checked,
            description: document.getElementById('edit-description').value,
            shortDescription: document.getElementById('edit-description').value, // Keep both
            detailedDescription: document.getElementById('edit-detailed-description').value,
            problemStatement: document.getElementById('edit-problem-statement').value,
            solution: document.getElementById('edit-solution').value,
            startDate: document.getElementById('edit-start-date').value,
            teamSize: document.getElementById('edit-team-size').value,
            website: document.getElementById('edit-website').value,
            founderName: document.getElementById('edit-founder-name').value,
            founderRole: document.getElementById('edit-founder-role').value,
            founderEmail: document.getElementById('edit-founder-email').value,
            founderPhone: document.getElementById('edit-founder-phone').value,
            founderAffiliation: document.getElementById('edit-founder-affiliation').value,
        };

        // Collect SDGs
        const selectedSdgs = Array.from(document.querySelectorAll('#edit-sdgs-container input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        updatedData.sdgs = selectedSdgs;

        // Find and update in appropriate storage
        let active = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        let pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');

        const activeIndex = active.findIndex(s => String(s.id) === String(currentEditingId));
        const pendingIndex = pending.findIndex(s => String(s.id) === String(currentEditingId));

        if (activeIndex !== -1) {
            // Update in active list, preserve existing data
            active[activeIndex] = { ...active[activeIndex], ...updatedData };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
        } else if (pendingIndex !== -1) {
            // Update in pending list, preserve existing data
            pending[pendingIndex] = { ...pending[pendingIndex], ...updatedData };
            localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        }

        closeModal();
        renderStartups();
        
        alert('Startup updated successfully!');
    };

    // --- Initialize Modal Event Listeners ---
    const initializeModalListeners = () => {
        const closeBtn = document.getElementById('close-modal-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        const form = document.getElementById('startup-form');
        const overlay = document.getElementById('startup-modal-overlay');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        if (form) {
            form.addEventListener('submit', saveStartupChanges);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target.id === 'startup-modal-overlay') {
                    closeModal();
                }
            });
        }
    };

    // --- OLD: Open Add/Edit Pages in New Tabs (kept for Add button) ---

    const editStartup = (id) => {
        // This function is no longer used for editing, but kept for compatibility
        // Now we use openViewEditModal instead
        window.open(`../ucolab/edit-project.html?id=${id}`, '_blank');
    };

    addStartupBtn.addEventListener('click', () => {
        // Open the UCoLab submit page in a new tab
        window.open('../ucolab/submit-project.html', '_blank');
    });

    // --- Search & Filter ---
    searchInput.addEventListener('input', renderStartups);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderStartups();
        });
    });
    sortDropdown.addEventListener('change', renderStartups);

    // --- Auto-Reload on Window Focus ---
    // This ensures that if the user saves changes in the other tab, this list updates when they come back.
    window.addEventListener('focus', () => {
        renderStartups();
    });

    // --- Initialize Everything ---
    initializeModalListeners();
    
    // Initial Render
    renderStartups();
    
});
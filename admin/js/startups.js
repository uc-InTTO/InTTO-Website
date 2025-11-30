document.addEventListener('DOMContentLoaded', () => {
    // --- Admin Helpers: Lazy loading & notifications ---
    const _lazy = { imageCompressor: false, cropper: false, cloudinary: false };

    function loadScript(url, id) {
        return new Promise((resolve, reject) => {
            if (id && document.getElementById(id)) return resolve();
            const s = document.createElement('script');
            if (id) s.id = id;
            s.src = url;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load script: ' + url));
            document.head.appendChild(s);
        });
    }

    function loadStyle(url, id) {
        return new Promise((resolve, reject) => {
            if (id && document.getElementById(id)) return resolve();
            const l = document.createElement('link');
            if (id) l.id = id;
            l.rel = 'stylesheet';
            l.href = url;
            l.onload = () => resolve();
            l.onerror = () => reject(new Error('Failed to load style: ' + url));
            document.head.appendChild(l);
        });
    }

    function notify(msg, type = 'info', seconds = 4) {
        // Minimal toast - non-blocking feedback for admin actions
        let container = document.getElementById('admin-notice-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'admin-notice-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.className = `admin-notice admin-notice-${type}`;
        el.textContent = msg;
        el.style.marginBottom = '8px';
        el.style.padding = '8px 12px';
        el.style.borderRadius = '8px';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        el.style.background = type === 'error' ? '#f8d7da' : (type === 'success' ? '#d1e7dd' : '#e2e3e5');
        el.style.color = type === 'error' ? '#842029' : (type === 'success' ? '#0f5132' : '#333');
        container.appendChild(el);
        setTimeout(() => { el.remove(); }, seconds * 1000);
    }

    async function loadImageCompressorIfNeeded() {
        if (_lazy.imageCompressor) return;
        try {
            // If image-compressor is globally available, mark as loaded
            if (typeof window.ImageCompressor !== 'undefined') {
                _lazy.imageCompressor = true;
                return;
            }
            await loadScript('../ucolab/js/image-compressor.js', 'image-compressor-js');
            _lazy.imageCompressor = true;
        } catch (err) {
            // Graceful fallback: compressor not critical; allow original file
            notify('Could not load client-side compressor; proceeding without compression', 'error');
            _lazy.imageCompressor = false;
        }
    }

    async function loadCropperIfNeeded() {
        if (_lazy.cropper) return;
        try {
            if (typeof window.Cropper !== 'undefined') { _lazy.cropper = true; return; }
            await loadStyle('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css', 'cropper-css');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js', 'cropper-js');
            _lazy.cropper = true;
        } catch (err) {
            notify('Could not load Cropper.js; cropping will be unavailable', 'error');
            _lazy.cropper = false;
        }
    }

    async function loadCloudinaryIfNeeded() {
        if (_lazy.cloudinary) return;
        try {
            // Widget script may already be present in HTML; otherwise load
            if (typeof window.cloudinary !== 'undefined') { _lazy.cloudinary = true; return; }
            await loadScript('https://widget.cloudinary.com/v2.0/global/all.js', 'cloudinary-widget-js');
            _lazy.cloudinary = true;
        } catch (err) {
            notify('Could not load Cloudinary widget; uploading may fail', 'error');
            _lazy.cloudinary = false;
        }
    }

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
        // Populate hidden inputs for image URLs (used when saving)
        const editImageUrlsHidden = document.getElementById('edit-image-urls');
        if (editImageUrlsHidden) {
            editImageUrlsHidden.value = startup.imageUrls && Array.isArray(startup.imageUrls) ? JSON.stringify(startup.imageUrls) : JSON.stringify([]);
        }
        const editLogoHidden = document.getElementById('edit-logo-url');
        const editLogoText = document.getElementById('edit-logo');
        if (editLogoHidden) editLogoHidden.value = startup.logo || '';
        if (editLogoText && (!startup.logo || startup.logo.startsWith('http') || startup.logo.startsWith('https'))) editLogoText.value = startup.logo || '';

        // Show modal
        const modal = document.getElementById('startup-modal-overlay');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('modal-title').textContent = `Edit Startup: ${startup.name || startup.title}`;
        } else {
            console.error('❌ Modal element not found!');
        }
    };

    // --- Image compression & Cloudinary upload helpers for admin ---
    async function blobFromCanvas(canvas, mimeType, quality) {
        if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
            return await canvas.convertToBlob({ type: mimeType, quality });
        }
        return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), mimeType, quality));
    }

    async function compressImageToTarget(file, targetKB = 50, options = { maxWidth: 1200, minQuality: 0.12, qualityStep: 0.07, scaleStep: 0.9 }) {
        if (!file) return file;
        if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size <= targetKB * 1024) return file;
        const useWebP = file.type === 'image/png' || file.type === 'image/webp';
        const targetType = useWebP ? 'image/webp' : 'image/jpeg';

        // create bitmap or fallback image
        let bitmap = null;
        let imgEl = null;
        if (typeof createImageBitmap === 'function') {
            try { bitmap = await createImageBitmap(file); } catch (e) { bitmap = null; }
        }
        let tmpObjectUrl = null;
        if (!bitmap) {
            tmpObjectUrl = URL.createObjectURL(file);
            imgEl = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = tmpObjectUrl; });
        }

        let width = Math.min(options.maxWidth, bitmap ? bitmap.width : imgEl.width);
        let height = Math.round((bitmap ? bitmap.height : imgEl.height) / (bitmap ? bitmap.width : imgEl.width) * width);
        let quality = 0.92;
        let bestBlob = null;

        while (true) {
            let canvas;
            if (typeof OffscreenCanvas !== 'undefined') {
                canvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
            } else {
                canvas = document.createElement('canvas');
                canvas.width = Math.max(1, width);
                canvas.height = Math.max(1, height);
            }
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (bitmap) ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            else if (imgEl) ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

            const blob = await blobFromCanvas(canvas, targetType, quality);
            if (blob) {
                bestBlob = blob;
                if (blob.size <= targetKB * 1024) {
                    const ext = targetType === 'image/webp' ? '.webp' : '.jpg';
                    bitmap && bitmap.close && bitmap.close();
                    tmpObjectUrl && URL.revokeObjectURL(tmpObjectUrl);
                    return new File([blob], file.name.replace(/\.[^/.]+$/, ext), { type: targetType });
                }
            }

            if (quality > options.minQuality + 0.01) { quality = Math.max(options.minQuality, quality - options.qualityStep); continue; }

            const newWidth = Math.round(width * options.scaleStep);
            if (newWidth < 64) {
                bitmap && bitmap.close && bitmap.close();
                tmpObjectUrl && URL.revokeObjectURL(tmpObjectUrl);
                if (bestBlob) return new File([bestBlob], file.name.replace(/\.[^/.]+$/, targetType === 'image/webp' ? '.webp' : '.jpg'), { type: targetType });
                return file;
            }
            width = newWidth;
            height = Math.max(1, Math.round((bitmap ? bitmap.height : imgEl.height) / (bitmap ? bitmap.width : imgEl.width) * width));
            quality = 0.9;
        }
    }

    async function uploadCompressedImageToCloudinary(file) {
        // Use global constants defined in HTML: CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(url, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Cloudinary upload failed');
        return data.secure_url;
    }

    // Setup handlers to upload and compress when admin selects files
    function setupAdminImageUploadHandlers() {
        const imagesInput = document.getElementById('edit-images-file');
        const logoInput = document.getElementById('edit-logo-file');
        const imagesPreview = document.getElementById('edit-images-preview');
        const editImageUrlsHidden = document.getElementById('edit-image-urls');
        const editLogoHidden = document.getElementById('edit-logo-url');

        if (imagesInput) {
            imagesInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files || []).slice(0, 10); // cap at 10
                imagesPreview.innerHTML = '';
                const uploadedUrls = [];
                for (let i = 0; i < files.length; i++) {
                    const f = files[i];
                    try {
                        // Lazy-load heavy resources only when needed
                        await Promise.all([loadImageCompressorIfNeeded(), loadCloudinaryIfNeeded()]);
                        const compressed = await compressImageToTarget(f, 50);
                        const url = await uploadCompressedImageToCloudinary(compressed);
                        uploadedUrls.push(url);

                        const div = document.createElement('div');
                        div.className = 'preview-image-item';
                        div.innerHTML = `<img src="${url}" alt="Image ${i+1}"><div class="preview-image-label">Image ${i+1}</div>`;
                        imagesPreview.appendChild(div);
                    } catch (err) {
                        notify('Image upload failed: ' + (err.message || err), 'error');
                    }
                }
                if (editImageUrlsHidden) editImageUrlsHidden.value = JSON.stringify(uploadedUrls);
            });
        }

        if (logoInput) {
            logoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    await Promise.all([loadImageCompressorIfNeeded(), loadCloudinaryIfNeeded()]);
                    const compressed = await compressImageToTarget(file, 50);
                    const url = await uploadCompressedImageToCloudinary(compressed);
                    // Update hidden and preview (update text input as well)
                    const editLogoText = document.getElementById('edit-logo');
                    if (editLogoHidden) editLogoHidden.value = url;
                    if (editLogoText) editLogoText.value = url;
                    // Show preview if element exists
                    let logoPreview = document.getElementById('edit-logo-preview');
                    if (!logoPreview) {
                        logoPreview = document.createElement('img');
                        logoPreview.id = 'edit-logo-preview';
                        logoPreview.style.maxWidth = '120px';
                        const container = document.querySelector('#edit-logo').closest('.form-group');
                        container && container.appendChild(logoPreview);
                    }
                    logoPreview.src = url;
                } catch (err) {
                    notify('Logo upload failed: ' + (err.message || err), 'error');
                }
            });
        }
    }

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

        // Replace images array if admin uploaded new ones during editing
        const editImageUrlsHidden = document.getElementById('edit-image-urls');
        if (editImageUrlsHidden && editImageUrlsHidden.value) {
            try {
                const parsed = JSON.parse(editImageUrlsHidden.value);
                if (Array.isArray(parsed)) updatedData.imageUrls = parsed;
            } catch (e) {
                // ignore malformed value
            }
        }

        // Replace logo if admin uploaded a new one
        const editLogoHidden = document.getElementById('edit-logo-url');
        if (editLogoHidden && editLogoHidden.value) {
            updatedData.logo = editLogoHidden.value;
        }

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
        // Setup admin image upload handlers for modal inputs
        setupAdminImageUploadHandlers();
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
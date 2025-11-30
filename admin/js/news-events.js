document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'ucInttoNewsEventsData';

    // --- Global State for Images ---
    // Note: Image handling is mostly done in the form page now, 
    // but we initialize this array just in case needed for defaults.
    let uploadedImageUrls = ["", "", "", "", ""]; 

    // Default data
    const defaultNewsEvents = [
        { id: 1, title: "InTTO Hosts Innovation Week 2024", type: "event", status: "published", date: "2024-11-01", tags: ["Innovation Week", "Event"], content: "Join us for a week-long celebration...", sdgs: ["9", "17"], images: [] }, 
        { id: 2, title: "New Partnership with DOST Region CAR", type: "news", status: "published", date: "2024-10-15", tags: ["Partnership", "DOST"], content: "UC InTTO announces strategic partnership...", sdgs: ["17"], images: [] },
        { id: 3, title: "IP Protection Workshop", type: "event", status: "draft", date: "2024-11-15", tags: ["Workshop", "IP", "TTO"], content: "Learn about IP protection...", sdgs: ["4", "9"], images: [] }, 
        { id: 4, title: "Seed Funding Opportunity", type: "news", status: "published", date: "2024-09-20", tags: ["Funding", "Startup"], content: "New seed funding program...", sdgs: ["8"], images: [] } 
    ];

    const loadData = () => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        return savedData ? JSON.parse(savedData) : defaultNewsEvents;
    };

    const saveData = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newsEventsData));
    };

    let newsEventsData = loadData();

    // --- DOM Elements ---
    const newsEventList = document.getElementById('news-event-list');
    const searchInput = document.getElementById('search-input');
    const typeFilters = document.getElementById('news-event-type-filters');
    const addNewsEventBtn = document.getElementById('add-news-event-btn');
    const sortDropdown = document.getElementById('sort-news');

    // --- Lazy loaders for Cropper ---
    async function loadScript(url, id) {
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
    async function loadStyle(url, id) {
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
    async function loadCropperIfNeeded() {
        if (typeof window.Cropper !== 'undefined') return;
        try {
            await loadStyle('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css', 'cropper-css');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js', 'cropper-js');
        } catch (err) {
            console.warn('Failed to load Cropper.js:', err);
            throw err;
        }
    }

    // --- News Events Cropper Modal (UI-only) ---
    let newsCropperInstance = null;
    let newsCropperModalEl = null;
    let newsCropperImageEl = null;
    let newsCropperDeferred = null;
    let newsCropperCurrentFile = null;
    let newsCropperCurrentPreview = null;
    let newsCropperOpts = null;

    (function initNewsCropperModal() {
        const modal = document.createElement('div');
        modal.id = 'news-cropper-modal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.left = '0'; modal.style.top = '0';
        modal.style.width = '100%'; modal.style.height = '100%';
        modal.style.background = 'rgba(0,0,0,0.6)'; modal.style.zIndex = 9999;
        modal.innerHTML = `
            <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:90%; max-width:900px; background:white; padding:18px; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong>Crop & Reposition</strong>
                    <div>
                        <button id="news-cropper-rotate-left">⟲</button>
                        <button id="news-cropper-rotate-right">⟳</button>
                        <button id="news-cropper-skip">Skip</button>
                        <button id="news-cropper-apply">Apply</button>
                        <button id="news-cropper-close">Close</button>
                    </div>
                </div>
                <div style="width:100%; height:60vh; display:flex; justify-content:center; align-items:center; overflow:hidden;">
                    <img id="news-cropper-image" style="max-width:100%; max-height:100%; display:block;" />
                </div>
            </div>`;
        document.body.appendChild(modal);
        newsCropperModalEl = modal;
        newsCropperImageEl = document.getElementById('news-cropper-image');

        modal.querySelector('#news-cropper-apply').addEventListener('click', async () => {
            if (!newsCropperInstance) return;
            try {
                const canvas = newsCropperInstance.getCroppedCanvas({ fillColor: '#ffffff' });
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
                const file = new File([blob], newsCropperCurrentFile.name, { type: 'image/jpeg' });
                // If an ImageCompressor is available, compress using it
                let compressedFile = file;
                try { if (typeof ImageCompressor?.compressImage === 'function') compressedFile = await ImageCompressor.compressImage(file, 50); } catch (e) {}
                // Resolve with result: { file, blob, dataUrl }
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (newsCropperCurrentPreview) {
                        newsCropperCurrentPreview.src = e.target.result;
                        newsCropperCurrentPreview.style.display = 'block';
                    }
                    if (newsCropperDeferred) newsCropperDeferred.resolve({ file: compressedFile, blob, dataUrl: e.target.result });
                };
                reader.readAsDataURL(compressedFile);
            } catch (err) {
                if (newsCropperDeferred) newsCropperDeferred.reject(err);
            } finally {
                try { newsCropperInstance && newsCropperInstance.destroy(); } catch(e) {}
                newsCropperInstance = null; newsCropperModalEl.style.display = 'none'; newsCropperCurrentFile = null; newsCropperCurrentPreview = null; newsCropperOpts = null; newsCropperDeferred = null;
            }
        });

        modal.querySelector('#news-cropper-skip').addEventListener('click', async () => {
            if (!newsCropperCurrentFile) return;
            try {
                // Return original file (optionally compress)
                let uploadFile = newsCropperCurrentFile;
                try { if (typeof ImageCompressor?.compressImage === 'function') uploadFile = await ImageCompressor.compressImage(uploadFile, 50); } catch (e) {}
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (newsCropperCurrentPreview) {
                        newsCropperCurrentPreview.src = e.target.result; newsCropperCurrentPreview.style.display = 'block';
                    }
                    if (newsCropperDeferred) newsCropperDeferred.resolve({ file: uploadFile, blob: uploadFile, dataUrl: e.target.result });
                };
                reader.readAsDataURL(uploadFile);
            } catch (err) {
                if (newsCropperDeferred) newsCropperDeferred.reject(err);
            } finally {
                try { newsCropperInstance && newsCropperInstance.destroy(); } catch(e) {}
                newsCropperInstance = null; newsCropperModalEl.style.display = 'none'; newsCropperCurrentFile = null; newsCropperCurrentPreview = null; newsCropperOpts = null; newsCropperDeferred = null;
            }
        });

        modal.querySelector('#news-cropper-close').addEventListener('click', () => {
            if (newsCropperDeferred) newsCropperDeferred.resolve({ file: null });
            try { newsCropperInstance && newsCropperInstance.destroy(); } catch(e) {}
            newsCropperInstance = null; newsCropperModalEl.style.display = 'none'; newsCropperCurrentFile = null; newsCropperCurrentPreview = null; newsCropperOpts = null; newsCropperDeferred = null;
        });

        modal.querySelector('#news-cropper-rotate-left').addEventListener('click', () => { if (newsCropperInstance) newsCropperInstance.rotate(-90); });
        modal.querySelector('#news-cropper-rotate-right').addEventListener('click', () => { if (newsCropperInstance) newsCropperInstance.rotate(90); });
    })();

    /**
     * Open the cropper modal for the news-event flow.
     * @param {File} file
     * @param {HTMLImageElement} previewEl - optional image element to update with result
     * @param {Object} opts - { aspectRatio: number | null }
     * @returns {Promise<{file:File|null, blob:Blob|null, dataUrl:string|null}>}
     */
    async function openNewsCropperModal(file, previewEl = null, opts = { aspectRatio: null }) {
        await loadCropperIfNeeded();
        return new Promise((resolve, reject) => {
            newsCropperDeferred = { resolve, reject };
            newsCropperCurrentFile = file;
            newsCropperCurrentPreview = previewEl;
            newsCropperOpts = opts;
            const reader = new FileReader();
            reader.onload = function(e) {
                newsCropperImageEl.src = e.target.result;
                newsCropperModalEl.style.display = 'block';
                newsCropperImageEl.onload = () => {
                    try { newsCropperInstance && newsCropperInstance.destroy(); } catch(e) {}
                    newsCropperInstance = new Cropper(newsCropperImageEl, {
                        viewMode: 1,
                        background: false,
                        autoCropArea: 1,
                        movable: true,
                        zoomable: true,
                        scalable: true,
                        cropBoxResizable: true,
                        aspectRatio: opts.aspectRatio || null
                    });
                };
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    // --- Render List ---
    const renderNewsEvents = () => {
        // Reload data to catch updates from other tabs
        newsEventsData = loadData();

        const searchTerm = searchInput.value.toLowerCase();
        // Check if filter exists, default to 'all' if not found
        const activeBtn = document.querySelector('.type-filters .filter-btn.active');
        const activeTypeFilter = activeBtn ? activeBtn.dataset.filter : 'all';

        let filteredData = newsEventsData.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm) ||
                                item.content.toLowerCase().includes(searchTerm);
            const matchesType = activeTypeFilter === 'all' || item.type === activeTypeFilter;
            return matchesSearch && matchesType;
        });
        
        const sortValue = sortDropdown.value;
        if (sortValue === 'recent') filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
        else if (sortValue === 'oldest') filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
        else if (sortValue === 'a-z') filteredData.sort((a, b) => a.title.localeCompare(b.title));
        else if (sortValue === 'z-a') filteredData.sort((a, b) => b.title.localeCompare(a.title));

        newsEventList.innerHTML = '';
        if (filteredData.length === 0) {
            newsEventList.innerHTML = '<p style="text-align: center; color: var(--text-light); margin-top: 30px;">No news or events found.</p>';
            return;
        }

        filteredData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-event-card';
            card.dataset.id = item.id;
            
            // Use uploaded image or fallback
            const imgUrl = (item.images && item.images.length > 0) ? item.images[0] : 'https://via.placeholder.com/150?text=No+Image';
            // Handle SDG tags safely (ensure it's an array)
            const sdgs = Array.isArray(item.sdgs) ? item.sdgs : [];
            const sdgTags = sdgs.map(s => `<span class="tag tag-sdg">SDG ${s}</span>`).join('');

            card.innerHTML = `
                <div class="card-img" style="width: 120px; height: 120px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150?text=Error'">
                </div>
                <div class="card-content">
                    <h3>${item.title}</h3>
                    <p class="description">${item.content.substring(0, 120)}...</p>
                    <div class="meta-tags">
                        <span class="tag type-${item.type}">${item.type.toUpperCase()}</span>
                        <span class="tag status-${item.status}">${item.status}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${item.date}</span>
                        ${sdgTags}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="action-btn edit-btn" title="Edit"><i class="fa-solid fa-pencil"></i></button>
                    <button class="action-btn delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            newsEventList.appendChild(card);
        });
        attachActionListeners();
    };

    const attachActionListeners = () => {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', e => editNewsEvent(parseInt(e.target.closest('.news-event-card').dataset.id)));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', e => deleteNewsEvent(parseInt(e.target.closest('.news-event-card').dataset.id)));
        });
    };

    // --- 5. NEW: Open New Tabs for Actions ---

    const editNewsEvent = (id) => {
        // Open the dedicated form page with the ID parameter
        window.open(`news-event-form.html?id=${id}`, '_blank'); 
    };

    const deleteNewsEvent = (id) => {
        if (confirm('Are you sure you want to delete this item?')) {
            newsEventsData = newsEventsData.filter(i => i.id !== id);
            saveData();
            renderNewsEvents();
        }
    };

    if (addNewsEventBtn) {
        addNewsEventBtn.addEventListener('click', () => {
            // Open the dedicated form page for a new entry
            window.open('news-event-form.html', '_blank');
        });
    }

    if (searchInput) searchInput.addEventListener('input', renderNewsEvents);
    
    if (typeFilters) {
        typeFilters.addEventListener('click', (e) => {
            if(e.target.classList.contains('filter-btn')) {
                const currentActive = document.querySelector('.type-filters .active');
                if(currentActive) currentActive.classList.remove('active');
                e.target.classList.add('active');
                renderNewsEvents();
            }
        });
    }
    
    if (sortDropdown) sortDropdown.addEventListener('change', renderNewsEvents);
    
    // Auto-refresh when tab comes back into focus
    // This ensures updates made in the form tab appear here immediately
    window.addEventListener('focus', () => {
        renderNewsEvents();
    });

    // Initial Render
    renderNewsEvents();
});
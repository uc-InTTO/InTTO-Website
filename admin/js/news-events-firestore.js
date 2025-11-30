document.addEventListener('DOMContentLoaded', async () => {
    const NEWS_EVENTS_COLLECTION = 'newsEvents';
    
    let uploadedImageUrls = ["", "", "", "", ""]; 
    let uploadingImages = [false, false, false, false, false];
    
    let newsEventsData = [];
    let currentEditingId = null;

    const newsEventList = document.getElementById('news-event-list');
    const searchInput = document.getElementById('search-input');
    const typeFilters = document.getElementById('news-event-type-filters');
    const addNewsEventBtn = document.getElementById('add-news-event-btn');
    const sortDropdown = document.getElementById('sort-news');
    const modalOverlay = document.getElementById('news-event-modal-overlay');
    const closeModalBtn = document.getElementById('close-news-event-modal-btn');
    const cancelBtn = document.getElementById('cancel-news-event-btn');
    const newsEventForm = document.getElementById('news-event-form');
    const modalTitle = document.getElementById('news-event-modal-title');

    const loadNewsEventsFromFirestore = async (forceRefresh = false) => {
        const CACHE_KEY = 'admin_news_events';
        const CACHE_EXPIRY = 5 * 60 * 1000; 
        let cached = localStorage.getItem(CACHE_KEY);
        let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
        let now = Date.now();

        if (!forceRefresh && cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            newsEventsData = JSON.parse(cached);
            return newsEventsData;
        }

        try {
            if (!db) {
                throw new Error('Database not initialized');
            }
            
            const snapshot = await db.collection(NEWS_EVENTS_COLLECTION).get();
            
            newsEventsData = [];
            snapshot.forEach(doc => {
                newsEventsData.push({
                    firestoreId: doc.id,
                    ...doc.data()
                });
            });

            localStorage.setItem(CACHE_KEY, JSON.stringify(newsEventsData));
            localStorage.setItem(CACHE_KEY + '_time', now);
            
            return newsEventsData;
        } catch (error) {
            newsEventList.innerHTML = `<div style="text-align: center; padding: 40px; color: #e74c3c; font-family: 'Poppins', sans-serif;">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px;"></i>
                <p style="margin-top: 16px; font-weight: 500;">Error loading news & events</p>
                <p style="margin-top: 8px; font-size: 14px; color: var(--text-light);">${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 16px; font-family: 'Poppins', sans-serif;">
                    <i class="fa-solid fa-refresh"></i> Retry
                </button>
            </div>`;
            return [];
        }
    };

    // --- Image compression helpers ---
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

        let bitmap = null;
        let imgEl = null;
        if (typeof createImageBitmap === 'function') {
            try { bitmap = await createImageBitmap(file); } catch (e) { bitmap = null; }
        }
        let tmpObjectUrl = null;
        if (!bitmap) {
            tmpObjectUrl = URL.createObjectURL(file);
            imgEl = await new Promise((resolve, reject) => {
                const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = tmpObjectUrl;
            });
        }

        let width = Math.min(options.maxWidth, bitmap ? bitmap.width : imgEl.width);
        let height = Math.round((bitmap ? bitmap.height : imgEl.height) / (bitmap ? bitmap.width : imgEl.width) * width);
        let quality = 0.92;
        let bestBlob = null;

        while (true) {
            let canvas;
            if (typeof OffscreenCanvas !== 'undefined') canvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
            else { canvas = document.createElement('canvas'); canvas.width = Math.max(1, width); canvas.height = Math.max(1, height); }
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
                bitmap && bitmap.close && bitmap.close(); tmpObjectUrl && URL.revokeObjectURL(tmpObjectUrl);
                if (bestBlob) return new File([bestBlob], file.name.replace(/\.[^/.]+$/, targetType === 'image/webp' ? '.webp' : '.jpg'), { type: targetType });
                return file;
            }
            width = newWidth;
            height = Math.max(1, Math.round((bitmap ? bitmap.height : imgEl.height) / (bitmap ? bitmap.width : imgEl.width) * width));
            quality = 0.9;
        }
    }

    // --- Helpers for lazy-loading Cropper ---
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

    const saveNewsEventToFirestore = async (newsEventData) => {
        try {
            newsEventData.createdAt = newsEventData.createdAt || firebase.firestore.Timestamp.now();
            newsEventData.updatedAt = firebase.firestore.Timestamp.now();
            
            const docRef = await db.collection(NEWS_EVENTS_COLLECTION).add(newsEventData);
            return docRef.id;
        } catch (error) {
            throw error;
        }
    };

    const updateNewsEventInFirestore = async (firestoreId, updatedData) => {
        try {
            updatedData.updatedAt = firebase.firestore.Timestamp.now();
            await db.collection(NEWS_EVENTS_COLLECTION).doc(firestoreId).update(updatedData);
        } catch (error) {
            throw error;
        }
    };

    const deleteNewsEventFromFirestore = async (firestoreId) => {
        try {
            await db.collection(NEWS_EVENTS_COLLECTION).doc(firestoreId).delete();
        } catch (error) {
            throw error;
        }
    };

    const renderNewsEvents = async (isLoading = false) => {
        if (isLoading) {
            newsEventList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light); font-family: \'Poppins\', sans-serif;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 32px;"></i><p style="margin-top: 16px;">Loading news & events...</p></div>';
            return;
        }
        
        const searchTerm = searchInput.value.toLowerCase();
        const activeBtn = document.querySelector('.type-filters .filter-btn.active');
        const activeTypeFilter = activeBtn ? activeBtn.dataset.filter : 'all';

        let filteredData = newsEventsData.filter(item => {
            const matchesSearch = (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                                (item.content && item.content.toLowerCase().includes(searchTerm));
            const matchesType = activeTypeFilter === 'all' || item.type === activeTypeFilter;
            return matchesSearch && matchesType;
        });
        
        const sortValue = sortDropdown.value;
        if (sortValue === 'recent') {
            filteredData.sort((a, b) => {
                const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                return dateB - dateA;
            });
        } else if (sortValue === 'oldest') {
            filteredData.sort((a, b) => {
                const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                return dateA - dateB;
            });
        } else if (sortValue === 'a-z') {
            filteredData.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortValue === 'z-a') {
            filteredData.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        }

        newsEventList.innerHTML = '';
        if (filteredData.length === 0) {
            newsEventList.innerHTML = '<p style="text-align: center; color: var(--text-light); margin-top: 30px; font-family: \'Poppins\', sans-serif;">No news or events found.</p>';
            return;
        }

        filteredData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-event-card';
            card.dataset.firestoreId = item.firestoreId;
            
            const imgUrl = (item.images && item.images.length > 0) ? item.images[0] : 'https://via.placeholder.com/150?text=No+Image';
            
            const sdgs = Array.isArray(item.sdgs) ? item.sdgs : [];
            const sdgTags = sdgs.map(s => `<span class="tag tag-sdg">SDG ${s}</span>`).join('');

            let displayDate = 'N/A';
            if (item.date) {
                if (typeof item.date === 'string') {
                    displayDate = item.date;
                } else if (item.date.toDate) {
                    displayDate = item.date.toDate().toISOString().split('T')[0];
                }
            }

            card.innerHTML = `
                <div class="card-img" style="width: 120px; height: 120px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150?text=Error'">
                </div>
                <div class="card-content" style="font-family: 'Poppins', sans-serif;">
                    <h3>${item.title || 'Untitled'}</h3>
                    <p class="description">${(item.content || '').substring(0, 120)}...</p>
                    <div class="meta-tags">
                        <span class="tag type-${item.type}">${(item.type || 'news').toUpperCase()}</span>
                        <span class="tag status-${item.status}">${item.status || 'draft'}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${displayDate}</span>
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
            btn.addEventListener('click', (e) => {
                const firestoreId = e.target.closest('.news-event-card').dataset.firestoreId;
                openEditModal(firestoreId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const firestoreId = e.target.closest('.news-event-card').dataset.firestoreId;
                await deleteNewsEvent(firestoreId);
            });
        });
    };

    const deleteNewsEvent = async (firestoreId) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        
        try {
            await deleteNewsEventFromFirestore(firestoreId);
            await loadNewsEventsFromFirestore(true);
            await renderNewsEvents();
            alert('News/Event deleted successfully');
        } catch (error) {
            alert('Error deleting news/event: ' + error.message);
        }
    };

    const openAddModal = () => {
        window.open('news-event-form.html', '_blank');
    };

    const openEditModal = (firestoreId) => {
        window.open(`news-event-form.html?id=${firestoreId}`, '_blank');
    };

    const closeModal = () => {
        modalOverlay.style.display = 'none';
        currentEditingId = null;
        uploadedImageUrls = ["", "", "", "", ""];
    };

    const initializeImageUploaders = () => {
        // Admin cropper variables
        let adminCropperModal = null;
        let adminCropperImageEl = null;
        let adminCropperInstance = null;
        let adminCurrentCropFile = null;
        let adminCurrentCropIndex = null;
        let adminCurrentCropPreview = null;

        function initAdminCropperModal() {
            if (adminCropperModal) return; // already initialized
            adminCropperModal = document.createElement('div');
            adminCropperModal.id = 'admin-news-event-cropper-modal';
            adminCropperModal.className = 'modal-hidden';
            adminCropperModal.style.position = 'fixed';
            adminCropperModal.style.left = '0'; adminCropperModal.style.top = '0';
            adminCropperModal.style.width = '100%'; adminCropperModal.style.height = '100%';
            adminCropperModal.style.background = 'rgba(0,0,0,0.6)'; adminCropperModal.style.zIndex = 9999;
            adminCropperModal.innerHTML = `
                <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:90%; max-width:900px; background:white; padding:18px; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <strong>Crop & Reposition</strong>
                        <div>
                            <button id="admin-cropper-rotate-left">⟲</button>
                            <button id="admin-cropper-rotate-right">⟳</button>
                            <button id="admin-cropper-skip">Skip</button>
                            <button id="admin-cropper-apply">Apply</button>
                            <button id="admin-cropper-close">Close</button>
                        </div>
                    </div>
                    <div style="width:100%; height:60vh; display:flex; justify-content:center; align-items:center; overflow:hidden;">
                        <img id="admin-cropper-image" style="max-width:100%; max-height:100%; display:block;" />
                    </div>
                </div>`;
            document.body.appendChild(adminCropperModal);
            adminCropperImageEl = document.getElementById('admin-cropper-image');

            adminCropperModal.addEventListener('click', async (e) => {
                if (e.target === adminCropperModal) {
                    // overlay click - act as skip
                    e.preventDefault();
                    const file = adminCurrentCropFile; const preview = adminCurrentCropPreview; const idx = adminCurrentCropIndex;
                    closeAdminCropperModal();
                    if (file && preview && idx !== null) await continueUploadAfterCrop(file, preview, idx);
                }
            });

            const closeBtn = adminCropperModal.querySelector('#admin-cropper-close');
            const applyBtn = adminCropperModal.querySelector('#admin-cropper-apply');
            const skipBtn = adminCropperModal.querySelector('#admin-cropper-skip');
            const rotL = adminCropperModal.querySelector('#admin-cropper-rotate-left');
            const rotR = adminCropperModal.querySelector('#admin-cropper-rotate-right');

            if (closeBtn) closeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const file = adminCurrentCropFile; const preview = adminCurrentCropPreview; const idx = adminCurrentCropIndex;
                closeAdminCropperModal();
                if (file && preview && idx !== null) await continueUploadAfterCrop(file, preview, idx);
            });
            if (skipBtn) skipBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const file = adminCurrentCropFile; const preview = adminCurrentCropPreview; const idx = adminCurrentCropIndex;
                closeAdminCropperModal();
                if (file && preview && idx !== null) await continueUploadAfterCrop(file, preview, idx);
            });
            if (applyBtn) applyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await applyAdminCropAndUpload();
            });
            if (rotL) rotL.addEventListener('click', () => { if (adminCropperInstance) adminCropperInstance.rotate(-90); });
            if (rotR) rotR.addEventListener('click', () => { if (adminCropperInstance) adminCropperInstance.rotate(90); });
        }

        async function openAdminCropper(file, preview, index) {
            // Ensure cropper lib is loaded
            try { await loadCropperIfNeeded(); } catch (err) { throw err; }
            if (!adminCropperModal) initAdminCropperModal();
            if (!adminCropperImageEl) return;
            adminCurrentCropFile = file; adminCurrentCropIndex = index; adminCurrentCropPreview = preview;
            try {
                const url = URL.createObjectURL(file);
                adminCropperImageEl.src = url;
                adminCropperModal.classList.remove('modal-hidden');
                adminCropperModal.style.display = 'block';
                if (adminCropperInstance) { try { adminCropperInstance.destroy(); } catch(e) {} adminCropperInstance = null; }
                const options = { viewMode: 1, autoCropArea: 0.8, movable: true, scalable: true, zoomable: true, responsive: true };
                if (index === 0) options.aspectRatio = 16 / 9;
                adminCropperInstance = new Cropper(adminCropperImageEl, options);
            } catch (e) {
                console.warn('Could not open admin cropper', e);
                // fallback
                await continueUploadAfterCrop(file, preview, index);
            }
        }

        function closeAdminCropperModal() {
            if (!adminCropperModal) return;
            adminCropperModal.classList.add('modal-hidden');
            adminCropperModal.style.display = 'none';
            if (adminCropperInstance) { try { adminCropperInstance.destroy(); } catch(e) {} adminCropperInstance = null; }
            if (adminCropperImageEl && adminCropperImageEl.src && adminCropperImageEl.src.startsWith('blob:')) { URL.revokeObjectURL(adminCropperImageEl.src); adminCropperImageEl.src = ''; }
            adminCurrentCropFile = null; adminCurrentCropIndex = null; adminCurrentCropPreview = null;
        }

        async function applyAdminCropAndUpload() {
            if (!adminCropperInstance || !adminCurrentCropFile || !adminCurrentCropPreview) return;
            const preview = adminCurrentCropPreview; const idx = adminCurrentCropIndex; const file = adminCurrentCropFile;
            try {
                const canvas = adminCropperInstance.getCroppedCanvas({ maxWidth: 1600, maxHeight: 1600, fillColor: '#ffffff' });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-cropped.jpg', { type: 'image/jpeg' });
                closeAdminCropperModal();
                await continueUploadAfterCrop(croppedFile, preview, idx);
            } catch (err) {
                console.warn('applyAdminCropAndUpload error', err);
                closeAdminCropperModal();
            }
        }

        async function continueUploadAfterCrop(file, previewElement, index) {
            const fileToUse = file;
            // Fallback: if previewElement is null, try find it by index
            if (!previewElement) {
                previewElement = document.getElementById(`image-preview-${index + 1}`);
                console.warn('[Uploader] previewElement was null; looked up by index', index + 1, previewElement);
            }
            const slot = previewElement ? previewElement.closest('.image-upload-slot') : null;
            const removeBtn = slot ? slot.querySelector('.remove-image-btn') : null;
            // Show preview of processed image
            try {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (previewElement) {
                        previewElement.src = e.target.result;
                        if (previewElement.classList) previewElement.classList.add('visible');
                        if (removeBtn) removeBtn.style.display = 'flex';
                    }
                };
                reader.readAsDataURL(fileToUse);
            } catch (err) {
                console.warn('preview read failed', err);
            }

            uploadingImages[index] = true;
            try {
                if (slot) slot.classList.add('uploading');
                let compressedFile = fileToUse;
                try { compressedFile = await compressImageToTarget(fileToUse, 50); } catch (err) { compressedFile = fileToUse; }
                const imageUrl = await CloudinaryUploader.uploadImage(compressedFile, index);
                uploadedImageUrls[index] = imageUrl;
            } catch (error) {
                alert(`Error uploading image ${index + 1}: ${error.message}`);
                uploadedImageUrls[index] = "";
            } finally {
                uploadingImages[index] = false;
                if (slot) slot.classList.remove('uploading');
            }
        }
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`image-upload-${i}`);
            const preview = document.getElementById(`image-preview-${i}`);
            
            if (input && preview) {
                input.addEventListener('change', async function() {
                    const file = this.files[0];
                    if (!file) return;

                    const index = i - 1;
                    const slot = preview.closest('.image-upload-slot');
                    const label = slot.querySelector('.upload-label');
                    const removeBtn = slot.querySelector('.remove-image-btn');

                    // Open Admin Cropper (if available) - falls back to direct upload
                    try {
                        // Lazy-load Cropper if needed
                        await loadCropperIfNeeded();
                        // We'll init the cropper modal inside this same scope so continueUploadAfterCrop is available
                        // Show cropper to match submit-project flow
                        await openAdminCropper(file, preview, index);
                    } catch (err) {
                        // If cropper load or operation fails, fallback to direct compress & upload
                        try {
                            let compressedFile = file;
                            try { compressedFile = await compressImageToTarget(file, 50); } catch (err2) { compressedFile = file; }
                            const reader = new FileReader();
                            reader.onload = function(e) {
                                preview.src = e.target.result;
                                preview.style.display = 'block';
                                label.style.display = 'none';
                                if (removeBtn) removeBtn.style.display = 'flex';
                            };
                            reader.readAsDataURL(compressedFile);
                            uploadingImages[index] = true;
                            try {
                                const cloudinaryUrl = await CloudinaryUploader.uploadImage(compressedFile, index);
                                uploadedImageUrls[index] = cloudinaryUrl;
                            } catch (error) {
                                alert(`Failed to upload image ${i}: ${error.message}`);
                                uploadedImageUrls[index] = "";
                            } finally {
                                uploadingImages[index] = false;
                            }
                        } catch (fallbackErr) {
                            console.warn('Crop/upload fallback failed', fallbackErr);
                        }
                    } finally {
                        uploadingImages[index] = false;
                    }
                });
            }
        }

        document.querySelectorAll('.remove-image-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const index = parseInt(this.dataset.index);
                const slot = this.closest('.image-upload-slot');
                const preview = slot.querySelector('.image-preview');
                const label = slot.querySelector('.upload-label');
                const input = slot.querySelector('.hidden-file-input');

                preview.src = '';
                preview.style.display = 'none';
                label.style.display = 'flex';
                this.style.display = 'none';
                input.value = '';
                uploadedImageUrls[index] = "";
            });
        });
    };

    

    const initializeSDGDropdown = () => {
        const dropdownBtn = document.getElementById('sdg-dropdown-btn');
        const checkboxList = document.getElementById('sdg-checkbox-list');
        const checkboxes = checkboxList.querySelectorAll('input[type="checkbox"]');

        dropdownBtn.addEventListener('click', () => {
            checkboxList.classList.toggle('visible');
            dropdownBtn.classList.toggle('open');
        });

        window.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) && !checkboxList.contains(e.target)) {
                checkboxList.classList.remove('visible');
                dropdownBtn.classList.remove('open');
            }
        });

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSDGPills);
        });
        
        checkboxList.querySelectorAll('.checkbox-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                    updateSDGPills();
                }
            });
        });
    };

    const updateSDGPills = () => {
        const pillsContainer = document.getElementById('sdg-selected-pills');
        const defaultText = document.querySelector('#sdg-dropdown-btn .dropdown-button-text');
        const checkboxes = document.querySelectorAll('#sdg-checkbox-list input[type="checkbox"]');
        
        pillsContainer.innerHTML = '';
        let hasSelection = false;

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                hasSelection = true;
                const pill = document.createElement('span');
                pill.className = 'pill';
                pill.innerHTML = `SDG ${checkbox.value} <span class="pill-remove" data-value="${checkbox.value}">×</span>`;
                pillsContainer.appendChild(pill);
            }
        });

        if (hasSelection) {
            defaultText.style.display = 'none';
            pillsContainer.style.display = 'flex';
        } else {
            defaultText.style.display = 'block';
            pillsContainer.style.display = 'none';
        }

        document.querySelectorAll('.pill-remove').forEach(remove => {
            remove.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = remove.dataset.value;
                const checkbox = document.querySelector(`#sdg-checkbox-list input[value="${value}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                    updateSDGPills();
                }
            });
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (uploadingImages.some(status => status === true)) {
            alert('Please wait for all images to finish uploading');
            return;
        }

        const newsEventData = {
            title: document.getElementById('news-event-title').value,
            type: document.getElementById('news-event-type').value,
            status: document.getElementById('news-event-status').value,
            date: document.getElementById('news-event-date').value,
            content: document.getElementById('news-event-content').value,
            tags: document.getElementById('news-event-tags').value.split(',').map(t => t.trim()).filter(t => t),
            sdgs: Array.from(document.querySelectorAll('#sdg-checkbox-list input[type="checkbox"]:checked')).map(cb => cb.value),
            images: uploadedImageUrls.filter(url => url !== "")
        };

        try {
            if (currentEditingId) {
                await updateNewsEventInFirestore(currentEditingId, newsEventData);
                alert('News/Event updated successfully!');
            } else {
                await saveNewsEventToFirestore(newsEventData);
                alert('News/Event created successfully!');
            }

            closeModal();
            await loadNewsEventsFromFirestore(true);
            await renderNewsEvents();
        } catch (error) {
            alert('Error saving news/event: ' + error.message);
        }
    };

    if (addNewsEventBtn) {
        addNewsEventBtn.addEventListener('click', () => {
            openAddModal();
        });
    }

    if (searchInput) searchInput.addEventListener('input', renderNewsEvents);
    if (sortDropdown) sortDropdown.addEventListener('change', renderNewsEvents);
    
    if (typeFilters) {
        typeFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.type-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                renderNewsEvents();
            }
        });
    }

    window.addEventListener('focus', async () => {
        renderNewsEvents(true); 
        await loadNewsEventsFromFirestore(true);
        await renderNewsEvents();
    });

    renderNewsEvents(true); 
    await loadNewsEventsFromFirestore();
    await renderNewsEvents();
    // Initialize image upload handlers for the form (if present on the page)
    initializeImageUploaders();
    
});
document.addEventListener('DOMContentLoaded', async () => {
    // Firestore collection
    const NEWS_EVENTS_COLLECTION = 'newsEvents';
    
    // --- Global State for Images ---
    let uploadedImageUrls = ["", "", "", "", ""]; 
    let uploadingImages = [false, false, false, false, false];
    
    let newsEventsData = [];
    let currentEditingId = null;

    // --- DOM Elements ---
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

    // --- Firestore Functions ---
    const loadNewsEventsFromFirestore = async () => {
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
            
            return newsEventsData;
        } catch (error) {
            newsEventList.innerHTML = `<div style="text-align: center; padding: 40px; color: #e74c3c;">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px;"></i>
                <p style="margin-top: 16px; font-weight: 500;">Error loading news & events</p>
                <p style="margin-top: 8px; font-size: 14px; color: var(--text-light);">${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 16px;">
                    <i class="fa-solid fa-refresh"></i> Retry
                </button>
            </div>`;
            return [];
        }
    };

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

    // --- Render List ---
    const renderNewsEvents = async (isLoading = false) => {
        if (isLoading) {
            newsEventList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 32px;"></i><p style="margin-top: 16px;">Loading news & events...</p></div>';
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
            newsEventList.innerHTML = '<p style="text-align: center; color: var(--text-light); margin-top: 30px;">No news or events found.</p>';
            return;
        }

        filteredData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-event-card';
            card.dataset.firestoreId = item.firestoreId;
            
            // Use uploaded image or fallback
            const imgUrl = (item.images && item.images.length > 0) ? item.images[0] : 'https://via.placeholder.com/150?text=No+Image';
            
            // Handle SDG tags safely
            const sdgs = Array.isArray(item.sdgs) ? item.sdgs : [];
            const sdgTags = sdgs.map(s => `<span class="tag tag-sdg">SDG ${s}</span>`).join('');

            // Format date
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
                <div class="card-content">
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
            await loadNewsEventsFromFirestore();
            await renderNewsEvents();
            alert('News/Event deleted successfully');
            // Auto-reload to reflect changes
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            alert('Error deleting news/event: ' + error.message);
        }
    };

    // --- Modal Functions ---
    const openAddModal = () => {
        // Open the dedicated form page for a new entry
        window.open('news-event-form.html', '_blank');
    };

    const openEditModal = (firestoreId) => {
        // Open the dedicated form page with the ID parameter
        window.open(`news-event-form.html?id=${firestoreId}`, '_blank');
    };

    const closeModal = () => {
        modalOverlay.style.display = 'none';
        currentEditingId = null;
        uploadedImageUrls = ["", "", "", "", ""];
    };

    // --- Image Upload Handlers ---
    const initializeImageUploaders = () => {
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

                    // Show preview immediately
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                        label.style.display = 'none';
                        if (removeBtn) removeBtn.style.display = 'flex';
                    };
                    reader.readAsDataURL(file);

                    // Upload to Cloudinary
                    uploadingImages[index] = true;
                    try {
                        const cloudinaryUrl = await CloudinaryUploader.uploadImage(file);
                        uploadedImageUrls[index] = cloudinaryUrl;
                    } catch (error) {
                        alert(`Failed to upload image ${i}: ${error.message}`);
                        uploadedImageUrls[index] = "";
                    } finally {
                        uploadingImages[index] = false;
                    }
                });
            }
        }

        // Remove image buttons
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

    // --- SDG Dropdown ---
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

        // Attach remove listeners
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

    // --- Form Submit ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        // Check if images are still uploading
        if (uploadingImages.some(status => status === true)) {
            alert('Please wait for all images to finish uploading');
            return;
        }

        // Collect form data
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
                // Update existing
                await updateNewsEventInFirestore(currentEditingId, newsEventData);
                alert('News/Event updated successfully!');
            } else {
                // Create new
                await saveNewsEventToFirestore(newsEventData);
                alert('News/Event created successfully!');
            }

            closeModal();
            await loadNewsEventsFromFirestore();
            await renderNewsEvents();
        } catch (error) {
            alert('Error saving news/event: ' + error.message);
        }
    };

    // --- Event Listeners ---
    if (addNewsEventBtn) {
        addNewsEventBtn.addEventListener('click', () => {
            openAddModal();
        });
    }
    // Modal event listeners removed - using new tab navigation instead
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

    // Auto-refresh when tab comes back into focus
    // This ensures updates made in the form tab appear here immediately
    window.addEventListener('focus', async () => {
        renderNewsEvents(true); // Show loading
        await loadNewsEventsFromFirestore();
        await renderNewsEvents();
    });

    // --- Initialize Everything ---
    renderNewsEvents(true); // Show loading spinner
    await loadNewsEventsFromFirestore();
    await renderNewsEvents();
    
});

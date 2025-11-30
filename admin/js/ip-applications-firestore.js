document.addEventListener('DOMContentLoaded', async () => {
    const IP_COLLECTION = 'ipApplications';
    
    let ipData = [];
    let editingIpId = null;
    let unsubscribe = null;

    // --- DOM Elements ---
    const ipList = document.querySelector('.ip-list');
    const searchInput = document.getElementById('search-input');
    const statusFilters = document.querySelector('.status-filters');
    const typeFilters = document.querySelector('.type-filters');
    const sortDropdown = document.getElementById('sort-ips');

    const addIpBtn = document.getElementById('add-ip-btn');
    const ipModalOverlay = document.getElementById('ip-modal-overlay');
    const closeIpModalBtn = document.getElementById('close-ip-modal-btn');
    const cancelIpBtn = document.getElementById('cancel-ip-btn');
    const ipForm = document.getElementById('ip-form');
    const ipStatusSelect = document.getElementById('ip-status');
    const ipGrantDateInput = document.getElementById('ip-grant-date');
    const ipModalTitle = document.getElementById('ip-modal-title');
    const ipModalSubtitle = document.getElementById('ip-modal-subtitle');
    const submitIpBtn = document.getElementById('submit-ip-btn');
    const ipTitleInput = document.getElementById('ip-title');
    const ipTypeSelect = document.getElementById('ip-type');
    const ipApplicantInput = document.getElementById('ip-applicant');
    const ipNumberInput = document.getElementById('ip-number');
    const ipAppDateInput = document.getElementById('ip-app-date');
    const ipRelatedStartupInput = document.getElementById('ip-related-startup');
    const ipDescriptionTextarea = document.getElementById('ip-description');
    const ipInventorsInput = document.getElementById('ip-inventors');
    const ipTagsInput = document.getElementById('ip-tags');

    const grantedCountEl = document.getElementById('granted-count');
    const filedCountEl = document.getElementById('filed-count');
    const totalIpCountEl = document.getElementById('total-ip-count');

    // --- Firestore Functions ---
    const loadIPsFromFirestore = () => {
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (e) { /* ignore */ }
            unsubscribe = null;
        }

        // Real-time listener
        unsubscribe = db.collection(IP_COLLECTION)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                ipData = [];
                snapshot.forEach(doc => {
                    ipData.push({ firestoreId: doc.id, ...doc.data() });
                });
                renderIPs();
            }, (error) => {
                console.error('Failed to load IP applications', error);
            });
    };

    const saveIPToFirestore = async (ipData) => {
        try {
            ipData.createdAt = ipData.createdAt || firebase.firestore.Timestamp.now();
            ipData.updatedAt = firebase.firestore.Timestamp.now();
            
            const docRef = await db.collection(IP_COLLECTION).add(ipData);
            return docRef.id;
        } catch (error) {
        }
    };

    const updateIPInFirestore = async (firestoreId, updatedData) => {
        try {
            updatedData.updatedAt = firebase.firestore.Timestamp.now();
            await db.collection(IP_COLLECTION).doc(firestoreId).update(updatedData);
        } catch (error) {
        }
    };

    // --- Debounce for writes ---
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const debouncedUpdateIPInFirestore = debounce(updateIPInFirestore, 1000); // 1 second delay

    const deleteIPFromFirestore = async (firestoreId) => {
        try {
            await db.collection(IP_COLLECTION).doc(firestoreId).delete();
        } catch (error) {
            throw error;
        }
    };

    // --- Function to Update Stat Cards ---
    const updateStats = () => {
        const grantedCount = ipData.filter(ip => ip.status === 'granted').length;
        const filedCount = ipData.filter(ip => ip.status === 'filed').length;
        totalIpCountEl.textContent = ipData.length;
        grantedCountEl.textContent = grantedCount;
        filedCountEl.textContent = filedCount;
    };

    // --- Main Render Function ---
    const renderIPs = async () => {
        updateStats();

        const searchTerm = searchInput.value.toLowerCase();
        const activeStatus = statusFilters.querySelector('.active').dataset.filter;
        const activeType = typeFilters.querySelector('.active').dataset.filter;

        let filteredData = ipData.filter(ip => {
            const matchesStatus = activeStatus === 'all' || ip.status === activeStatus;
            const matchesType = activeType === 'all' || ip.type === activeType;
            const matchesSearch = 
                (ip.title && ip.title.toLowerCase().includes(searchTerm)) || 
                (ip.description && ip.description.toLowerCase().includes(searchTerm)) || 
                (ip.inventors && ip.inventors.toLowerCase().includes(searchTerm));
            return matchesStatus && matchesType && matchesSearch;
        });

        const sortValue = sortDropdown.value;
        if (sortValue === 'recent') {
            filteredData.sort((a, b) => new Date(b.appDate) - new Date(a.appDate));
        } else if (sortValue === 'oldest') {
            filteredData.sort((a, b) => new Date(a.appDate) - new Date(b.appDate));
        } else if (sortValue === 'a-z') {
            filteredData.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortValue === 'z-a') {
            filteredData.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        }

        ipList.innerHTML = '';
        if (filteredData.length === 0) {
            ipList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No IP applications found.</p>';
            return;
        }

        filteredData.forEach(ip => {
            const card = document.createElement('div');
            card.className = 'ip-card';
            card.dataset.firestoreId = ip.firestoreId;
            
            const keywords = Array.isArray(ip.keywords) ? ip.keywords : [];
            
            card.innerHTML = `
                <i class="fa-regular fa-file-alt ip-icon"></i>
                <div class="ip-details">
                    <h3>${ip.title || 'Untitled'}</h3>
                    <p class="description">${ip.description || ''}</p>
                    <div class="ip-tags">
                        <span class="tag tag-${ip.status}">${(ip.status || 'filed').charAt(0).toUpperCase() + (ip.status || 'filed').slice(1)}</span>
                        <span class="tag tag-type">${ip.type || 'N/A'}</span>
                        <span class="tag tag-number">${ip.number || 'No Number'}</span>
                        ${ip.startup ? `<span class="tag tag-startup">${ip.startup}</span>` : ''}
                    </div>
                    <div class="ip-meta">
                        <p><strong>Inventors:</strong> ${ip.inventors || 'N/A'}</p>
                        <p><strong>Application Date:</strong> ${ip.appDate || 'N/A'}</p>
                        ${ip.grantDate ? `<p><strong>Grant Date:</strong> ${ip.grantDate}</p>` : ''}
                    </div>
                    <div class="ip-keywords">
                        ${keywords.map(kw => `<span class="tag">${kw}</span>`).join('')}
                    </div>
                </div>
                <div class="ip-actions">
                    <button class="icon-btn edit-btn" title="Edit"><i class="fa-solid fa-pencil"></i></button>
                    <button class="icon-btn delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            ipList.appendChild(card);
        });
        attachActionListeners();
    };

    const attachActionListeners = () => {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', e => {
                const firestoreId = e.target.closest('.ip-card').dataset.firestoreId;
                editIP(firestoreId);
            });
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', e => {
                const firestoreId = e.target.closest('.ip-card').dataset.firestoreId;
                deleteIP(firestoreId);
            });
        });
    };

    function showLoading() {
        ipList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading IP applications...</p>
            </div>
        `;
    }

    const openModal = () => ipModalOverlay.classList.add('active');
    const closeModal = () => {
        ipModalOverlay.classList.remove('active');
        ipForm.reset();
        editingIpId = null;
        ipGrantDateInput.disabled = true;
    };

    const editIP = (firestoreId) => {
        const ip = ipData.find(item => item.firestoreId === firestoreId);
        if (!ip) return;
        
        editingIpId = firestoreId;
        ipTitleInput.value = ip.title || '';
        ipStatusSelect.value = ip.status || 'filed';
        ipTypeSelect.value = ip.type || 'Utility Model';
        ipApplicantInput.value = ip.applicant || ip.inventors || '';
        ipNumberInput.value = ip.number || '';
        ipAppDateInput.value = ip.appDate || '';
        ipRelatedStartupInput.value = ip.startup || '';
        ipDescriptionTextarea.value = ip.description || '';
        ipInventorsInput.value = ip.inventors || '';
        
        const keywords = Array.isArray(ip.keywords) ? ip.keywords : [];
        ipTagsInput.value = keywords.join(', ');
        
        if (ip.status === 'granted') {
            ipGrantDateInput.disabled = false;
            ipGrantDateInput.value = ip.grantDate || '';
        } else {
            ipGrantDateInput.disabled = true;
            ipGrantDateInput.value = '';
        }
        
        ipModalTitle.textContent = 'Edit IP Application';
        ipModalSubtitle.textContent = 'Update intellectual property information';
        submitIpBtn.textContent = 'Update IP Application';
        openModal();
    };

    const deleteIP = async (firestoreId) => {
        if (!confirm('Are you sure you want to delete this IP application?')) return;
        
        try {
            await deleteIPFromFirestore(firestoreId);
            // onSnapshot will update UI automatically
            alert('IP application deleted successfully!');
            // Auto-reload to reflect changes
            // No need to reload — real-time snapshot will reflect deletion
        } catch (error) {
            alert('Error deleting IP application: ' + error.message);
        }
    };

    addIpBtn.addEventListener('click', () => {
        editingIpId = null;
        ipForm.reset();
        ipModalTitle.textContent = 'Add New IP Application';
        ipModalSubtitle.textContent = 'Add a new intellectual property application';
        submitIpBtn.textContent = 'Create IP Application';
        ipGrantDateInput.disabled = true;
        openModal();
    });

    closeIpModalBtn.addEventListener('click', closeModal);
    cancelIpBtn.addEventListener('click', closeModal);
    ipModalOverlay.addEventListener('click', e => { 
        if (e.target === ipModalOverlay) closeModal(); 
    });

    ipStatusSelect.addEventListener('change', () => {
        ipGrantDateInput.disabled = ipStatusSelect.value !== 'granted';
        if (ipStatusSelect.value !== 'granted') ipGrantDateInput.value = '';
    });

    ipForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            title: ipTitleInput.value,
            status: ipStatusSelect.value,
            type: ipTypeSelect.value,
            applicant: ipApplicantInput.value,
            number: ipNumberInput.value,
            appDate: ipAppDateInput.value,
            grantDate: ipStatusSelect.value === 'granted' ? ipGrantDateInput.value : null,
            startup: ipRelatedStartupInput.value || null,
            description: ipDescriptionTextarea.value,
            inventors: ipInventorsInput.value,
            keywords: ipTagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean)
        };
        
        try {
            if (editingIpId !== null) {
                // Update existing IP
                await debouncedUpdateIPInFirestore(editingIpId, formData);
                alert('IP application updated successfully!');
            } else {
                // Create new IP
                await saveIPToFirestore(formData);
                alert('IP application created successfully!');
            }
            // onSnapshot will update UI automatically
            closeModal();
        } catch (error) {
            alert('Error saving IP application: ' + error.message);
        }
    });

    searchInput.addEventListener('input', renderIPs);
    
    statusFilters.addEventListener('click', e => {
        if (e.target.classList.contains('filter-btn')) {
            statusFilters.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            renderIPs();
        }
    });
    
    typeFilters.addEventListener('click', e => {
        if (e.target.classList.contains('filter-btn')) {
            typeFilters.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            renderIPs();
        }
    });
    
    sortDropdown.addEventListener('change', renderIPs);

    // Initial load
    loadIPsFromFirestore();
    showLoading();

    // Cleanup listener on unload
    window.addEventListener('beforeunload', () => {
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (e) { }
        }
    });
});

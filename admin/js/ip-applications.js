document.addEventListener('DOMContentLoaded', () => {
    // Firestore collection for IP applications
    const IP_COLLECTION = 'ipApplications';
    const defaultIpData = [
        { id: 1, title: "Smart Irrigation Control System", status: "granted", type: "Utility Model", number: "UM-2023-001234", startup: "AgroTech Solutions", description: "An IoT-based automated irrigation control system using soil moisture sensors and weather data integration.", inventors: "Dr. Juan Dela Cruz, Eng. Maria Santos, Dr. Pedro Reyes", appDate: "2023-05-10", grantDate: "2024-08-20", keywords: ["Agriculture", "IoT", "Automation"] },
        { id: 2, title: "UC InTTO Logo and Branding", status: "granted", type: "Trademark", number: "TM-2024-567890", startup: null, description: "Official Trademark registration for University of the Cordilleras Innovation and Technology Transfer Office logo and brand identity.", inventors: "UC Marketing Team", appDate: "2024-02-08", grantDate: "2024-07-15", keywords: ["Branding", "Logo"] },
        { id: 3, title: "Telemedicine Mobile Application Interface", status: "filed", type: "Industrial Design", number: "ID-2024-912123", startup: "HealthHub PH", description: "Unique user interface design for a mobile telemedicine application focused on rural healthcare access.", inventors: "Sarah Bautista, HealthHub PH Team", appDate: "2024-03-22", grantDate: null, keywords: ["UI/UX", "Healthcare", "Mobile"] },
        { id: 4, title: "Community Safety Algorithm and System", status: "filed", type: "Copyright", number: "CP-2024-445566", startup: "SafeCity Monitor", description: "Proprietary algorithm for real-time community safety monitoring and incident prediction.", inventors: "Prof. Anna Garcia, SafeCity Monitor Dev Team", appDate: "2024-06-04", grantDate: null, keywords: ["Software", "AI", "Safety"] },
        { id: 5, title: "Cordillera Traditional Pattern Database", status: "granted", type: "Other IP", number: "CR-2023-778899", startup: "Cordillera Crafts", description: "Coordinated digital database and vectorization of traditional Cordilleran weaving patterns and designs with cultural protocols.", inventors: "Dr. Lirio Baguio, Cultural Heritage Team", appDate: "2023-10-12", grantDate: "2024-12-08", keywords: ["Cultural Heritage", "Database", "Traditional Knowledge"] }
    ];

    // Firestore listener unsubscribe
    let unsubscribe = null;

    let ipData = [];
    let editingIpId = null;

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

    // --- Function to Update Stat Cards ---
    const updateStats = () => {
        const grantedCount = ipData.filter(ip => ip.status === 'granted').length;
        const filedCount = ipData.filter(ip => ip.status === 'filed').length;
        totalIpCountEl.textContent = ipData.length;
        grantedCountEl.textContent = grantedCount;
        filedCountEl.textContent = filedCount;
    };

    function showLoading() {
        ipList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading IP applications...</p>
            </div>
        `;
    }

    /**
     * Load IP applications from Firestore in real-time
     */
    function loadIPs() {
        // Remove existing listener
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (e) { /* ignore */ }
            unsubscribe = null;
        }

        showLoading();

        unsubscribe = db.collection(IP_COLLECTION)
            .orderBy('createdAt', 'desc')
            .onSnapshot(async (snapshot) => {
                ipData = [];
                snapshot.forEach(doc => {
                    const raw = doc.data() || {};
                    ipData.push({
                        id: doc.id,
                        title: raw.title || 'Untitled',
                        status: raw.status || 'filed',
                        type: raw.type || 'Other IP',
                        number: raw.number || '',
                        startup: raw.startup || null,
                        description: raw.description || '',
                        inventors: raw.inventors || '',
                        appDate: raw.appDate || '',
                        grantDate: raw.grantDate || null,
                        keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
                        createdAt: raw.createdAt || null,
                        updatedAt: raw.updatedAt || null
                    });
                });
                // If Firestore has no data, ask whether to seed it with default data
                if (ipData.length === 0) {
                    // If there's localStorage data from previous versions, offer to migrate it
                    try {
                        const STORAGE_KEY = 'ucInttoIpData';
                        const localDataRaw = localStorage.getItem(STORAGE_KEY);
                        if (localDataRaw) {
                            const migrate = confirm('Found existing IP data stored in localStorage. Do you want to migrate it to Firestore?');
                            if (migrate) {
                                const localData = JSON.parse(localDataRaw || '[]');
                                for (const ip of localData) {
                                    const { id, ...payload } = ip;
                                    payload.createdAt = firebase.firestore.Timestamp.now();
                                    payload.updatedAt = firebase.firestore.Timestamp.now();
                                    payload.keywords = Array.isArray(payload.keywords) ? payload.keywords : [];
                                    try {
                                        await db.collection(IP_COLLECTION).add(payload);
                                    } catch (e) {
                                        console.error('Failed to migrate IP:', e);
                                    }
                                }
                                localStorage.removeItem(STORAGE_KEY);
                                return; // onSnapshot will re-run after writes
                            }
                        }
                    } catch (e) { /* ignore migration errors */ }
                }
                renderIPs();
            }, (error) => {
                alert('Failed to load IP applications: ' + (error && error.message ? error.message : error));
            });
    }

    // --- Main Render Function ---
    const renderIPs = () => {
        updateStats();

        const searchTerm = searchInput.value.toLowerCase();
        const activeStatus = statusFilters.querySelector('.active').dataset.filter;
        const activeType = typeFilters.querySelector('.active').dataset.filter;

        let filteredData = ipData.filter(ip => {
            const matchesStatus = activeStatus === 'all' || ip.status === activeStatus;
            const matchesType = activeType === 'all' || ip.type === activeType;
            const matchesSearch = ip.title.toLowerCase().includes(searchTerm) || ip.description.toLowerCase().includes(searchTerm) || ip.inventors.toLowerCase().includes(searchTerm);
            return matchesStatus && matchesType && matchesSearch;
        });

        const sortValue = sortDropdown.value;
        if (sortValue === 'recent') {
            filteredData.sort((a, b) => new Date(b.appDate) - new Date(a.appDate));
        } else if (sortValue === 'oldest') {
            filteredData.sort((a, b) => new Date(a.appDate) - new Date(b.appDate));
        } else if (sortValue === 'a-z') {
            filteredData.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortValue === 'z-a') {
            filteredData.sort((a, b) => b.title.localeCompare(a.title));
        }

        ipList.innerHTML = '';
        if (filteredData.length === 0) {
            ipList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No IP applications found.</p>';
            return;
        }

        filteredData.forEach(ip => {
            const card = document.createElement('div');
            card.className = 'ip-card';
            card.dataset.id = ip.id;
            card.innerHTML = `
                <i class="fa-regular fa-file-alt ip-icon"></i>
                <div class="ip-details">
                    <h3>${ip.title}</h3>
                    <p class="description">${ip.description}</p>
                    <div class="ip-tags">
                        <span class="tag tag-${ip.status}">${ip.status.charAt(0).toUpperCase() + ip.status.slice(1)}</span>
                        <span class="tag tag-type">${ip.type}</span>
                        <span class="tag tag-number">${ip.number}</span>
                        ${ip.startup ? `<span class="tag tag-startup">${ip.startup}</span>` : ''}
                    </div>
                    <div class="ip-meta">
                        <p><strong>Inventors:</strong> ${ip.inventors}</p>
                        <p><strong>Application Date:</strong> ${ip.appDate}</p>
                        ${ip.grantDate ? `<p><strong>Grant Date:</strong> ${ip.grantDate}</p>` : ''}
                    </div>
                    <div class="ip-keywords">
                        ${ip.keywords.map(kw => `<span class="tag">${kw}</span>`).join('')}
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
                const id = e.target.closest('.ip-card').dataset.id;
                editIP(id);
            });
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', e => {
                const id = e.target.closest('.ip-card').dataset.id;
                deleteIP(id);
            });
        });
    };

    const openModal = () => ipModalOverlay.classList.add('active');
    const closeModal = () => {
        ipModalOverlay.classList.remove('active');
        ipForm.reset();
        editingIpId = null;
        ipGrantDateInput.disabled = true;
    };

    const editIP = (id) => {
        const ip = ipData.find(item => item.id === id);
        if (!ip) return;
        editingIpId = id;
        ipTitleInput.value = ip.title;
        ipStatusSelect.value = ip.status;
        ipTypeSelect.value = ip.type;
        ipApplicantInput.value = ip.inventors;
        ipNumberInput.value = ip.number;
        ipAppDateInput.value = ip.appDate;
        ipRelatedStartupInput.value = ip.startup || '';
        ipDescriptionTextarea.value = ip.description;
        ipInventorsInput.value = ip.inventors;
        ipTagsInput.value = ip.keywords.join(', ');
        if (ip.status === 'granted') {
            ipGrantDateInput.disabled = false;
            ipGrantDateInput.value = ip.grantDate;
        } else {
            ipGrantDateInput.disabled = true;
            ipGrantDateInput.value = '';
        }
        ipModalTitle.textContent = 'Edit IP Application';
        ipModalSubtitle.textContent = 'Update intellectual property information';
        submitIpBtn.textContent = 'Update IP Application';
        openModal();
    };

    const deleteIP = async (id) => {
        if (!confirm('Are you sure you want to delete this IP application?')) return;
        try {
            await db.collection(IP_COLLECTION).doc(String(id)).delete();
            // local snapshot will update automatically; optionally optimistically update
            ipData = ipData.filter(item => item.id !== id);
            renderIPs();
        } catch (error) {
            alert('Failed to delete IP application: ' + (error && error.message ? error.message : error));
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
    ipModalOverlay.addEventListener('click', e => { if (e.target === ipModalOverlay) closeModal(); });

    ipStatusSelect.addEventListener('change', () => {
        ipGrantDateInput.disabled = ipStatusSelect.value !== 'granted';
        if (ipStatusSelect.value !== 'granted') ipGrantDateInput.value = '';
    });

    ipForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = {
            title: ipTitleInput.value, status: ipStatusSelect.value, type: ipTypeSelect.value,
            number: ipNumberInput.value, appDate: ipAppDateInput.value,
            grantDate: ipStatusSelect.value === 'granted' ? ipGrantDateInput.value : null,
            startup: ipRelatedStartupInput.value || null, description: ipDescriptionTextarea.value,
            inventors: ipInventorsInput.value, keywords: ipTagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean)
        };
        try {
            // Prepare Firestore data
            formData.updatedAt = firebase.firestore.Timestamp.now();
            if (editingIpId !== null) {
                await db.collection(IP_COLLECTION).doc(String(editingIpId)).update(formData);
            } else {
                formData.createdAt = firebase.firestore.Timestamp.now();
                await db.collection(IP_COLLECTION).add(formData);
            }
            closeModal();
        } catch (error) {
            alert('Failed to save IP application: ' + (error && error.message ? error.message : error));
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

    // Load IPs from Firestore (will render via onSnapshot)
    loadIPs();

    // Cleanup Firestore listener on unload
    window.addEventListener('beforeunload', () => {
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (e) { }
        }
    });
});
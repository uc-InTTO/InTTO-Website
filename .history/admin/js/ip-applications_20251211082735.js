document.addEventListener('DOMContentLoaded', () => {
    const IP_COLLECTION = 'ipApplications';
    
    let unsubscribe = null;
    let ipData = [];
    let editingIpId = null;

    const ipList = document.querySelector('.ip-list');
    const searchInput = document.getElementById('search-input');
    const statusFilters = document.querySelector('.status-filters');
    const typeFilters = document.querySelector('.type-filters');
    const sortDropdown = document.getElementById('sort-ips');

    const addIpBtn = document.getElementById('add-ip-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const ipModalOverlay = document.getElementById('ip-modal-overlay');
    const closeIpModalBtn = document.getElementById('close-ip-modal-btn');
    const cancelIpBtn = document.getElementById('cancel-ip-btn');
    const ipForm = document.getElementById('ip-form');
    const ipStatusSelect = document.getElementById('ip-status');
    const ipModalTitle = document.getElementById('ip-modal-title');
    const ipModalSubtitle = document.getElementById('ip-modal-subtitle');
    const submitIpBtn = document.getElementById('submit-ip-btn');
    const ipTitleInput = document.getElementById('ip-title');
    const ipTypeSelect = document.getElementById('ip-type');
    const ipNumberInput = document.getElementById('ip-number');
    const ipAppDateInput = document.getElementById('ip-app-date');
    const ipInventorsInput = document.getElementById('ip-inventors');

    const grantedCountEl = document.getElementById('granted-count');
    const filedCountEl = document.getElementById('filed-count');
    const totalIpCountEl = document.getElementById('total-ip-count');

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

    function loadIPs() {
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (e) { }
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
                        type: raw.type || 'Patent',
                        number: raw.number || '',
                        inventors: raw.inventors || '',
                        appDate: raw.appDate || '',
                        createdAt: raw.createdAt || null,
                        updatedAt: raw.updatedAt || null
                    });
                });
                
                if (ipData.length === 0) {
                    try {
                        const STORAGE_KEY = 'ucInttoIpData';
                        const localDataRaw = localStorage.getItem(STORAGE_KEY);
                        if (localDataRaw) {
                            const migrate = confirm('Found existing IP data stored in localStorage. Do you want to migrate it to Firestore?');
                            if (migrate) {
                                const localData = JSON.parse(localDataRaw || '[]');
                                for (const ip of localData) {
                                    const { id, applicant, startup, description, keywords, ...payload } = ip;
                                    payload.createdAt = firebase.firestore.Timestamp.now();
                                    payload.updatedAt = firebase.firestore.Timestamp.now();
                                    try {
                                        await db.collection(IP_COLLECTION).add(payload);
                                    } catch (e) {
                                        console.error('Failed to migrate IP:', e);
                                    }
                                }
                                localStorage.removeItem(STORAGE_KEY);
                                return;
                            }
                        }
                    } catch (e) { }
                }
                renderIPs();
            }, (error) => {
                alert('Failed to load IP applications: ' + (error && error.message ? error.message : error));
            });
    }

    const renderIPs = () => {
        updateStats();

        const searchTerm = searchInput.value.toLowerCase();
        const activeStatus = statusFilters.querySelector('.active').dataset.filter;
        const activeType = typeFilters.querySelector('.active').dataset.filter;

        let filteredData = ipData.filter(ip => {
            const matchesStatus = activeStatus === 'all' || ip.status === activeStatus;
            const matchesType = activeType === 'all' || ip.type === activeType;
            const matchesSearch = ip.title.toLowerCase().includes(searchTerm) || ip.inventors.toLowerCase().includes(searchTerm);
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
                    <div class="ip-tags">
                        <span class="tag tag-${ip.status}">${ip.status.charAt(0).toUpperCase() + ip.status.slice(1)}</span>
                        <span class="tag tag-type">${ip.type}</span>
                        <span class="tag tag-number">${ip.number}</span>
                    </div>
                    <div class="ip-meta">
                        <p><strong>Inventors:</strong> ${ip.inventors}</p>
                        <p><strong>Registration Date:</strong> ${ip.appDate}</p>
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
    };

    const editIP = (id) => {
        const ip = ipData.find(item => item.id === id);
        if (!ip) return;
        editingIpId = id;
        
        ipTitleInput.value = ip.title;
        ipTypeSelect.value = ip.type;
        ipNumberInput.value = ip.number;
        ipAppDateInput.value = ip.appDate;
        ipInventorsInput.value = ip.inventors;
        ipStatusSelect.value = ip.status.toLowerCase(); 
        
        ipModalTitle.textContent = 'Edit IP Application';
        ipModalSubtitle.textContent = 'Update intellectual property information';
        submitIpBtn.textContent = 'Update IP Application';
        openModal();
    };

    const deleteIP = async (id) => {
        if (!confirm('Are you sure you want to delete this IP application?')) return;
        try {
            await db.collection(IP_COLLECTION).doc(String(id)).delete();
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
        openModal();
    });

    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            if (ipData.length === 0) {
                alert('No data to export.');
                return;
            }

            const dataToExport = ipData.map(item => ({
                'Title': item.title,
                'Type': item.type,
                'Status': item.status,
                'IP Number': item.number,
                'Inventors': item.inventors,
                'Registration Date': item.appDate
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dataToExport);

            const wscols = [
                {wch: 40}, {wch: 15}, {wch: 10}, {wch: 20}, {wch: 30}, {wch: 15}
            ];
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, "IP Applications");
            XLSX.writeFile(wb, "UC_InTTO_IP_Applications.xlsx");
        });
    }

    closeIpModalBtn.addEventListener('click', closeModal);
    cancelIpBtn.addEventListener('click', closeModal);
    ipModalOverlay.addEventListener('click', e => { if (e.target === ipModalOverlay) closeModal(); });

    ipForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = {
            title: ipTitleInput.value,
            status: ipStatusSelect.value,
            type: ipTypeSelect.value,
            number: ipNumberInput.value,
            appDate: ipAppDateInput.value,
            inventors: ipInventorsInput.value || ''
        };
        try {
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

    loadIPs();

    window.addEventListener('pagehide', () => {
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (e) { }
        }
    });
});
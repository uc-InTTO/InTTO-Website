document.addEventListener('DOMContentLoaded', async () => {
    // Firestore collections
    const STARTUPS_COLLECTION = 'startups';
    
    let startupsData = [];
    
    // --- DOM Elements ---
    const startupList = document.querySelector('.startup-list');
    const addStartupBtn = document.getElementById('add-startup-btn');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.category-filters .filter-btn');
    const sortDropdown = document.getElementById('sort-startups');

    // --- Firestore Functions ---
    const loadStartupsFromFirestore = async () => {
        const CACHE_KEY = 'admin_startups_firestore';
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        let cached = localStorage.getItem(CACHE_KEY);
        let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
        let now = Date.now();

        if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            // Use cached value
            startupsData = JSON.parse(cached);
            return startupsData;
        }

        try {
            const snapshot = await db.collection(STARTUPS_COLLECTION).get();
            startupsData = [];
            snapshot.forEach(doc => {
                startupsData.push({
                    firestoreId: doc.id,
                    ...doc.data()
                });
            });
            // Cache result
            localStorage.setItem(CACHE_KEY, JSON.stringify(startupsData));
            localStorage.setItem(CACHE_KEY + '_time', now);
            return startupsData;
        } catch (error) {
            return [];
        }
    };

    const updateStartupInFirestore = async (firestoreId, updatedData) => {
        try {
            updatedData.updatedAt = firebase.firestore.Timestamp.now();
            await db.collection(STARTUPS_COLLECTION).doc(firestoreId).update(updatedData);
        } catch (error) {
            throw error;
        }
    };

    const deleteStartupFromFirestore = async (firestoreId) => {
        try {
            await db.collection(STARTUPS_COLLECTION).doc(firestoreId).delete();
        } catch (error) {
            throw error;
        }
    };

    // --- Render Function ---
    const renderStartups = async () => {
        const searchTerm = searchInput.value.toLowerCase();
        const activeFilter = document.querySelector('.category-filters .filter-btn.active').dataset.filter;
        
        let filteredData = startupsData.filter(startup => {
            // Flexible category matching
            const startupCategory = String(startup.category || startup.industry || '').trim();
            const matchesCategory = activeFilter === 'all' || 
                                    startupCategory === activeFilter ||
                                    startupCategory.includes(activeFilter) ||
                                    activeFilter.includes(startupCategory);
            
            const matchesSearch = (startup.name && startup.name.toLowerCase().includes(searchTerm)) ||
                                  (startup.description && startup.description.toLowerCase().includes(searchTerm));
            return matchesCategory && matchesSearch;
        });

        // Sorting
        const sortValue = sortDropdown.value;
        if (sortValue === 'recent') {
            filteredData.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            });
        } else if (sortValue === 'oldest') {
            filteredData.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateA - dateB;
            });
        } else if (sortValue === 'a-z') {
            filteredData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortValue === 'z-a') {
            filteredData.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        }

        startupList.innerHTML = '';
        if (filteredData.length === 0) {
            startupList.innerHTML = `<p style="text-align: center; color: var(--text-light);">No startups found.</p>`;
            return;
        }

        filteredData.forEach(startup => {
            const card = document.createElement('div');
            card.className = 'startup-card';
            card.dataset.firestoreId = startup.firestoreId;
            
            const sdgTagsHTML = (startup.sdgs && Array.isArray(startup.sdgs))
                ? startup.sdgs.map(sdg => `<span class="tag tag-sdg">${sdg}</span>`).join('')
                : '';
            
            // Status Badge
            let statusClass = 'tag-status-' + (startup.status || 'pending');
            let statusText = startup.status || 'pending';
            
            if (startup.status === 'pending') {
                statusClass = 'tag-status-pending';
                statusText = '⏳ Pending Review';
            } else if (startup.status === 'rejected') {
                statusClass = 'tag-status-rejected';
                statusText = '❌ Rejected';
            } else if (startup.status === 'active') {
                statusClass = 'tag-status-active';
                statusText = '✅ Active';
            } else if (startup.status === 'graduated') {
                statusClass = 'tag-status-graduated';
                statusText = '🎓 Graduated';
            }

            const approvalButtonsHTML = startup.status === 'pending' ? `
                <button class="icon-btn approve-btn" title="Approve & Publish"><i class="fa-solid fa-check"></i></button>
                <button class="icon-btn reject-btn" title="Reject"><i class="fa-solid fa-xmark"></i></button>
            ` : '';

            const tagsArray = Array.isArray(startup.tags) ? startup.tags : [];
            
            // --- LOGIC: Only show "Not Incubated" tag, NEVER show Green Badge on Admin ---
            let incubationTagHTML = '';
            if (startup.incubationStatus !== 'incubated' && startup.status !== 'pending') { 
                incubationTagHTML = `<span class="tag tag-not-incubated">Not Incubated</span>`;
            }
            // -----------------------------------------------------------------------------

            const tagsHTML = `
                <span class="tag ${statusClass}">${statusText}</span>
                ${incubationTagHTML}
                <span class="tag">${startup.category || 'Uncategorized'}</span>
                <span class="tag">TRL ${startup.trl || '?'}</span>
                ${startup.collab ? `<span class="tag tag-collab">Open for Collab</span>` : ''}
                ${tagsHTMLFromList(tagsArray)}
                ${sdgTagsHTML}
            `;
            
            // Ensure category is a string before toLowerCase
            const categoryStr = String(startup.category || startup.industry || 'other').trim();
            const logoClass = `logo-${categoryStr.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

            card.innerHTML = `
                <div class="startup-logo ${logoClass}">${startup.logo || '🚀'}</div>
                <div class="startup-details">
                    <h3>${startup.name || 'Unnamed Startup'}</h3>
                    <p>${startup.description || 'No description provided.'}</p>
                    <div class="tags-container">${tagsHTML}</div>
                </div>
                <div class="startup-actions">
                    ${approvalButtonsHTML}
                    <button class="icon-btn edit-btn" title="Edit in New Tab"><i class="fa-solid fa-pencil"></i></button>
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
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const firestoreId = e.target.closest('.startup-card').dataset.firestoreId;
                if (!confirm("Approve this project?")) return;
                await updateStartupInFirestore(firestoreId, { status: 'active' });
                await loadStartupsFromFirestore();
                renderStartups();
            });
        });
        
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const firestoreId = e.target.closest('.startup-card').dataset.firestoreId;
                if (!confirm("Reject this project?")) return;
                await updateStartupInFirestore(firestoreId, { status: 'rejected' });
                await loadStartupsFromFirestore();
                renderStartups();
            });
        });
        
        // --- EDIT BUTTON: OPENS NEW TAB ---
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const firestoreId = e.target.closest('.startup-card').dataset.firestoreId;
                // Opens the edit page in a new tab as requested
                window.open(`../ucolab/edit-project.html?id=${firestoreId}`, '_blank');
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const firestoreId = e.target.closest('.startup-card').dataset.firestoreId;
                if (!confirm('Delete this startup?')) return;
                await deleteStartupFromFirestore(firestoreId);
                await loadStartupsFromFirestore();
                renderStartups();
                // Auto-reload to reflect changes
                setTimeout(() => location.reload(), 1000);
            });
        });
    };

    // --- Add Startup Button ---
    addStartupBtn.addEventListener('click', () => {
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

    // --- Auto-Reload ---
    window.addEventListener('focus', async () => {
        await loadStartupsFromFirestore();
        renderStartups();
    });

    // --- Init ---
    await loadStartupsFromFirestore();
    await renderStartups();
});
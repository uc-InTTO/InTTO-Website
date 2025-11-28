document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const cardsGrid = document.getElementById('cardsGrid');
    const resultsCount = document.querySelector('.results-count');
    const paginationContainer = document.querySelector('.pagination');

    // Filter Elements
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('filter-category');
    const sortSelect = document.getElementById('sort-order');

    // SDG Multi-Select Elements
    const sdgWrapper = document.getElementById('sdg-wrapper');
    const sdgBtn = document.getElementById('sdg-btn');
    const sdgBtnText = document.getElementById('sdg-btn-text');
    const sdgCheckboxes = document.querySelectorAll('.item input[type="checkbox"]');

    if (!window.db) {
        if(cardsGrid) cardsGrid.innerHTML = '<p>Error: Database not connected.</p>';
        return;
    }

    // --- CONFIGURATION ---
    const ITEMS_PER_PAGE = 6; 
    let currentPage = 1;
    let allStartupsData = []; 
    let currentFilteredData = []; 
    let selectedSDGs = []; 

    // --- 1. EVENT LISTENERS ---
    
    // SDG Dropdown Toggle
    if(sdgBtn && sdgWrapper) {
        sdgBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sdgWrapper.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!sdgWrapper.contains(e.target)) {
                sdgWrapper.classList.remove('open');
            }
        });
    }

    // SDG Checkboxes
    if(sdgCheckboxes.length > 0) {
        sdgCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateSelectedSDGs();
                applyFilters(); 
            });
        });
    }

    // Other Filters
    if(searchInput) searchInput.addEventListener('input', applyFilters);
    if(categorySelect) categorySelect.addEventListener('change', applyFilters);
    if(sortSelect) sortSelect.addEventListener('change', applyFilters);


    // --- 2. HELPER FUNCTIONS ---
    function updateSelectedSDGs() {
        selectedSDGs = Array.from(sdgCheckboxes)
            .filter(box => box.checked)
            .map(box => box.value);

        if (sdgBtnText) {
            if (selectedSDGs.length > 0) {
                sdgBtnText.textContent = `${selectedSDGs.length} SDG${selectedSDGs.length > 1 ? 's' : ''} Selected`;
                sdgBtnText.style.color = '#1C7F56';
                sdgBtnText.style.fontWeight = 'bold';
            } else {
                sdgBtnText.textContent = 'Select SDGs';
                sdgBtnText.style.color = '#555';
                sdgBtnText.style.fontWeight = 'normal';
            }
        }
    }

    // --- 3. FETCH DATA ---
    async function fetchStartups() {
        if(!cardsGrid) return;

        const CACHE_KEY = 'public_startups';
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        let cached = localStorage.getItem(CACHE_KEY);
        let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
        let now = Date.now();

        if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            // Use cached value
            allStartupsData = JSON.parse(cached);
            applyFilters();
            return;
        }

        try {
            cardsGrid.innerHTML = '<p style="text-align:center; width:100%;">Loading startups...</p>';
            
            // Fetch ALL startups
            const snapshot = await db.collection('startups').get();

            allStartupsData = [];
            snapshot.forEach(doc => {
                allStartupsData.push({ id: doc.id, ...doc.data() });
            });

            // Cache result
            localStorage.setItem(CACHE_KEY, JSON.stringify(allStartupsData));
            localStorage.setItem(CACHE_KEY + '_time', now);

            applyFilters(); // Initial Render

        } catch (error) {
            cardsGrid.innerHTML = '<p style="text-align:center;">Error loading data.</p>';
        }
    }

    // --- 4. FILTER LOGIC ---
    function applyFilters() {
        let filtered = [...allStartupsData];

        // Search
        if (searchInput) {
            const term = searchInput.value.toLowerCase();
            if (term) {
                filtered = filtered.filter(s => 
                    (s.name && s.name.toLowerCase().includes(term)) ||
                    (s.industry && s.industry.toLowerCase().includes(term))
                );
            }
        }

        // Category
        if (categorySelect) {
            const cat = categorySelect.value;
            if (cat && cat !== 'all') {
                filtered = filtered.filter(s => 
                    (s.industry === cat) || (s.category === cat)
                );
            }
        }

        // SDGs
        if (selectedSDGs.length > 0) {
            filtered = filtered.filter(s => {
                const sData = s.sdgs || s.SDGs || s.sdg; 
                if (!sData) return false;
                
                if(Array.isArray(sData)) {
                    return sData.some(item => selectedSDGs.includes(item));
                }
                return selectedSDGs.includes(sData);
            });
        }

        // Sort
        if (sortSelect) {
            const sortVal = sortSelect.value;
            filtered.sort((a, b) => {
                if (sortVal === 'newest') return (b.dateStarted || '').localeCompare(a.dateStarted || '');
                if (sortVal === 'oldest') return (a.dateStarted || '').localeCompare(b.dateStarted || '');
                if (sortVal === 'a-z') return (a.name || '').localeCompare(b.name || '');
            });
        }

        currentFilteredData = filtered;
        currentPage = 1;
        updateDisplay();
    }

    // --- 5. PAGINATION & DISPLAY ---
    function updateDisplay() {
        const totalItems = currentFilteredData.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        
        if (currentPage > totalPages) currentPage = totalPages || 1;

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageItems = currentFilteredData.slice(start, end);

        renderCards(pageItems);
        renderPaginationControls(totalPages);
        
        if (resultsCount) {
            resultsCount.textContent = `Showing ${pageItems.length} of ${totalItems} startups`;
        }
    }

    function renderPaginationControls(totalPages) {
        if(!paginationContainer) return;
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) return; 

        const createBtn = (content, onClick, isActive, isDisabled) => {
            const a = document.createElement('a');
            a.href = "#";
            a.className = 'page-btn';
            if (isActive) a.classList.add('active');
            if (isDisabled) a.classList.add('disabled');
            a.innerHTML = content;
            
            if (!isDisabled && !isActive) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    onClick();
                    // Scroll only if on specific page, optional for homepage
                    if(document.querySelector('.startups-section')) {
                        document.querySelector('.startups-section').scrollIntoView({behavior: 'smooth'});
                    }
                });
            }
            return a;
        };

        // Prev
        const prevBtn = createBtn('<i class="fa-solid fa-chevron-left"></i>', () => { currentPage--; updateDisplay(); }, false, currentPage === 1);
        prevBtn.classList.add('arrow');
        paginationContainer.appendChild(prevBtn);

        // Numbers
        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createBtn(i, () => { currentPage = i; updateDisplay(); }, currentPage === i));
        }

        // Next
        const nextBtn = createBtn('<i class="fa-solid fa-chevron-right"></i>', () => { currentPage++; updateDisplay(); }, false, currentPage === totalPages);
        nextBtn.classList.add('arrow');
        paginationContainer.appendChild(nextBtn);
    }

    // --- 6. RENDER CARDS ---
    function renderCards(startups) {
        if(!cardsGrid) return;
        cardsGrid.innerHTML = '';

        if (startups.length === 0) {
            cardsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">No startups match criteria.</p>';
            return;
        }

        startups.forEach(startup => {
            const card = document.createElement('article');
            card.className = 'startup-card';

            // CRITICAL FIX: Add Category Data Attribute so Filter works
            const category = (startup.category || startup.industry || '').toLowerCase();
            card.dataset.category = category;

            // Logo
            let logoHTML;
            if (startup.imageUrls && startup.imageUrls.length > 0 && (startup.imageUrls[0].startsWith('http') || startup.imageUrls[0].startsWith('data:'))) {
                logoHTML = `<img src="${startup.imageUrls[0]}" alt="logo" class="startup-logo">`;
            } else {
                logoHTML = `<div class="startup-logo-emoji">${startup.logo || '🚀'}</div>`;
            }

            // Tags
            let tagsHTML = `<span class="tag">${startup.industry || startup.category || 'Startup'}</span>`;
            const sSDGs = startup.sdgs || startup.sdg;
            
            if (sSDGs && Array.isArray(sSDGs) && sSDGs.length > 0) {
                tagsHTML += `<span class="tag small">${sSDGs[0]}</span>`;
                if (sSDGs.length > 1) {
                    tagsHTML += `<span class="tag small">+${sSDGs.length - 1}</span>`;
                }
            }

            card.innerHTML = `
                <div class="card-head">
                    ${logoHTML}
                    <div class="card-meta">
                        <h3 class="startup-name">${startup.name || 'Unnamed'}</h3>
                        <div class="tags">${tagsHTML}</div>
                    </div>
                </div>
                <p class="startup-desc">${startup.description ? startup.description.substring(0, 120) + '...' : 'No description.'}</p>
                <a href="startup-details.html?id=${startup.id}" class="card-cta">View More <span class="cta-circle">➜</span></a>
            `;
            cardsGrid.appendChild(card);
        });
    }

    // Start
    fetchStartups();
});
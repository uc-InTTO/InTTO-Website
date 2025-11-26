document.addEventListener('DOMContentLoaded', async () => {
    const newsCardsContainer = document.getElementById('news-cards-container');
    const paginationContainer = document.getElementById('pagination-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('search-input');

    if (!newsCardsContainer || !paginationContainer) {
        return;
    }
    
    paginationContainer.style.fontFamily = "'Poppins', sans-serif";
    newsCardsContainer.style.fontFamily = "'Poppins', sans-serif";

    if (!window.db) {
        return;
    }

    const PAGE_SIZE = 6;
    const MAX_VISIBLE_PAGES = 10; 
    let allNewsEvents = [];
    let currentPage = 1;
    let currentFilter = 'all';
    let currentSearchTerm = '';
    let filteredNewsEvents = [];

    async function loadAllNewsEvents() {
        try {
            if (window.LoadingScreen) {
                window.LoadingScreen.show('Loading news & events');
            }
            
            const snapshot = await db.collection('newsEvents')
                .where('status', '==', 'published')
                .get();
            
            const newsEvents = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                newsEvents.push({
                    id: doc.id,
                    ...data
                });
            });
            
            newsEvents.sort((a, b) => {
                const dateA = a.date ? (typeof a.date === 'string' ? new Date(a.date) : a.date.toDate()) : new Date(0);
                const dateB = b.date ? (typeof b.date === 'string' ? new Date(b.date) : b.date.toDate()) : new Date(0);
                return dateB - dateA;
            });
            
            allNewsEvents = newsEvents;
            
            if (window.LoadingScreen) window.LoadingScreen.hide();
            
        } catch (error) {
            if (window.LoadingScreen) window.LoadingScreen.hide();
        }
    }

    function applyFiltersAndSearch() {
        filteredNewsEvents = allNewsEvents.filter(item => {
            const itemType = item.type || 'news'; 
            
            const matchesFilter = currentFilter === 'all' || itemType === currentFilter;
            
            if (currentSearchTerm) {
                const title = (item.title || '').toLowerCase();
                const content = (item.content || '').toLowerCase();
                const tags = (item.tags || []).join(' ').toLowerCase();
                
                const matchesSearch = title.includes(currentSearchTerm) || content.includes(currentSearchTerm) || tags.includes(currentSearchTerm);
                return matchesFilter && matchesSearch;
            }
            
            return matchesFilter;
        });
        
        currentPage = 1;
        renderNewsEventsCards();
        renderPagination();
    }

    function createNewsCard(item) {
        const coverImage = (item.images && item.images.length > 0) 
            ? item.images[0] 
            : 'graphics/news.png';

        let displayDate = 'N/A';
        if (item.date) {
            let dateObj;
            if (typeof item.date === 'string') {
                dateObj = new Date(item.date);
            } else if (item.date.toDate) {
                dateObj = item.date.toDate();
            }
            if (dateObj) {
                displayDate = dateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
        }

        const tagText = (item.tags && item.tags.length > 0) 
            ? item.tags[0] 
            : item.type === 'event' ? 'Event' : 'News';

        const card = document.createElement('div');
        card.className = 'news-card';
        card.dataset.newsId = item.id;
        card.dataset.type = item.type || 'news';
        card.style.fontFamily = "'Poppins', sans-serif";
        
        card.innerHTML = `
            <img src="${coverImage}" alt="${item.title}" onerror="this.src='graphics/news.png'">
            <div class="news-content">
                <div class="news-meta">
                    <span class="tag" style="font-family: 'Poppins', sans-serif;">${tagText}</span>
                    <span class="date" style="font-family: 'Poppins', sans-serif;">${displayDate}</span>
                </div>
                <h3 class="news-title" style="font-family: 'Poppins', sans-serif;">${item.title || 'Untitled'}</h3>
                <p class="news-desc" style="font-family: 'Poppins', sans-serif;">${(item.content || '').substring(0, 150)}...</p>
                <a href="newsEventPage.html?id=${item.id}" class="read-more" style="font-family: 'Poppins', sans-serif;">Read More →</a>
            </div>
        `;
        return card;
    }

    function renderNewsEventsCards() {
        newsCardsContainer.innerHTML = '';
        
        const totalItems = filteredNewsEvents.length;
        const totalPages = Math.ceil(totalItems / PAGE_SIZE);

        if (totalItems === 0) {
            newsCardsContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1/-1; font-family: \'Poppins\', sans-serif;">No news or events match your current selection.</p>';
            return;
        }

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const itemsToDisplay = filteredNewsEvents.slice(startIndex, endIndex);

        itemsToDisplay.forEach(item => {
            newsCardsContainer.appendChild(createNewsCard(item));
        });

        if (currentPage > totalPages) {
            currentPage = 1; 
            renderNewsEventsCards();
        }
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';
        
        const totalItems = filteredNewsEvents.length;
        const totalPages = Math.ceil(totalItems / PAGE_SIZE);

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        
        let startPage, endPage;

        if (totalPages <= MAX_VISIBLE_PAGES) {
            startPage = 1;
            endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(MAX_VISIBLE_PAGES / 2);
            const maxPagesAfterCurrent = Math.ceil(MAX_VISIBLE_PAGES / 2) - 1;

            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = MAX_VISIBLE_PAGES;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - MAX_VISIBLE_PAGES + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }
        
        const prevButton = document.createElement('a');
        prevButton.href = '#';
        prevButton.className = `page-btn arrow prev ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevButton.style.fontFamily = "'Poppins', sans-serif";
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                renderNewsEventsCards();
                renderPagination();
            }
        });
        paginationContainer.appendChild(prevButton);

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('a');
            pageButton.href = '#';
            pageButton.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.style.fontFamily = "'Poppins', sans-serif";
            pageButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (i !== currentPage) {
                    currentPage = i;
                    renderNewsEventsCards();
                    renderPagination();
                }
            });
            paginationContainer.appendChild(pageButton);
        }

        const nextButton = document.createElement('a');
        nextButton.href = '#';
        nextButton.className = `page-btn arrow next ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextButton.style.fontFamily = "'Poppins', sans-serif";
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                renderNewsEventsCards();
                renderPagination();
            }
        });
        paginationContainer.appendChild(nextButton);
    }
    
    if (filterButtons.length > 0) {
        filterButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterId = btn.id;
                
                let selectedType = filterId.replace('filter-', '');
                if (selectedType === 'news') {
                    selectedType = 'news';
                } else if (selectedType === 'events') {
                    selectedType = 'event'; 
                } else {
                    selectedType = 'all';
                }
                
                currentFilter = selectedType;
                
                applyFiltersAndSearch();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase();
            applyFiltersAndSearch();
        });
    }
    // --- START OF NEW UPCOMING EVENTS LOGIC ---
    async function loadUpcomingEvents() {
        const upcomingSection = document.querySelector('.upcoming-events-section');
        const container = document.querySelector('.events-horizontal-list');

        // Safety check
        if (!upcomingSection || !container) return;

        try {
            // 1. Fetch only 'draft' events
            const snapshot = await db.collection('newsEvents')
                .where('status', '==', 'draft')
                .where('type', '==', 'event')
                .get();

            // 2. Hide the entire section if no drafts exist
            if (snapshot.empty) {
                upcomingSection.style.display = 'none';
                return;
            }

            // 3. Show section and clear placeholder content
            upcomingSection.style.display = 'block';
            container.innerHTML = '';

            const events = [];
            snapshot.forEach(doc => {
                events.push({ id: doc.id, ...doc.data() });
            });

            // Sort by date (ascending: nearest date first)
            events.sort((a, b) => {
                const dateA = a.date ? (typeof a.date === 'string' ? new Date(a.date) : a.date.toDate()) : new Date(0);
                const dateB = b.date ? (typeof b.date === 'string' ? new Date(b.date) : b.date.toDate()) : new Date(0);
                return dateA - dateB;
            });

            // 4. Create cards for upcoming events
            events.forEach(event => {
                const dateObj = event.date ? (typeof event.date === 'string' ? new Date(event.date) : event.date.toDate()) : new Date();
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                // Use uploaded image or default
                const imageUrl = (event.images && event.images[0]) ? event.images[0] : 'graphics/students.png';

                const eventHTML = `
                    <div class="event-item">
                        <div class="event-image-container">
                            <img src="${imageUrl}" alt="${event.title}" class="event-image" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div class="event-details">
                            <p class="event-title">${event.title}</p>
                            <p class="event-date-time">
                                <span>${dateStr}</span>
                            </p>
                            <a href="#" class="learn-more">Learn More →</a>
                        </div>
                    </div>
                `;
                container.innerHTML += eventHTML;
            });

        } catch (error) {
            console.error("Error loading upcoming events:", error);
            upcomingSection.style.display = 'none';
        }
    }

    // Call the function immediately
    loadUpcomingEvents();
    // --- END OF NEW UPCOMING EVENTS LOGIC ---
    
    await loadAllNewsEvents();
    applyFiltersAndSearch();

    try {
        db.collection('newsEvents')
            .where('status', '==', 'published')
            .onSnapshot(() => {
                loadAllNewsEvents().then(applyFiltersAndSearch);
            });
    } catch (error) {
    }
});
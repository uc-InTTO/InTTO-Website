let allProjects = [];
let allNewsEvents = [];

// Global State
let currentFilteredProjects = []; 
let currentFilteredNews = [];
let currentProjectPage = 1;
let currentNewsPage = 1;

const ITEMS_PER_PAGE = 6;
const MAX_VISIBLE_PAGES = 10; // User limitation: Show max 10 numbers

const projectsContainer = document.getElementById('cardsGrid');
const newsContainer = document.querySelector('.news-cards');
const searchInput = document.querySelector('.filter-item.search input');
const sdgFilterIcons = document.querySelectorAll('.sdg-icon-wrapper');
const projectResultsInfo = document.querySelectorAll('.results-info p')[0];
const newsResultsInfo = document.querySelectorAll('.results-info p')[1];

const sdgNames = {
    1: "No Poverty", 2: "Zero Hunger", 3: "Good Health and Well-being",
    4: "Quality Education", 5: "Gender Equality", 6: "Clean Water and Sanitation",
    7: "Affordable and Clean Energy", 8: "Decent Work and Economic Growth",
    9: "Industry, Innovation and Infrastructure", 10: "Reduced Inequalities",
    11: "Sustainable Cities and Communities", 12: "Responsible Consumption and Production",
    13: "Climate Action", 14: "Life Below Water", 15: "Life on Land",
    16: "Peace, Justice and Strong Institutions", 17: "Partnerships for the Goals"
};

let activeSdg = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    await fetchAllData();
    filterAndDisplay(activeSdg, '');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            filterAndDisplay(activeSdg, searchTerm);
        });
    }

    sdgFilterIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const dataSdg = icon.getAttribute('data-sdg');
            const newSdg = dataSdg === 'all' ? 'all' : parseInt(dataSdg);
            
            sdgFilterIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            
            activeSdg = newSdg;
            if (searchInput) searchInput.value = '';
            filterAndDisplay(activeSdg, '');
        });
    });
});

async function fetchAllData() {
    try {
        const projectsSnapshot = await window.db.collection('startups').get();
        allProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const newsEventsSnapshot = await window.db.collection('newsEvents').get();
        allNewsEvents = newsEventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        if (projectsContainer) projectsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%;">Error loading projects.</p>`;
        if (newsContainer) newsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%;">Error loading news.</p>`;
    }
}

function filterAndDisplay(sdg, searchTerm) {
    const isAll = sdg === 'all';

    // 1. Filter Projects
    const filteredProjects = allProjects.filter(project => {
        const projectSdgsArray = Array.isArray(project.sdgs) ? project.sdgs : [project.sdg].filter(s => s);
        const matchesSdg = isAll || projectSdgsArray.includes(sdg.toString());
        const projectSdgNames = projectSdgsArray.map(s => (sdgNames[s] || '').toLowerCase()).join(' ');

        const name = (project.name || '').toLowerCase();
        const category = (project.category || '').toLowerCase();
        const trl = (project.trl || '').toString().toLowerCase();
        const desc = (project.description || '').toLowerCase();

        const matchesSearch = name.includes(searchTerm) || 
                              category.includes(searchTerm) || 
                              trl.includes(searchTerm) || 
                              desc.includes(searchTerm) ||
                              projectSdgsArray.map(s => s.toString()).includes(searchTerm) ||
                              projectSdgNames.includes(searchTerm);
        
        return matchesSdg && matchesSearch;
    });

    // 2. Filter News
    const filteredNewsEvents = allNewsEvents.filter(event => {
        const eventSdgArray = Array.isArray(event.sdgs) ? event.sdgs.map(String) : (event.sdg ? [String(event.sdg)] : []);
        const matchesSdg = isAll || eventSdgArray.includes(sdg.toString());
        const tagsString = Array.isArray(event.tags) ? event.tags.join(' ').toLowerCase() : '';
        const eventSdgNames = eventSdgArray.map(s => (sdgNames[s] || '').toLowerCase()).join(' ');
        
        const title = (event.title || '').toLowerCase();
        const content = (event.content || '').toLowerCase();

        const matchesSearch = title.includes(searchTerm) || 
                              content.includes(searchTerm) || 
                              tagsString.includes(searchTerm) || 
                              eventSdgArray.map(s => s.toString()).includes(searchTerm) ||
                              eventSdgNames.includes(searchTerm);

        return matchesSdg && matchesSearch;
    });

    if (projectResultsInfo) projectResultsInfo.textContent = `Showing ${filteredProjects.length} related projects`;
    if (newsResultsInfo) newsResultsInfo.textContent = `Showing ${filteredNewsEvents.length} related news & events`;
    
    currentFilteredProjects = filteredProjects;
    currentFilteredNews = filteredNewsEvents;
    
    currentProjectPage = 1;
    currentNewsPage = 1;
    
    renderProjects();
    renderNews();
}

function renderProjects() {
    if (!projectsContainer) return;
    projectsContainer.innerHTML = ''; 

    if (currentFilteredProjects.length === 0) {
        projectsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%; margin-top: 20px;">No projects found for the selected criteria.</p>`;
        togglePagination('project-pagination', false);
        return;
    }

    const totalPages = Math.ceil(currentFilteredProjects.length / ITEMS_PER_PAGE);
    const startIndex = (currentProjectPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const projectsToShow = currentFilteredProjects.slice(startIndex, endIndex);

    projectsToShow.forEach(project => {
        const projectCard = document.createElement('article');
        projectCard.className = 'startup-card';
        projectCard.setAttribute('data-category', (project.category || '').toLowerCase());
        
        let imgUrl = 'ucolab/Logo/No image.png';
        if (project.imageUrls && Array.isArray(project.imageUrls) && project.imageUrls.length > 0) {
            const firstImg = project.imageUrls[0];
            if (firstImg && (firstImg.startsWith('http') || firstImg.startsWith('data:image'))) {
                imgUrl = firstImg;
            }
        } else if (project.logoUrl) {
            imgUrl = project.logoUrl;
        }

        const sdgTags = (project.sdgs && Array.isArray(project.sdgs))
            ? project.sdgs.map(s => `<span class="tag small" style="font-family: Poppins, sans-serif;">SDG ${s}</span>`).join('')
            : (project.sdg ? `<span class="tag small" style="font-family: Poppins, sans-serif;">SDG ${project.sdg}</span>` : '');

        projectCard.innerHTML = `
            <div class="card-head">
                <img src="${imgUrl}" alt="${project.name || 'Startup'} logo" class="startup-logo" onerror="this.src='ucolab/Logo/No image.png';">
                <div class="card-meta">
                    <h3 class="startup-name" style="font-family: Poppins, sans-serif;">${project.name || 'Untitled Project'}</h3>
                    <div class="tags">
                        ${project.category ? `<span class="tag" style="font-family: Poppins, sans-serif;">${project.category}</span>` : ''}
                        ${project.trl ? `<span class="tag small" style="font-family: Poppins, sans-serif;">TRL ${project.trl}</span>` : ''}
                        ${sdgTags}
                    </div>
                </div>
            </div>
            <p class="startup-desc" style="font-family: Poppins, sans-serif;">${project.description || 'No description available.'}</p>
            <a href="ucolab/project-detail.html?id=${project.id}" class="card-cta" style="font-family: Poppins, sans-serif;">View More <span class="cta-circle">➜</span></a>
        `;
        projectsContainer.appendChild(projectCard);
    });

    renderPaginationControls('project-pagination', projectsContainer, totalPages, currentProjectPage, (newPage) => {
        currentProjectPage = newPage;
        renderProjects();
        projectsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function renderNews() {
    if (!newsContainer) return;
    newsContainer.innerHTML = ''; 
    
    if (currentFilteredNews.length === 0) {
        newsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%; margin-top: 20px;">No news or events found for the selected criteria.</p>`;
        togglePagination('news-pagination', false);
        return;
    }

    const totalPages = Math.ceil(currentFilteredNews.length / ITEMS_PER_PAGE);
    const startIndex = (currentNewsPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newsToShow = currentFilteredNews.slice(startIndex, endIndex);

    newsToShow.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'news-card';
        
        const imageUrl = (event.images && event.images.length > 0) ? event.images[0] : 'graphics/news.png';
        const tag = (event.tags && Array.isArray(event.tags) && event.tags.length > 0) ? event.tags[0] : (event.type || 'News');
        let displayDate = event.date || '';

        eventCard.innerHTML = `
            <img src="${imageUrl}" alt="News Image" onerror="this.src='graphics/news.png'">
            <div class="news-content">
                <div class="news-meta">
                    ${tag ? `<span class="tag" style="font-family: Poppins, sans-serif;">${tag}</span>` : ''}
                    ${displayDate ? `<span class="date" style="font-family: Poppins, sans-serif;">${displayDate}</span>` : ''}
                </div>
                <h3 class="news-title" style="font-family: Poppins, sans-serif;">${event.title || 'Untitled Event'}</h3>
                <p class="news-desc" style="font-family: Poppins, sans-serif;">${event.content ? event.content.substring(0, 150) + '...' : 'No description available.'}</p>
                <a href="newsEventPage.html?id=${event.id}" class="read-more" style="font-family: Poppins, sans-serif;">Read More →</a>
            </div>
        `;
        newsContainer.appendChild(eventCard);
    });

    renderPaginationControls('news-pagination', newsContainer, totalPages, currentNewsPage, (newPage) => {
        currentNewsPage = newPage;
        renderNews();
        newsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// --- SHARED PAGINATION LOGIC (FIXED FOR 10-PAGE AUTO-SCROLL) ---

function togglePagination(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
}

function renderPaginationControls(containerId, targetElement, totalPages, currentPage, onPageChange) {
    let pagContainer = document.getElementById(containerId);
    
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = containerId;
        pagContainer.style.display = 'flex';
        pagContainer.style.justifyContent = 'center';
        pagContainer.style.alignItems = 'center';
        pagContainer.style.gap = '8px';
        pagContainer.style.marginTop = '30px';
        pagContainer.style.marginBottom = '20px';
        pagContainer.style.flexWrap = 'wrap';
        pagContainer.style.fontFamily = 'Poppins, sans-serif';
        targetElement.parentNode.insertBefore(pagContainer, targetElement.nextSibling);
    }

    pagContainer.innerHTML = '';

    if (totalPages <= 1) {
        pagContainer.style.display = 'none';
        return;
    }
    pagContainer.style.display = 'flex';

    // --- LOGIC TO AUTO-SCROLL NUMBERS WHEN HITTING 10 ---
    let startPage, endPage;

    // If total pages are less than limit, show all
    if (totalPages <= MAX_VISIBLE_PAGES) {
        startPage = 1;
        endPage = totalPages;
    } else {
        // If current page is less than 10 (1-9), stick to 1-10 range
        // This ensures the list doesn't shift constantly while browsing early pages
        if (currentPage < MAX_VISIBLE_PAGES) {
            startPage = 1;
            endPage = MAX_VISIBLE_PAGES;
        } 
        // If near the very end, show the last chunk
        else if (currentPage + 4 >= totalPages) {
            startPage = totalPages - MAX_VISIBLE_PAGES + 1;
            endPage = totalPages;
        } 
        // OTHERWISE (e.g., clicking 10, 11, 12...), sliding window
        // This makes 11 appear when you click 10.
        else {
            startPage = currentPage - 5;
            endPage = currentPage + 4;
        }
    }
    // -----------------------------------------------------

    // Previous Arrow
    const prevBtn = createPageBtn('<i class="fa-solid fa-chevron-left"></i>', currentPage > 1);
    prevBtn.onclick = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };
    pagContainer.appendChild(prevBtn);

    // Number Buttons
    for (let i = startPage; i <= endPage; i++) {
        const btn = createPageBtn(i, true); 
        
        if (i === currentPage) {
            btn.style.backgroundColor = '#1C7F56';
            btn.style.color = '#fff';
            btn.style.borderColor = '#1C7F56';
        }

        btn.onclick = () => {
            if (i !== currentPage) onPageChange(i);
        };
        pagContainer.appendChild(btn);
    }

    // Next Arrow
    const nextBtn = createPageBtn('<i class="fa-solid fa-chevron-right"></i>', currentPage < totalPages);
    nextBtn.onclick = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };
    pagContainer.appendChild(nextBtn);
}

function createPageBtn(content, enabled) {
    const btn = document.createElement('button');
    btn.innerHTML = content;
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.borderRadius = '50%';
    btn.style.border = '1px solid #ddd';
    btn.style.backgroundColor = '#fff';
    btn.style.color = '#1C7F56';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = '500';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';
    btn.style.outline = 'none';

    if (!enabled) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'default';
        btn.style.pointerEvents = 'none';
    } else {
        btn.onmouseover = () => {
            if (btn.style.backgroundColor !== 'rgb(28, 127, 86)') {
                btn.style.backgroundColor = '#f0f9f4';
                btn.style.borderColor = '#1C7F56';
            }
        };
        btn.onmouseout = () => {
            if (btn.style.backgroundColor !== 'rgb(28, 127, 86)') {
                btn.style.backgroundColor = '#fff';
                btn.style.borderColor = '#ddd';
            }
        };
    }
    return btn;
}
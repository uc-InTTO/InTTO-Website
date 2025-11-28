let allProjects = [];
let allNewsEvents = [];

let currentFilteredProjects = []; 
let currentFilteredNews = [];
let currentProjectPage = 1;
let currentNewsPage = 1;

const ITEMS_PER_PAGE = 6;

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
            if (!dataSdg) return;

            const newSdg = dataSdg === 'all' ? 'all' : String(dataSdg);
            
            sdgFilterIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            
            activeSdg = newSdg;
            if (searchInput) searchInput.value = '';
            filterAndDisplay(activeSdg, '');
        });
    });

    window.addEventListener('resize', () => {
        renderProjects();
        renderNews();
    });
});

async function fetchAllData() {
    try {
        const CACHE_KEY_PROJECTS = 'sdg_projects';
        const CACHE_KEY_NEWS = 'sdg_news_events';
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        let cachedProjects = localStorage.getItem(CACHE_KEY_PROJECTS);
        let cachedNews = localStorage.getItem(CACHE_KEY_NEWS);
        let cachedProjectsTime = localStorage.getItem(CACHE_KEY_PROJECTS + '_time');
        let cachedNewsTime = localStorage.getItem(CACHE_KEY_NEWS + '_time');
        let now = Date.now();

        if (cachedProjects && cachedProjectsTime && (now - cachedProjectsTime < CACHE_EXPIRY)) {
            allProjects = JSON.parse(cachedProjects);
        } else {
            const projectsSnapshot = await window.db.collection('startups').get();
            allProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(allProjects));
            localStorage.setItem(CACHE_KEY_PROJECTS + '_time', now);
        }

        if (cachedNews && cachedNewsTime && (now - cachedNewsTime < CACHE_EXPIRY)) {
            allNewsEvents = JSON.parse(cachedNews);
        } else {
            const newsEventsSnapshot = await window.db.collection('newsEvents').get();
            allNewsEvents = newsEventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem(CACHE_KEY_NEWS, JSON.stringify(allNewsEvents));
            localStorage.setItem(CACHE_KEY_NEWS + '_time', now);
        }

    } catch (error) {
        if (projectsContainer) projectsContainer.innerHTML = `<p style="font-family: 'Poppins', sans-serif; text-align: center; width: 100%;">Error loading projects.</p>`;
        if (newsContainer) newsContainer.innerHTML = `<p style="font-family: 'Poppins', sans-serif; text-align: center; width: 100%;">Error loading news.</p>`;
    }
}

function filterAndDisplay(sdg, searchTerm) {
    const isAll = sdg === 'all';
    const filterSdgStr = String(sdg);

    const filteredProjects = allProjects.filter(project => {
        let rawSdgs = project.sdgs || project.SDGs || project.sdg || project.SDG || project.goals || [];
        
        let projectSdgsArray = [];

        if (Array.isArray(rawSdgs)) {
            projectSdgsArray = rawSdgs.map(s => String(s).trim());
        } else if (rawSdgs !== undefined && rawSdgs !== null && rawSdgs !== '') {
            projectSdgsArray = [String(rawSdgs).trim()];
        }
        
        const matchesSdg = isAll || projectSdgsArray.some(s => {
            const numberOnly = s.replace(/[^0-9]/g, ''); 
            return numberOnly === filterSdgStr;
        });

        const projectSdgNames = projectSdgsArray.map(s => (sdgNames[s] || '').toLowerCase()).join(' ');

        const name = String(project.name || '').toLowerCase();
        const category = String(project.category || project.industry || '').toLowerCase();
        const trl = String(project.trl || '').toLowerCase();
        const desc = String(project.description || project.shortDescription || '').toLowerCase();

        const matchesSearch = name.includes(searchTerm) || 
                              category.includes(searchTerm) || 
                              trl.includes(searchTerm) || 
                              desc.includes(searchTerm) ||
                              projectSdgsArray.includes(searchTerm) ||
                              projectSdgNames.includes(searchTerm);
        
        return matchesSdg && matchesSearch;
    });

    const filteredNewsEvents = allNewsEvents.filter(event => {
        let rawSdgs = event.sdgs || event.SDGs || event.sdg || event.SDG || event.goals || [];
        let eventSdgArray = [];

        if (Array.isArray(rawSdgs)) {
            eventSdgArray = rawSdgs.map(s => String(s).trim());
        } else if (rawSdgs !== undefined && rawSdgs !== null && rawSdgs !== '') {
            eventSdgArray = [String(rawSdgs).trim()];
        }
        
        const matchesSdg = isAll || eventSdgArray.some(s => {
            const numberOnly = s.replace(/[^0-9]/g, ''); 
            return numberOnly === filterSdgStr;
        });

        const tagsString = Array.isArray(event.tags) ? event.tags.join(' ').toLowerCase() : '';
        const eventSdgNames = eventSdgArray.map(s => (sdgNames[s] || '').toLowerCase()).join(' ');
        
        const title = String(event.title || '').toLowerCase();
        const content = String(event.content || '').toLowerCase();

        const matchesSearch = title.includes(searchTerm) || 
                              content.includes(searchTerm) || 
                              tagsString.includes(searchTerm) || 
                              eventSdgArray.includes(searchTerm) ||
                              eventSdgNames.includes(searchTerm);

        return matchesSdg && matchesSearch;
    });

    if (projectResultsInfo) {
        projectResultsInfo.textContent = `Showing ${filteredProjects.length} related projects`;
        projectResultsInfo.style.fontFamily = "'Poppins', sans-serif";
    }

    if (newsResultsInfo) {
        newsResultsInfo.textContent = `Showing ${filteredNewsEvents.length} related news & events`;
        newsResultsInfo.style.fontFamily = "'Poppins', sans-serif";
    }
    
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
        projectsContainer.innerHTML = `<p style="font-family: 'Poppins', sans-serif; text-align: center; width: 100%; margin-top: 20px;">No projects found for the selected criteria.</p>`;
        togglePagination('project-pagination', false);
        return;
    }

    const totalPages = Math.ceil(currentFilteredProjects.length / ITEMS_PER_PAGE);
    const startIndex = (currentProjectPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const projectsToShow = currentFilteredProjects.slice(startIndex, endIndex);

    projectsToShow.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'startup-card';
        projectCard.style.fontFamily = "'Poppins', sans-serif";
        
        let imgUrl = 'ucolab/Logo/No image.png';
        if (project.imageUrls && Array.isArray(project.imageUrls) && project.imageUrls.length > 0) {
            const firstImg = project.imageUrls[0];
            if (firstImg && (firstImg.startsWith('http') || firstImg.startsWith('data:image'))) {
                imgUrl = firstImg;
            }
        } else if (project.logoUrl) {
            imgUrl = project.logoUrl;
        }

        const category = String(project.category || project.industry || 'Innovation');
        const trl = String(project.trl || 'TRL ?');
        
        const badgeHTML = (project.incubationStatus === 'incubated') 
            ? `<div class="incubated-badge" title="Verified / Incubated Project"><i class="fa-solid fa-check"></i></div>`
            : '';

        projectCard.innerHTML = `
            ${badgeHTML}
            <div class="card-head">
                <img src="${imgUrl}" class="startup-logo" alt="${project.name || 'Startup'} Logo" onerror="this.src='ucolab/Logo/No image.png';">
                <div class="card-meta">
                    <h3 class="startup-name" style="font-family: 'Poppins', sans-serif;">${project.name || 'Untitled Project'}</h3>
                    <div class="tags">
                        <span class="tag" style="font-family: 'Poppins', sans-serif;">${category}</span>
                        <span class="tag small" style="font-family: 'Poppins', sans-serif;">${trl}</span>
                    </div>
                </div>
            </div>
            <p class="startup-desc" style="font-family: 'Poppins', sans-serif;">
                ${project.shortDescription || project.description || 'No description available.'}
            </p>
            <a href="ucolab/project-detail.html?id=${project.id}" class="card-cta" style="font-family: 'Poppins', sans-serif;">
                View Details <span class="cta-circle">➜</span>
            </a>
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
        newsContainer.innerHTML = `<p style="font-family: 'Poppins', sans-serif; text-align: center; width: 100%; margin-top: 20px;">No news or events found for the selected criteria.</p>`;
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
        eventCard.style.fontFamily = "'Poppins', sans-serif";
        
        const imageUrl = (event.images && event.images.length > 0) ? event.images[0] : 'graphics/news.png';
        const tag = (event.tags && Array.isArray(event.tags) && event.tags.length > 0) ? event.tags[0] : (event.type || 'News');
        let displayDate = event.date || '';

        eventCard.innerHTML = `
            <img src="${imageUrl}" alt="News Image" onerror="this.src='graphics/news.png'">
            <div class="news-content">
                <div class="news-meta">
                    ${tag ? `<span class="tag" style="font-family: 'Poppins', sans-serif;">${tag}</span>` : ''}
                    ${displayDate ? `<span class="date" style="font-family: 'Poppins', sans-serif;">${displayDate}</span>` : ''}
                </div>
                <h3 class="news-title" style="font-family: 'Poppins', sans-serif;">${event.title || 'Untitled Event'}</h3>
                <p class="news-desc" style="font-family: 'Poppins', sans-serif;">${event.content ? event.content.substring(0, 150) + '...' : 'No description available.'}</p>
                <a href="newsEventPage.html?id=${event.id}" class="read-more" style="font-family: 'Poppins', sans-serif;">Read More →</a>
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

function togglePagination(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
}

function renderPaginationControls(containerId, targetElement, totalPages, currentPage, onPageChange) {
    let pagContainer = document.getElementById(containerId);
    
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = containerId;
        pagContainer.className = 'pagination-container';
        pagContainer.style.fontFamily = "'Poppins', sans-serif";
        targetElement.parentNode.insertBefore(pagContainer, targetElement.nextSibling);
    }

    pagContainer.innerHTML = '';
    pagContainer.className = 'pagination-container';

    if (totalPages <= 1) {
        pagContainer.style.display = 'none';
        return;
    }
    pagContainer.style.display = 'flex';

    const isMobile = window.innerWidth <= 768;
    const maxVisiblePages = isMobile ? 3 : 10;

    let startPage, endPage;

    if (totalPages <= maxVisiblePages) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
        const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;

        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }

    const prevBtn = createPageBtn('<i class="fa-solid fa-chevron-left"></i>', currentPage > 1);
    prevBtn.onclick = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };
    pagContainer.appendChild(prevBtn);

    for (let i = startPage; i <= endPage; i++) {
        const btn = createPageBtn(i, true); 
        if (i === currentPage) {
            btn.classList.add('active');
        }
        btn.onclick = () => {
            if (i !== currentPage) onPageChange(i);
        };
        pagContainer.appendChild(btn);
    }

    const nextBtn = createPageBtn('<i class="fa-solid fa-chevron-right"></i>', currentPage < totalPages);
    nextBtn.onclick = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };
    pagContainer.appendChild(nextBtn);
}

function createPageBtn(content, enabled) {
    const btn = document.createElement('button');
    btn.innerHTML = content;
    btn.className = 'page-btn';
    btn.style.fontFamily = "'Poppins', sans-serif";

    if (!enabled) {
        btn.classList.add('disabled');
    }
    
    return btn;
}
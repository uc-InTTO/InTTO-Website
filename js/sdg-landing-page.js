let allProjects = [];
let allNewsEvents = [];
const projectsContainer = document.getElementById('cardsGrid');
const newsContainer = document.querySelector('.news-cards');
const searchInput = document.querySelector('.filter-item.search input');
const sdgFilterIcons = document.querySelectorAll('.sdg-icon-wrapper');
const projectResultsInfo = document.querySelectorAll('.results-info p')[0];
const newsResultsInfo = document.querySelectorAll('.results-info p')[1];

const sdgNames = {
    1: "No Poverty",
    2: "Zero Hunger",
    3: "Good Health and Well-being",
    4: "Quality Education",
    5: "Gender Equality",
    6: "Clean Water and Sanitation",
    7: "Affordable and Clean Energy",
    8: "Decent Work and Economic Growth",
    9: "Industry, Innovation and Infrastructure",
    10: "Reduced Inequalities",
    11: "Sustainable Cities and Communities",
    12: "Responsible Consumption and Production",
    13: "Climate Action",
    14: "Life Below Water",
    15: "Life on Land",
    16: "Peace, Justice and Strong Institutions",
    17: "Partnerships for the Goals"
};

let activeSdg = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    await fetchAllData();
    filterAndDisplay(activeSdg, '');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        filterAndDisplay(activeSdg, searchTerm);
    });

    sdgFilterIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const dataSdg = icon.getAttribute('data-sdg');
            const newSdg = dataSdg === 'all' ? 'all' : parseInt(dataSdg);
            
            sdgFilterIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            
            activeSdg = newSdg;
            searchInput.value = '';
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
        console.error("Error fetching data:", error);
        projectsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%;">Error loading projects from database.</p>`;
        newsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%;">Error loading news and events from database.</p>`;
    }
}

function filterAndDisplay(sdg, searchTerm) {
    const isAll = sdg === 'all';

    const filteredProjects = allProjects.filter(project => {
        const projectSdgsArray = Array.isArray(project.sdgs) ? project.sdgs : [project.sdg].filter(s => s);
        const matchesSdg = isAll || projectSdgsArray.includes(sdg.toString());
        
        const projectSdgNames = projectSdgsArray.map(s => (sdgNames[s] || '').toLowerCase()).join(' ');

        const matchesSearch = (project.name && project.name.toLowerCase().includes(searchTerm)) || 
                              (project.category ? project.category.toLowerCase().includes(searchTerm) : false) || 
                              (project.trl ? project.trl.toString().toLowerCase().includes(searchTerm) : false) ||
                              projectSdgsArray.map(s => s.toString()).includes(searchTerm) ||
                              projectSdgNames.includes(searchTerm);
        
        return matchesSdg && matchesSearch;
    });

    const filteredNewsEvents = allNewsEvents.filter(event => {
        const eventSdgArray = Array.isArray(event.sdgs) ? event.sdgs.map(String) : (event.sdg ? [String(event.sdg)] : []);
        const matchesSdg = isAll || eventSdgArray.includes(sdg.toString());
        
        const tagsString = Array.isArray(event.tags) ? event.tags.join(' ').toLowerCase() : '';
        const eventSdgNames = eventSdgArray.map(s => (sdgNames[s] || '').toLowerCase()).join(' ');
        
        const matchesSearch = (event.title && event.title.toLowerCase().includes(searchTerm)) || 
                              (tagsString.includes(searchTerm)) || 
                              eventSdgArray.map(s => s.toString()).includes(searchTerm) ||
                              eventSdgNames.includes(searchTerm);

        return matchesSdg && matchesSearch;
    });

    projectResultsInfo.textContent = `Showing ${filteredProjects.length} related projects`;
    newsResultsInfo.textContent = `Showing ${filteredNewsEvents.length} related news & events`;
    
    renderProjects(filteredProjects);
    renderNews(filteredNewsEvents);
}

function renderProjects(projects) {
    projectsContainer.innerHTML = ''; 

    if (projects.length === 0) {
        projectsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%; margin-top: 20px;">No projects found for the selected criteria.</p>`;
        return;
    }

    projects.forEach(project => {
        const projectCard = document.createElement('article');
        projectCard.className = 'startup-card';
        projectCard.setAttribute('data-category', (project.category || '').toLowerCase());
        
        const sdgTags = (project.sdgs && Array.isArray(project.sdgs))
            ? project.sdgs.map(s => `<span class="tag small" style="font-family: Poppins, sans-serif;">SDG ${s}</span>`).join('')
            : (project.sdg ? `<span class="tag small" style="font-family: Poppins, sans-serif;">SDG ${project.sdg}</span>` : '');

        projectCard.innerHTML = `
            <div class="card-head">
                <img src="${project.logoUrl || 'graphics/sunshare.png'}" alt="${project.name || 'Startup'} logo" class="startup-logo">
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
            <a href="${project.website || '#'}" class="card-cta" style="font-family: Poppins, sans-serif;">View More <span class="cta-circle">➜</span></a>
        `;
        projectsContainer.appendChild(projectCard);
    });
}

function renderNews(newsEvents) {
    newsContainer.innerHTML = ''; 
    
    if (newsEvents.length === 0) {
        newsContainer.innerHTML = `<p style="font-family: Poppins, sans-serif; text-align: center; width: 100%; margin-top: 20px;">No news or events found for the selected criteria.</p>`;
        return;
    }

    newsEvents.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'news-card';
        
        const imageUrl = (event.images && event.images.length > 0) ? event.images[0] : 'graphics/news.png';
        const tag = (event.tags && Array.isArray(event.tags) && event.tags.length > 0) ? event.tags[0] : (event.type || 'News');
        
        let displayDate = event.date || '';

        eventCard.innerHTML = `
            <img src="${imageUrl}" alt="News Image">
            <div class="news-content">
                <div class="news-meta">
                    ${tag ? `<span class="tag" style="font-family: Poppins, sans-serif;">${tag}</span>` : ''}
                    ${displayDate ? `<span class="date" style="font-family: Poppins, sans-serif;">${displayDate}</span>` : ''}
                </div>
                <h3 class="news-title" style="font-family: Poppins, sans-serif;">${event.title || 'Untitled Event'}</h3>
                <p class="news-desc" style="font-family: Poppins, sans-serif;">${event.content ? event.content.substring(0, 150) + '...' : 'No description available.'}</p>
                <a href="${event.link || 'newsEventPage.html'}" class="read-more" style="font-family: Poppins, sans-serif;">Read More →</a>
            </div>
        `;
        newsContainer.appendChild(eventCard);
    });
}
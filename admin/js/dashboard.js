/**
 * Dashboard Admin Panel
 * Real-time statistics and activity from Firestore
 */
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
});

/**
 * Load all dashboard data from Firestore
 */
function loadDashboardData() {
    loadStartupsStats();
    loadNewsEventsStats();
    loadTeamStats();
    loadRecentStartups();
    loadRecentActivity();
}

/**
 * Load Startups Statistics
 */
function loadStartupsStats() {
    const CACHE_KEY = 'dashboard_startups';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    let cached = localStorage.getItem(CACHE_KEY);
    let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
    let now = Date.now();

    if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
        // Use cached value
        let data = JSON.parse(cached);
        document.getElementById('total-startups').textContent = data.total;
        document.getElementById('active-startups').textContent = `${data.active} active`;
        return;
    }

    // Fetch from Firestore
    db.collection('startups').get().then((snapshot) => {
        const totalStartups = snapshot.size;
        const activeStartups = snapshot.docs.filter(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            return status === 'active';
        }).length;
        
        // Update UI
        document.getElementById('total-startups').textContent = totalStartups;
        document.getElementById('active-startups').textContent = `${activeStartups} active`;

        // Cache result
        localStorage.setItem(CACHE_KEY, JSON.stringify({total: totalStartups, active: activeStartups}));
        localStorage.setItem(CACHE_KEY + '_time', now);
    }).catch((error) => {
        document.getElementById('total-startups').textContent = '0';
        document.getElementById('active-startups').textContent = '0 active';
    });
}

/**
 * Load News & Events Statistics
 */
function loadNewsEventsStats() {
    const CACHE_KEY = 'dashboard_newsEvents';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    let cached = localStorage.getItem(CACHE_KEY);
    let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
    let now = Date.now();

    if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
        // Use cached value
        let data = JSON.parse(cached);
        document.getElementById('published-events').textContent = data.published;
        document.getElementById('draft-events').textContent = `${data.draft} drafts`;
        return;
    }

    // Fetch from Firestore
    db.collection('newsEvents').get().then((snapshot) => {
        const publishedEvents = snapshot.docs.filter(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            return status === 'published';
        }).length;
        
        const draftEvents = snapshot.docs.filter(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            return status === 'draft';
        }).length;
        
        // Update UI
        document.getElementById('published-events').textContent = publishedEvents;
        document.getElementById('draft-events').textContent = `${draftEvents} drafts`;

        // Cache result
        localStorage.setItem(CACHE_KEY, JSON.stringify({published: publishedEvents, draft: draftEvents}));
        localStorage.setItem(CACHE_KEY + '_time', now);
    }).catch((error) => {
        document.getElementById('published-events').textContent = '0';
        document.getElementById('draft-events').textContent = '0 drafts';
    });
}

/**
 * Load Team Members Statistics
 */
function loadTeamStats() {
    const CACHE_KEY = 'dashboard_team';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    let cached = localStorage.getItem(CACHE_KEY);
    let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
    let now = Date.now();

    if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
        // Use cached value
        let data = JSON.parse(cached);
        document.getElementById('total-team').textContent = data.total;
        document.getElementById('active-team').textContent = `${data.active} active staff`;
        return;
    }

    // Fetch from Firestore
    db.collection('team').get().then((snapshot) => {
        const totalMembers = snapshot.size;
        const activeMembers = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.active !== false; // Assume active unless explicitly false
        }).length;
        
        // Update UI
        document.getElementById('total-team').textContent = totalMembers;
        document.getElementById('active-team').textContent = `${activeMembers} active staff`;

        // Cache result
        localStorage.setItem(CACHE_KEY, JSON.stringify({total: totalMembers, active: activeMembers}));
        localStorage.setItem(CACHE_KEY + '_time', now);
    }).catch((error) => {
        // If team collection doesn't exist, set to 0
        document.getElementById('total-team').textContent = '0';
        document.getElementById('active-team').textContent = '0 active staff';
    });
}

/**
 * Load Recent Startups (Last 5)
 */
function loadRecentStartups() {
    const CACHE_KEY = 'dashboard_recentStartups';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    let cached = localStorage.getItem(CACHE_KEY);
    let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
    let now = Date.now();

    if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
        // Use cached value
        let startups = JSON.parse(cached);
        const container = document.querySelector('.content-card:nth-child(1) ul');
        container.innerHTML = '';
        startups.forEach(startup => {
            const li = createStartupListItem(startup);
            container.appendChild(li);
        });
        return;
    }

    // Fetch from Firestore
    db.collection('startups')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get().then((snapshot) => {
            const container = document.querySelector('.content-card:nth-child(1) ul');
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        <p>No startups yet</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            let startups = [];
            snapshot.forEach((doc) => {
                const startup = doc.data();
                startups.push(startup);
                const li = createStartupListItem(startup);
                container.appendChild(li);
            });

            // Cache result
            localStorage.setItem(CACHE_KEY, JSON.stringify(startups));
            localStorage.setItem(CACHE_KEY + '_time', now);
        }).catch((error) => {
            const container = document.querySelector('.content-card:nth-child(1) ul');
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Error loading startups</p>
                </div>
            `;
        });
}

/**
 * Create startup list item element
 */
function createStartupListItem(startup) {
    const li = document.createElement('li');
    
    // Get logo/image or create placeholder
    const logo = startup.imageUrls && startup.imageUrls[0] 
        ? startup.imageUrls[0] 
        : `https://placehold.co/44x44/${getRandomColor()}/${getRandomDarkColor()}?text=${getInitial(startup.name || startup.title)}`;
    
    // Get status badge
    const status = (startup.status || 'active').toLowerCase();
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Get TRL or use status
    const badge = startup.trl || statusText;
    const badgeClass = startup.trl ? 'trl' : status;
    
    li.innerHTML = `
        <div class="item-info">
            <img src="${logo}" alt="${startup.name || startup.title} Logo" onerror="this.src='https://placehold.co/44x44/3b82f6/ffffff?text=${getInitial(startup.name || startup.title)}'">
            <div>
                <p class="item-title">${startup.name || startup.title || 'Unnamed Startup'}</p>
                <p class="item-subtitle">${startup.industry || startup.category || 'General'}</p>
            </div>
        </div>
        <span class="tag ${badgeClass}">${badge}</span>
    `;
    
    return li;
}

/**
 * Load Recent Activity (Recent News & Events)
 */
function loadRecentActivity() {
    const CACHE_KEY = 'dashboard_recentActivity';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    let cached = localStorage.getItem(CACHE_KEY);
    let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
    let now = Date.now();

    if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
        // Use cached value
        let items = JSON.parse(cached);
        const container = document.querySelector('.content-card:nth-child(2) ul');
        container.innerHTML = '';
        items.forEach(item => {
            const li = createActivityListItem(item);
            container.appendChild(li);
        });
        return;
    }

    // Fetch from Firestore
    db.collection('newsEvents')
        .where('status', '==', 'published')
        .orderBy('date', 'desc')
        .limit(5)
        .get().then((snapshot) => {
            const container = document.querySelector('.content-card:nth-child(2) ul');
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        <p>No recent activity</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            let items = [];
            snapshot.forEach((doc) => {
                const item = doc.data();
                items.push(item);
                const li = createActivityListItem(item);
                container.appendChild(li);
            });

            // Cache result
            localStorage.setItem(CACHE_KEY, JSON.stringify(items));
            localStorage.setItem(CACHE_KEY + '_time', now);
        }).catch((error) => {
            const container = document.querySelector('.content-card:nth-child(2) ul');
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Error loading activity</p>
                </div>
            `;
        });
}

/**
 * Create activity list item element
 */
function createActivityListItem(item) {
    const li = document.createElement('li');
    
    // Format date
    let dateStr = 'No date';
    if (item.date) {
        try {
            const date = new Date(item.date);
            dateStr = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            dateStr = item.date;
        }
    }
    
    // Get type
    const type = (item.type || 'news').toLowerCase();
    
    li.innerHTML = `
        <div>
            <p class="item-title">${item.title || 'Untitled'}</p>
            <p class="item-subtitle">${dateStr}</p>
        </div>
        <span class="tag ${type}">${type}</span>
    `;
    
    return li;
}

/**
 * Helper: Get first letter for placeholder
 */
function getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

/**
 * Helper: Get random light color for placeholder
 */
function getRandomColor() {
    const colors = ['a2e5c2', 'f0b9b9', 'e08c8c', 'b9d7f0', 'f0e0b9', 'e0b9f0'];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Helper: Get random dark color for text
 */
function getRandomDarkColor() {
    const colors = ['333333', '2c3e50', '34495e', '1a252f'];
    return colors[Math.floor(Math.random() * colors.length)];
}

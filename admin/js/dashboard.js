/**
 * Dashboard Admin Panel
 * Real-time statistics and activity from Firestore
 */
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    initializeNotifications();
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

/**
 * ========================================
 * NOTIFICATION SYSTEM
 * ========================================
 */

let notificationsData = [];
let unreadCount = 0;
let notificationListeners = [];

/**
 * Initialize notification system
 */
function initializeNotifications() {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const markAllReadBtn = document.getElementById('markAllRead');
    const clearAllBtn = document.getElementById('clearAllNotifications');

    // Toggle dropdown
    notificationBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
            notificationDropdown.classList.remove('active');
        }
    });

    // Mark all as read
    markAllReadBtn?.addEventListener('click', markAllNotificationsAsRead);

    // Clear all notifications
    clearAllBtn?.addEventListener('click', clearAllNotifications);

    // Start listening to real-time updates
    listenToNotifications();
}

/**
 * Listen to real-time notifications from Firestore
 */
function listenToNotifications() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Listen to incubation applications
    const incubationListener = db.collection('incubation_applications')
        .where('submittedAt', '>=', firebase.firestore.Timestamp.fromDate(oneDayAgo))
        .orderBy('submittedAt', 'desc')
        .limit(20)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const notification = {
                        id: change.doc.id,
                        type: 'innovation',
                        title: 'New Incubation Application',
                        message: `${data.fullName || 'Someone'} submitted an incubation application for "${data.projectTitle || 'Untitled Project'}"`,
                        timestamp: data.submittedAt?.toDate() || new Date(),
                        read: false,
                        link: 'innovation.html',
                        data: data
                    };
                    addNotification(notification);
                }
            });
        }, (error) => {
            console.error('Error listening to incubation applications:', error);
        });

    // Listen to TBI bookings
    const bookingsListener = db.collection('tbiBookings')
        .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(oneDayAgo))
        .orderBy('createdAt', 'desc')
        .limit(20)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const notification = {
                        id: change.doc.id,
                        type: 'booking',
                        title: 'New TBI Booking',
                        message: `${data.fullName || 'Someone'} booked a ${data.serviceType || 'TBI Assessment'} on ${formatDate(data.date)}`,
                        timestamp: data.createdAt?.toDate() || new Date(),
                        read: false,
                        link: 'tbi-bookings.html',
                        data: data
                    };
                    addNotification(notification);
                }
            });
        }, (error) => {
            console.error('Error listening to TBI bookings:', error);
        });

    // Listen to project submissions (startups)
    const projectListener = db.collection('startups')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.toDate() || new Date();
                    
                    // Only notify for recent submissions (last 24 hours)
                    if (createdAt >= oneDayAgo) {
                        const notification = {
                            id: change.doc.id,
                            type: 'project',
                            title: 'New Project Submission',
                            message: `${data.founderName || data.founderFirstName || 'Someone'} submitted a new project "${data.projectName || data.name || 'Untitled Project'}"`,
                            timestamp: createdAt,
                            read: false,
                            link: 'startups.html',
                            data: data
                        };
                        addNotification(notification);
                    }
                }
            });
        }, (error) => {
            console.error('❌ Error listening to project submissions:', error);
        });

    notificationListeners.push(incubationListener, bookingsListener, projectListener);
}

/**
 * Add a notification to the list
 */
function addNotification(notification) {
    // Check if notification already exists
    const exists = notificationsData.some(n => n.id === notification.id && n.type === notification.type);
    if (exists) return;

    // Check if notification is older than last cleared time
    const lastClearedAt = localStorage.getItem('admin_notifications_cleared_at');
    if (lastClearedAt) {
        const clearedTime = new Date(lastClearedAt);
        if (notification.timestamp <= clearedTime) {
            return; // Don't add notifications older than last clear
        }
    }

    // Mark as new for highlighting
    notification.isNew = true;

    // Add to beginning of array (latest first)
    notificationsData.unshift(notification);

    // Sort by timestamp (most recent first)
    notificationsData.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to 50 notifications
    if (notificationsData.length > 50) {
        notificationsData = notificationsData.slice(0, 50);
    }

    // Update UI
    updateNotificationBadge();
    renderNotifications();

    // Auto-open dropdown briefly for brand new notifications
    flashNotificationDropdown();

    // Show browser notification if permission granted
    showBrowserNotification(notification);

    // Remove 'new' flag after 5 seconds
    setTimeout(() => {
        notification.isNew = false;
        renderNotifications();
    }, 5000);
}

/**
 * Render notifications in dropdown
 */
function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    if (notificationsData.length === 0) {
        notificationList.innerHTML = `
            <div class="notification-empty">
                <i class="fa-solid fa-bell-slash" style="font-size: 40px; color: #ddd; margin-bottom: 10px;"></i>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }

    notificationList.innerHTML = notificationsData.map(notif => {
        let iconClass = 'fa-lightbulb';
        if (notif.type === 'booking') iconClass = 'fa-calendar-check';
        else if (notif.type === 'project') iconClass = 'fa-rocket';
        
        return `
        <div class="notification-item ${notif.read ? '' : 'unread'} ${notif.isNew ? 'new-notification' : ''}" onclick="handleNotificationClick('${notif.id}', '${notif.type}', '${notif.link}')">
            <div class="notification-icon ${notif.type}">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">
                    ${notif.isNew ? '<span class="new-badge">NEW</span>' : ''}
                    ${notif.title}
                </div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-time">${getTimeAgo(notif.timestamp)}</div>
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Update notification badge count
 */
function updateNotificationBadge() {
    unreadCount = notificationsData.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
        if (unreadCount > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

/**
 * Handle notification click
 */
function handleNotificationClick(id, type, link) {
    // Mark as read
    const notification = notificationsData.find(n => n.id === id && n.type === type);
    if (notification) {
        notification.read = true;
        updateNotificationBadge();
        renderNotifications();
        
        // Save to localStorage
        saveNotificationsToStorage();
    }

    // Navigate to link
    if (link) {
        window.location.href = link;
    }
}

/**
 * Mark all notifications as read
 */
function markAllNotificationsAsRead() {
    notificationsData.forEach(n => n.read = true);
    updateNotificationBadge();
    renderNotifications();
    saveNotificationsToStorage();
}

/**
 * Clear all notifications
 */
function clearAllNotifications() {
    if (notificationsData.length === 0) return;
    
    // Save the current timestamp as the last cleared time
    localStorage.setItem('admin_notifications_cleared_at', new Date().toISOString());
    notificationsData = [];
    localStorage.setItem('admin_notifications', '[]');
    updateNotificationBadge();
    renderNotifications();
}

/**
 * Show browser notification
 */
function showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/graphics/inttoFavicon.png',
            badge: '/graphics/inttoFavicon.png'
        });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showBrowserNotification(notification);
            }
        });
    }
}

/**
 * Save notifications to localStorage
 */
function saveNotificationsToStorage() {
    try {
        localStorage.setItem('admin_notifications', JSON.stringify(notificationsData));
    } catch (e) {
        console.error('Error saving notifications:', e);
    }
}

/**
 * Load notifications from localStorage
 */
function loadNotificationsFromStorage() {
    try {
        const stored = localStorage.getItem('admin_notifications');
        if (stored) {
            notificationsData = JSON.parse(stored);
            // Convert timestamp strings back to Date objects
            notificationsData = notificationsData.map(n => ({
                ...n,
                timestamp: new Date(n.timestamp)
            }));
            updateNotificationBadge();
            renderNotifications();
        }
    } catch (e) {
        console.error('Error loading notifications:', e);
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Helper: Format date for display
 */
function formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    
    let date;
    if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } else if (dateInput.toDate) {
        date = dateInput.toDate();
    } else {
        date = dateInput;
    }
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Flash notification dropdown to draw attention
 */
function flashNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    const btn = document.getElementById('notificationBtn');
    
    if (dropdown && btn) {
        // Briefly show dropdown
        dropdown.classList.add('active');
        btn.classList.add('pulse');
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            dropdown.classList.remove('active');
            btn.classList.remove('pulse');
        }, 3000);
    }
}

// Load stored notifications on startup
loadNotificationsFromStorage();

/**
 * ========================================
 * SHARED NOTIFICATION SYSTEM
 * ========================================
 * This file provides notification functionality across all admin pages
 */

let notificationsData = [];
let unreadCount = 0;
let notificationListeners = [];

/**
 * Initialize notification system
 */
function initializeNotifications() {
    // Check if Firebase and db are available
    if (typeof firebase === 'undefined' || typeof db === 'undefined') {
        console.warn('Firebase not yet initialized, retrying in 100ms...');
        setTimeout(initializeNotifications, 100);
        return;
    }

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

    // Load stored notifications first
    loadNotificationsFromStorage();

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
            console.log('📦 Project listener triggered, changes:', snapshot.docChanges().length);
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.toDate() || new Date();
                    
                    console.log('📦 New project detected:', {
                        id: change.doc.id,
                        name: data.projectName || data.name,
                        founder: data.founderName,
                        createdAt: createdAt,
                        isRecent: createdAt >= oneDayAgo
                    });
                    
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
                        console.log('✅ Adding project notification:', notification);
                        addNotification(notification);
                    } else {
                        console.log('⏰ Project too old, skipping notification');
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

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotifications);
} else {
    // DOM already loaded
    initializeNotifications();
}

// Load latest 3 news & events for homepage
document.addEventListener('DOMContentLoaded', async () => {
    const newsCardsContainer = document.querySelector('.news-section .news-cards');
    
    if (!newsCardsContainer) {
        return;
    }
    
    if (!window.db) {
        return;
    }

    try {
        // Load latest 3 published news/events
        const CACHE_KEY = 'home_news_events';
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        let cached = localStorage.getItem(CACHE_KEY);
        let cachedTime = localStorage.getItem(CACHE_KEY + '_time');
        let now = Date.now();

        let newsEvents = [];
        if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            newsEvents = JSON.parse(cached);
        } else {
            const snapshot = await db.collection('newsEvents')
                .where('status', '==', 'published')
                .orderBy('date', 'desc')
                .limit(3)
                .get();
            
            snapshot.forEach(doc => {
                newsEvents.push({ id: doc.id, ...doc.data() });
            });

            // Cache the result
            localStorage.setItem(CACHE_KEY, JSON.stringify(newsEvents));
            localStorage.setItem(CACHE_KEY + '_time', now);
        }
        
        newsCardsContainer.innerHTML = '';
        
        if (newsEvents.length === 0) {
            newsCardsContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1/-1;">No news or events available.</p>';
            return;
        }
        
        newsEvents.forEach(item => {
            newsCardsContainer.appendChild(createNewsCard(item));
        });
        
    } catch (error) {
        newsCardsContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1/-1;">Error loading news & events.</p>';
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
            if (dateObj && !isNaN(dateObj.getTime())) {
                displayDate = dateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
        }

        const tagText = item.type === 'event' ? 'EVENT' : 'NEWS';

        const card = document.createElement('div');
        card.className = 'news-card';
        
        const excerpt = (item.content || '').substring(0, 150);
        
        card.innerHTML = `
            <img src="${coverImage}" alt="${item.title}" onerror="this.src='graphics/news.png'">
            <div class="news-content">
                <div class="news-meta">
                    <span class="tag">${tagText}</span>
                    <span class="date">${displayDate}</span>
                </div>
                <h3 class="news-title">${item.title || 'Untitled'}</h3>
                <p class="news-desc">${excerpt}...</p>
                <a href="newsEventPage.html?id=${item.id}" class="read-more">Read More →</a>
            </div>
        `;
        return card;
    }
});

/**
 * WordPress Crawler API - News & Events Feed
 * 
 * This API endpoint provides news and events data for external WordPress crawlers.
 * The WordPress site will call this endpoint to fetch published content and import it.
 * 
 * Endpoint: /api/news-events.html
 * Method: GET
 * Query Parameters:
 *   - limit: Number of items to return (default: 10, max: 100)
 *   - offset: Skip N items for pagination (default: 0)
 *   - since: ISO date string - only return items published after this date
 *   - type: Filter by 'news' or 'event' (optional)
 */

// This file is loaded as a script in news-events.html API endpoint
// It fetches from Firestore and renders JSON for WordPress crawler

(async function initNewsEventsAPI() {
    const urlParams = new URLSearchParams(window.location.search);
    const limit = Math.min(parseInt(urlParams.get('limit')) || 10, 100);
    const offset = parseInt(urlParams.get('offset')) || 0;
    const since = urlParams.get('since');
    const typeFilter = urlParams.get('type');

    try {
        // Reference to Firestore collection
        let query = db.collection('newsEvents')
            .where('status', '==', 'published')
            .orderBy('date', 'desc');

        // Apply date filter if provided
        if (since) {
            const sinceDate = new Date(since);
            query = query.where('date', '>=', sinceDate.toISOString().split('T')[0]);
        }

        // Apply type filter if provided
        if (typeFilter && (typeFilter === 'news' || typeFilter === 'event')) {
            query = query.where('type', '==', typeFilter);
        }

        // Fetch all matching documents
        const snapshot = await query.get();
        
        // Convert to array and apply pagination
        const allItems = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allItems.push({
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to ISO string for WordPress
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
                updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
            });
        });

        // Apply offset and limit
        const paginatedItems = allItems.slice(offset, offset + limit);

        // Format response for WordPress REST API compatibility
        const response = {
            success: true,
            total: allItems.length,
            count: paginatedItems.length,
            offset: offset,
            limit: limit,
            items: paginatedItems.map(item => ({
                // WordPress compatible fields
                id: item.id,
                title: item.title || 'Untitled',
                content: item.content || '',
                excerpt: item.content ? item.content.substring(0, 200) + '...' : '',
                type: item.type || 'news',
                status: 'published',
                date: item.date || null,
                created_at: item.createdAt,
                updated_at: item.updatedAt,
                
                // Featured image (first image in array)
                featured_image: item.images && item.images.length > 0 ? item.images[0] : null,
                images: item.images || [],
                
                // Metadata
                tags: item.tags || [],
                sdg_tags: (item.sdgs || []).map(sdg => `SDG ${sdg}`),
                sdg_ids: item.sdgs || [],
                
                // URLs
                url: `https://uc-intto.com/newsEventPage.html?id=${item.id}`,
                source_url: window.location.origin,
                
                // Additional metadata for WordPress
                meta: {
                    source: 'UC InTTO',
                    source_system: 'InTTO Website',
                    firestore_id: item.id,
                    original_url: `https://uc-intto.com/newsEventPage.html?id=${item.id}`
                }
            })),
            
            // Pagination metadata
            pagination: {
                total: allItems.length,
                pages: Math.ceil(allItems.length / limit),
                current_page: Math.floor(offset / limit) + 1,
                per_page: limit,
                has_next: (offset + limit) < allItems.length,
                has_prev: offset > 0,
                next_url: (offset + limit) < allItems.length 
                    ? `${window.location.pathname}?limit=${limit}&offset=${offset + limit}${typeFilter ? '&type=' + typeFilter : ''}${since ? '&since=' + since : ''}`
                    : null,
                prev_url: offset > 0
                    ? `${window.location.pathname}?limit=${limit}&offset=${Math.max(0, offset - limit)}${typeFilter ? '&type=' + typeFilter : ''}${since ? '&since=' + since : ''}`
                    : null
            },
            
            // API metadata
            generated_at: new Date().toISOString(),
            api_version: '1.0'
        };

        // Render JSON response
        renderJSON(response);

    } catch (error) {
        console.error('API Error:', error);
        renderJSON({
            success: false,
            error: 'Failed to fetch news and events',
            message: error.message,
            generated_at: new Date().toISOString()
        });
    }
})();

// Render JSON to page (for crawler consumption)
function renderJSON(data) {
    document.body.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    document.body.style.fontFamily = 'monospace';
    document.body.style.padding = '20px';
    document.body.style.backgroundColor = '#f5f5f5';
    
    // Set proper content type header via meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Type';
    meta.content = 'application/json';
    document.head.appendChild(meta);
}

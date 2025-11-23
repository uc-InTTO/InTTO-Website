/**
 * WordPress Crawler API - SDG Statistics Feed
 * 
 * This endpoint provides SDG (Sustainable Development Goals) statistics
 * from both startups and news/events in the InTTO system.
 * 
 * Endpoint: /api/sdg-stats.html
 * Method: GET
 * Query Parameters:
 *   - sdg: Filter by specific SDG number (1-17)
 *   - include: Comma-separated list of what to include: 'startups', 'news', 'events' (default: all)
 */

(async function initSDGStatsAPI() {
    const urlParams = new URLSearchParams(window.location.search);
    const sdgFilter = urlParams.get('sdg');
    const include = (urlParams.get('include') || 'startups,news,events').split(',');

    try {
        const stats = {
            success: true,
            generated_at: new Date().toISOString(),
            sdg_filter: sdgFilter ? parseInt(sdgFilter) : null,
            filters_applied: include,
            summary: {},
            details: {}
        };

        // Fetch startups if requested
        if (include.includes('startups')) {
            const startupsSnapshot = await db.collection('startups').get();
            const startups = [];
            
            startupsSnapshot.forEach(doc => {
                const data = doc.data();
                const sdgs = Array.isArray(data.sdgs) ? data.sdgs.map(s => String(s).replace('SDG ', '')) : [];
                
                // Apply SDG filter if specified
                if (!sdgFilter || sdgs.includes(String(sdgFilter))) {
                    startups.push({
                        id: doc.id,
                        name: data.startupName || data.name || 'Unnamed Startup',
                        sdgs: sdgs,
                        sector: data.sector || data.industry || null,
                        status: data.status || null,
                        url: `https://uc-intto.com/startup-details.html?id=${doc.id}`
                    });
                }
            });
            
            stats.details.startups = startups;
            stats.summary.startups_count = startups.length;
        }

        // Fetch news & events if requested
        if (include.includes('news') || include.includes('events')) {
            let query = db.collection('newsEvents').where('status', '==', 'published');
            
            const newsEventsSnapshot = await query.get();
            const news = [];
            const events = [];
            
            newsEventsSnapshot.forEach(doc => {
                const data = doc.data();
                const sdgs = Array.isArray(data.sdgs) ? data.sdgs.map(s => String(s).replace('SDG ', '')) : [];
                
                // Apply SDG filter if specified
                if (!sdgFilter || sdgs.includes(String(sdgFilter))) {
                    const item = {
                        id: doc.id,
                        title: data.title || 'Untitled',
                        type: data.type || 'news',
                        sdgs: sdgs,
                        date: data.date || null,
                        url: `https://uc-intto.com/newsEventPage.html?id=${doc.id}`
                    };
                    
                    if (data.type === 'event' && include.includes('events')) {
                        events.push(item);
                    } else if (data.type !== 'event' && include.includes('news')) {
                        news.push(item);
                    }
                }
            });
            
            if (include.includes('news')) {
                stats.details.news = news;
                stats.summary.news_count = news.length;
            }
            
            if (include.includes('events')) {
                stats.details.events = events;
                stats.summary.events_count = events.length;
            }
        }

        // Calculate SDG distribution
        const sdgDistribution = {};
        
        // Count from all sources
        ['startups', 'news', 'events'].forEach(source => {
            if (stats.details[source]) {
                stats.details[source].forEach(item => {
                    item.sdgs.forEach(sdg => {
                        if (!sdgDistribution[sdg]) {
                            sdgDistribution[sdg] = {
                                sdg_number: parseInt(sdg),
                                sdg_name: getSDGName(parseInt(sdg)),
                                total_count: 0,
                                startups: 0,
                                news: 0,
                                events: 0
                            };
                        }
                        sdgDistribution[sdg].total_count++;
                        sdgDistribution[sdg][source]++;
                    });
                });
            }
        });

        // Convert to sorted array
        stats.sdg_distribution = Object.values(sdgDistribution).sort((a, b) => a.sdg_number - b.sdg_number);
        
        // Total counts
        stats.summary.total_items = (stats.summary.startups_count || 0) + 
                                     (stats.summary.news_count || 0) + 
                                     (stats.summary.events_count || 0);
        stats.summary.unique_sdgs = Object.keys(sdgDistribution).length;

        renderJSON(stats);

    } catch (error) {
        console.error('API Error:', error);
        renderJSON({
            success: false,
            error: 'Failed to fetch SDG statistics',
            message: error.message,
            generated_at: new Date().toISOString()
        });
    }
})();

// Get SDG name from number
function getSDGName(sdgNumber) {
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
    return sdgNames[sdgNumber] || "Unknown SDG";
}

// Render JSON to page
function renderJSON(data) {
    document.body.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    document.body.style.fontFamily = 'monospace';
    document.body.style.padding = '20px';
    document.body.style.backgroundColor = '#f5f5f5';
    
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Type';
    meta.content = 'application/json';
    document.head.appendChild(meta);
}

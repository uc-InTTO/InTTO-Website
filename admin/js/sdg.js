document.addEventListener('DOMContentLoaded', async () => {
    // --- Firestore Collections ---
    const STARTUPS_COLLECTION = 'startups';
    const NEWS_EVENTS_COLLECTION = 'newsEvents';
    
    // --- Chart.js Instance ---
    let sdgChart = null;

    // --- DOM Elements ---
    const tabs = document.querySelectorAll('.tab-btn');
    const totalUsageEl = document.getElementById('total-sdg-usage');
    const uniqueSdgsEl = document.getElementById('unique-sdgs');
    const itemCountEl = document.getElementById('item-count');
    const itemCountLabelEl = document.getElementById('item-count-label');
    const chartCanvas = document.getElementById('sdgPieChart');
    const breakdownListEl = document.getElementById('sdg-breakdown-list'); // Added

    // --- Master List of SDGs (1-17 Ordered) ---
    const SDG_CONSTANTS = [
        { id: 1,  code: "SDG 1",  name: "No Poverty", color: "#E5243B" },
        { id: 2,  code: "SDG 2",  name: "Zero Hunger", color: "#DDA63A" },
        { id: 3,  code: "SDG 3",  name: "Good Health and Well-being", color: "#4C9F38" },
        { id: 4,  code: "SDG 4",  name: "Quality Education", color: "#C5192D" },
        { id: 5,  code: "SDG 5",  name: "Gender Equality", color: "#FF3A21" },
        { id: 6,  code: "SDG 6",  name: "Clean Water and Sanitation", color: "#26BDE2" },
        { id: 7,  code: "SDG 7",  name: "Affordable and Clean Energy", color: "#FCC30B" },
        { id: 8,  code: "SDG 8",  name: "Decent Work and Economic Growth", color: "#A21942" },
        { id: 9,  code: "SDG 9",  name: "Industry, Innovation and Infrastructure", color: "#FD6925" },
        { id: 10, code: "SDG 10", name: "Reduced Inequalities", color: "#DD1367" },
        { id: 11, code: "SDG 11", name: "Sustainable Cities and Communities", color: "#FD9D24" },
        { id: 12, code: "SDG 12", name: "Responsible Consumption and Production", color: "#BF8B2E" },
        { id: 13, code: "SDG 13", name: "Climate Action", color: "#3F7E44" },
        { id: 14, code: "SDG 14", name: "Life Below Water", color: "#0A97D9" },
        { id: 15, code: "SDG 15", name: "Life on Land", color: "#56C02B" },
        { id: 16, code: "SDG 16", name: "Peace, Justice and Strong Institutions", color: "#00689D" },
        { id: 17, code: "SDG 17", name: "Partnerships for the Goals", color: "#19486A" }
    ];

    // --- Load Data from Firestore ---
    const loadStartupsFromFirestore = async () => {
        try {
            const snapshot = await db.collection(STARTUPS_COLLECTION).get();
            const startups = [];
            snapshot.forEach(doc => {
                startups.push({ firestoreId: doc.id, ...doc.data() });
            });
            return startups;
        } catch (error) {
            return [];
        }
    };

    const loadNewsEventsFromFirestore = async () => {
        try {
            const snapshot = await db.collection(NEWS_EVENTS_COLLECTION).get();
            const newsEvents = [];
            snapshot.forEach(doc => {
                newsEvents.push({ firestoreId: doc.id, ...doc.data() });
            });
            return newsEvents;
        } catch (error) {
            return [];
        }
    };

    // --- Main Function to Update Dashboard ---
    const updateDashboard = async (filter) => {
        
        // UI Loading State
        totalUsageEl.textContent = '...';
        uniqueSdgsEl.textContent = '...';
        itemCountEl.textContent = '...';
        if(breakdownListEl) breakdownListEl.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Loading data...</p>';

        const startups = await loadStartupsFromFirestore();
        const newsEvents = await loadNewsEventsFromFirestore();

        let itemsToProcess = [];
        let itemCountLabel = 'Items';

        if (filter === 'all') {
            itemsToProcess = [...startups, ...newsEvents];
            itemCountLabel = 'Total Items';
        } else if (filter === 'startup') {
            itemsToProcess = startups;
            itemCountLabel = 'Startups';
        } else if (filter === 'news_event') {
            itemsToProcess = newsEvents;
            itemCountLabel = 'News & Events';
        }

        // Initialize counters for all 17 SDGs
        let totalUsage = 0;
        let itemCount = 0;
        const sdgCounts = {};
        
        // Initialize count 0 for all IDs 1-17
        SDG_CONSTANTS.forEach(sdg => sdgCounts[sdg.id] = 0);

        itemsToProcess.forEach(item => {
            let itemSDGs = item.sdgs || [];
            
            // --- Normalize SDG data to numbers correctly ---
            if (Array.isArray(itemSDGs)) {
                itemSDGs = itemSDGs.map(sdg => {
                    let num = sdg;
                    if (typeof sdg === 'string') {
                        const match = sdg.match(/\d+/);
                        num = match ? parseInt(match[0], 10) : NaN;
                    }
                    return (isNaN(num) || num === null) ? null : parseInt(num, 10);
                }).filter(sdg => sdg !== null);
            }

            if (itemSDGs.length > 0) {
                itemCount++;
                totalUsage += itemSDGs.length;
                
                itemSDGs.forEach(sdgNum => {
                    if (sdgNum >= 1 && sdgNum <= 17) {
                        sdgCounts[sdgNum]++;
                    }
                });
            }
        });

        // Calculate how many *different* SDGs are active
        const uniqueSdgs = Object.values(sdgCounts).filter(count => count > 0).length;

        // --- Update Stat Cards ---
        totalUsageEl.textContent = totalUsage;
        uniqueSdgsEl.textContent = uniqueSdgs;
        itemCountEl.textContent = itemCount;
        itemCountLabelEl.textContent = itemCountLabel;

        // --- Prepare Data for Visualization (Strictly 1-17) ---
        const preparedData = SDG_CONSTANTS.map(sdg => ({
            ...sdg,
            count: sdgCounts[sdg.id] || 0
        }));

        updateGraph(preparedData);
        updateList(preparedData);
    };

    // --- Render the Graph (Sorted 1-17) ---
    const updateGraph = (data) => {
        if (!chartCanvas) return;

        if (typeof Chart === 'undefined') {
            return;
        }

        if (sdgChart) {
            sdgChart.destroy();
        }

        // Filter labels/data for chart:
        const activeData = data.filter(item => item.count > 0); 

        // If no data at all
        if (activeData.length === 0) {
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            ctx.font = '14px Poppins, sans-serif';
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            ctx.fillText('No SDG data found', chartCanvas.width / 2, chartCanvas.height / 2);
            return;
        }

        sdgChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: activeData.map(item => `${item.code}: ${item.name}`),
                datasets: [{
                    data: activeData.map(item => item.count),
                    backgroundColor: activeData.map(item => item.color),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { family: "'Poppins', sans-serif", size: 11 }
                        }
                    }
                }
            }
        });
    };

    // --- Render the List (Strictly 1-17) ---
    const updateList = (data) => {
        if (!breakdownListEl) return;
        
        breakdownListEl.innerHTML = '';

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'sdg-item-card';
            card.style.borderLeftColor = item.color;

            // Fade out cards with 0 count
            if (item.count === 0) {
                card.style.opacity = '0.6'; 
            }

            card.innerHTML = `
                <div class="sdg-item-info">
                    <h4 style="color: ${item.color}">${item.code}</h4>
                    <p>${item.name}</p>
                </div>
                <div class="sdg-item-count">
                    ${item.count}
                </div>
            `;
            breakdownListEl.appendChild(card);
        });
    };

    // --- Tab Event Listeners ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateDashboard(tab.dataset.filter);
        });
    });

    // --- Init ---
    await updateDashboard('all');
});
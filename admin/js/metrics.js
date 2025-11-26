// ===================================
// LIVE GOOGLE SHEETS METRICS DASHBOARD
// ===================================
const CONFIG = {
    API_KEY: 'AIzaSyAzUTxdA5Dqgyj-ZqUB5YHDfnZDU7gLTg8',
    SHEET_ID: '15MutTSdpR-1-iQcuFsMnuTD52vkfLaWwQgdDsBdYdRg'
};

const TABS_CONFIG = [
    { id: 'active-startups', sheetName: 'Active Startups', icon: 'fa-rocket' },
    { id: 'kra', sheetName: 'KRA', icon: 'fa-bullseye' },
    { id: 'cohort', sheetName: 'Cohort Information', icon: 'fa-users-gear' },
    { id: 'tbi-metrics', sheetName: 'TBI Metrics', icon: 'fa-chart-line' },
    { id: 'investment', sheetName: 'Investments Received', icon: 'fa-hand-holding-dollar' },
    { id: 'revenue', sheetName: 'Revenue Generated', icon: 'fa-money-bill-trend-up' },
    { id: 'incubation-kpi', sheetName: 'Incubation KPI', icon: 'fa-chart-simple' },
    { id: 'incubation-metrics', sheetName: 'Incubation Metrics', icon: 'fa-building' }
];

// Load data for all tabs
async function loadAllTabsData() {
    updateLastUpdateTime();
    
    for (const tab of TABS_CONFIG) {
        await loadTabData(tab);
    }
}

// Load data for a specific tab using direct API call
async function loadTabData(tab) {
    const tableId = `${tab.id}-table`;
    const countId = `${tab.id}-count`;
    const table = document.getElementById(tableId);
    const countBadge = document.getElementById(countId);
    
    try {
        // Show loading state
        table.innerHTML = `
            <thead><tr><th>Loading...</th></tr></thead>
            <tbody><tr><td class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading data...</td></tr></tbody>
        `;
        
        // Encode sheet name for URL
        const encodedSheetName = encodeURIComponent(tab.sheetName);
        
        // Direct fetch to Google Sheets API (no OAuth needed for public sheets)
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodedSheetName}!A:Z?key=${CONFIG.API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        const data = result.values;
        
        if (!data || data.length === 0) {
            table.innerHTML = `
                <thead><tr><th>No Data</th></tr></thead>
                <tbody><tr><td class="empty-state"><i class="fa-solid fa-inbox"></i><br>No data available in this sheet</td></tr></tbody>
            `;
            countBadge.textContent = '0';
            return;
        }
        
        // Render table
        renderTable(table, data, tab.id);
        
        // Update count (rows minus header)
        const rowCount = data.length - 1;
        countBadge.textContent = rowCount > 0 ? rowCount : '0';
        
    } catch (error) {
        let errorMessage = error.message;
        
        // Provide helpful error messages
        if (error.message.includes('403')) {
            errorMessage = 'Access denied. Make sure the sheet is shared publicly or check API key permissions.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Sheet not found. Check if the tab name matches exactly.';
        } else if (error.message.includes('400')) {
            errorMessage = 'Bad request. The sheet may not be a Google Sheets file.';
        }
        
        table.innerHTML = `
            <thead><tr><th>Error</th></tr></thead>
            <tbody><tr><td class="error-state">
                <i class="fa-solid fa-circle-exclamation"></i><br>
                Failed to load data<br>
                <small style="font-size: 0.85em; opacity: 0.8;">${errorMessage}</small>
            </td></tr></tbody>
        `;
        countBadge.textContent = '!';
    }
}

// Render table with data
function renderTable(tableElement, data, tabId = '') {
    if (!data || data.length === 0) return;
    
    let headers = data[0];
    let rows = data.slice(1);
    
    // Special handling for KRA tab - skip first row (title row) and use second row as headers
    if (tabId === 'kra' && data.length > 1) {
        const secondRow = data[1];
        if (secondRow && secondRow.some(cell => cell && (cell.includes('Goal') || cell.includes('Target') || cell.includes('Total')))) {
            headers = secondRow;
            rows = data.slice(2);
        }
    }
    
    // Special handling for Incubation Metrics - skip first row (title row) and use second row as headers
    if (tabId === 'incubation-metrics' && data.length > 1) {
        const secondRow = data[1];
        if (secondRow && secondRow.some(cell => cell && (cell.includes('Incubation Program') || cell.includes('Industry Summary')))) {
            headers = secondRow;
            rows = data.slice(2);
        }
    }
    
    // Column filtering for specific tabs
    let columnsToShow = [];
    
    if (tabId === 'kra') {
        // For KRA: show only Target, Total, %, Notes
        const targetIndex = headers.findIndex(h => h && h.toLowerCase().includes('target'));
        const totalIndex = headers.findIndex(h => h && h.toLowerCase().includes('total'));
        const percentIndex = headers.findIndex(h => h && (h === '%' || h.toLowerCase().includes('percent')));
        const notesIndex = headers.findIndex(h => h && h.toLowerCase().includes('notes'));
        
        columnsToShow = [targetIndex, totalIndex, percentIndex, notesIndex].filter(i => i !== -1);
    }
    
    // Build table HTML
    let html = '<thead><tr>';
    headers.forEach((header, index) => {
        // For KRA, only show specific columns
        if (tabId === 'kra' && columnsToShow.length > 0 && !columnsToShow.includes(index)) {
            return;
        }
        html += `<th>${header || ''}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    rows.forEach((row, rowIndex) => {
        // Skip completely empty rows
        if (!row || row.every(cell => !cell || cell.trim() === '')) {
            return;
        }
        
        // For KRA, skip rows that don't have data in the target columns
        if (tabId === 'kra' && columnsToShow.length > 0) {
            const hasData = columnsToShow.some(colIndex => row[colIndex] && row[colIndex].trim() !== '');
            if (!hasData) {
                return;
            }
        }
        
        html += '<tr>';
        headers.forEach((header, index) => {
            // For KRA, only show specific columns
            if (tabId === 'kra' && columnsToShow.length > 0 && !columnsToShow.includes(index)) {
                return;
            }
            
            const cellValue = row[index] || '';
            let cellClass = '';
            let displayValue = cellValue;
            
            // Apply special formatting
            // Percentage cells
            if (cellValue.toString().includes('%')) {
                const percentMatch = cellValue.match(/(\d+\.?\d*)/);
                if (percentMatch) {
                    const percentage = parseFloat(percentMatch[1]);
                    if (percentage >= 80) {
                        cellClass = 'percentage-high';
                    } else if (percentage >= 50) {
                        cellClass = 'percentage-medium';
                    } else if (percentage > 0) {
                        cellClass = 'percentage-low';
                    }
                }
            }
            
            // Currency cells
            if (cellValue.toString().includes('₱') || cellValue.toString().includes('$') || 
                cellValue.toString().includes('PHP') || cellValue.toString().includes('USD')) {
                cellClass = 'currency';
            }
            
            html += `<td class="${cellClass}">${displayValue}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody>';
    tableElement.innerHTML = html;
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    document.getElementById('last-update-time').textContent = timeString;
}

// Show error message to all sections
function showGlobalError(message) {
    const sections = document.querySelectorAll('.tab-section');
    sections.forEach(section => {
        const table = section.querySelector('.data-table');
        if (table) {
            table.innerHTML = `
                <thead><tr><th>Error</th></tr></thead>
                <tbody><tr><td class="error-state">
                    <i class="fa-solid fa-circle-exclamation"></i><br>
                    ${message}
                </td></tr></tbody>
            `;
        }
    });
}

// Toggle tab content (exclusive - only one open at a time)
function setupCollapsibleTabs() {
    document.querySelectorAll('.tab-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isCurrentlyOpen = content.classList.contains('active');
            
            // Close all tabs
            document.querySelectorAll('.tab-content').forEach(tabContent => {
                tabContent.classList.remove('active');
            });
            
            // If the clicked tab was closed, open it
            if (!isCurrentlyOpen) {
                content.classList.add('active');
            }
        });
    });
}

// Auto-refresh every 5 minutes
function setupAutoRefresh() {
    setInterval(() => {
        loadAllTabsData();
    }, 5 * 60 * 1000); // 5 minutes
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Setup refresh button
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadAllTabsData();
        });
    }
    
    // Setup collapsible tabs
    setupCollapsibleTabs();
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    // Initial data load
    setTimeout(() => {
        loadAllTabsData();
    }, 500); // Small delay to ensure DOM is ready
});

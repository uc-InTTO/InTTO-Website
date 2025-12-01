// Load IP data from Firestore and populate ipp.html
document.addEventListener('DOMContentLoaded', async () => {
    // Firebase config
    const firebaseConfig = {
        apiKey: "AIzaSyAXNIo4h3Uv7Z8IGdm01zQ8K4WY4G8VLzE",
        authDomain: "uc-intto.firebaseapp.com",
        projectId: "uc-intto",
        storageBucket: "uc-intto.firebasestorage.app",
        messagingSenderId: "156771180433",
        appId: "1:156771180433:web:4f9d57eb6b0e7882ef0430",
        measurementId: "G-ETY9E0F1K6"
    };

    // Initialize Firebase
    if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    try {
        // Load IP applications from Firestore
        const snapshot = await db.collection('ipApplications')
            .where('status', '==', 'granted')
            .get();

        let ipData = [];
        snapshot.forEach(doc => {
            ipData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Group by type
        const copyrightData = ipData.filter(ip => ip.type === 'Copyright');
        const trademarkData = ipData.filter(ip => ip.type === 'Trademark');
        const utilityData = ipData.filter(ip => ip.type === 'Utility Model');
        const patentData = ipData.filter(ip => ip.type === 'Patent');
        const industrialData = ipData.filter(ip => ip.type === 'Industrial Design');

        // Update counts in summary table
        updateSummaryTable(copyrightData.length, trademarkData.length, utilityData.length, patentData.length, industrialData.length);

        // Update total badge
        const totalRegistered = ipData.length;
        document.querySelector('.big-number').textContent = totalRegistered;

        // Update category cards
        updateCategoryCards(copyrightData.length, trademarkData.length, utilityData.length, patentData.length, industrialData.length);

        // Update modal record counts
        document.querySelector('#copyright-modal .modal-title p').textContent = `${copyrightData.length} records found in database`;
        document.querySelector('#trademark-modal .modal-title p').textContent = `${trademarkData.length} records found in database`;
        document.querySelector('#utility-modal .modal-title p').textContent = `${utilityData.length} records found in database`;
        document.querySelector('#patent-modal .modal-title p').textContent = `${patentData.length} records found in database`;
        document.querySelector('#industrial-modal .modal-title p').textContent = `${industrialData.length} records found in database`;

        // Populate tables
        populateCopyrightTable(copyrightData);
        populateTrademarkTable(trademarkData);
        populateUtilityTable(utilityData);
        populatePatentTable(patentData);
        populateIndustrialTable(industrialData);

    } catch (error) {
        console.error('Error loading IP data:', error);
    }
});

function updateSummaryTable(copyrightCount, trademarkCount, utilityCount, patentCount, industrialCount) {
    const tbody = document.querySelector('.ip-table tbody');
    
    tbody.innerHTML = `
        <tr>
            <td><i class="fa-regular fa-copyright"></i> Copyright</td>
            <td>${copyrightCount}</td>
            <td><span class="status-${copyrightCount > 0 ? 'active' : 'inactive'}">${copyrightCount > 0 ? 'Active' : 'None'}</span></td>
        </tr>
        <tr>
            <td><i class="fa-solid fa-tag"></i> Trademark</td>
            <td>${trademarkCount}</td>
            <td><span class="status-${trademarkCount > 0 ? 'active' : 'inactive'}">${trademarkCount > 0 ? 'Active' : 'None'}</span></td>
        </tr>
        <tr>
            <td><i class="fa-regular fa-lightbulb"></i> Utility Model</td>
            <td>${utilityCount}</td>
            <td><span class="status-${utilityCount > 0 ? 'active' : 'inactive'}">${utilityCount > 0 ? 'Active' : 'None'}</span></td>
        </tr>
        <tr>
            <td><i class="fa-solid fa-scroll"></i> Patent</td>
            <td>${patentCount}</td>
            <td><span class="status-${patentCount > 0 ? 'active' : 'inactive'}">${patentCount > 0 ? 'Active' : 'None'}</span></td>
        </tr>
        <tr>
            <td><i class="fa-solid fa-pen-ruler"></i> Industrial Design</td>
            <td>${industrialCount}</td>
            <td><span class="status-${industrialCount > 0 ? 'active' : 'inactive'}">${industrialCount > 0 ? 'Active' : 'None'}</span></td>
        </tr>
    `;
}

function updateCategoryCards(copyrightCount, trademarkCount, utilityCount, patentCount, industrialCount) {
    const categoryCards = document.querySelectorAll('.cat-card');
    
    // Update Copyright card
    const copyrightCard = categoryCards[0];
    copyrightCard.querySelector('.count-badge').textContent = `${copyrightCount} Records`;
    
    // Update Trademark card
    const trademarkCard = categoryCards[1];
    trademarkCard.querySelector('.count-badge').textContent = `${trademarkCount} Records`;
    
    // Update Utility Model card
    const utilityCard = categoryCards[2];
    utilityCard.querySelector('.count-badge').textContent = `${utilityCount} Records`;
    
    // Update Patent card
    const patentCard = categoryCards[3];
    patentCard.querySelector('.count-badge').textContent = `${patentCount} Records`;
    if (patentCount > 0) {
        patentCard.classList.remove('disabled');
        patentCard.querySelector('.count-badge').classList.remove('gray');
        patentCard.querySelector('.cat-icon').classList.remove('gray');
    }
    
    // Update Industrial Design card
    const industrialCard = categoryCards[4];
    industrialCard.querySelector('.count-badge').textContent = `${industrialCount} Records`;
    if (industrialCount > 0) {
        industrialCard.classList.remove('disabled');
        industrialCard.querySelector('.count-badge').classList.remove('gray');
        industrialCard.querySelector('.cat-icon').classList.remove('gray');
    }
}

function populateCopyrightTable(data) {
    const tbody = document.querySelector('#copyrightTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No copyright registrations found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((ip, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${ip.number || 'N/A'}</td>
            <td>${ip.title || 'Untitled'}</td>
            <td>${ip.inventors || 'N/A'}</td>
            <td>${formatDate(ip.grantDate || ip.appDate)}</td>
        </tr>
    `).join('');
}

function populateTrademarkTable(data) {
    const tbody = document.querySelector('#trademarkTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No trademark registrations found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((ip, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${ip.number || 'N/A'}</td>
            <td>${ip.title || 'Untitled'}</td>
            <td>${formatDate(ip.grantDate || ip.appDate)}</td>
        </tr>
    `).join('');
}

function populateUtilityTable(data) {
    const tbody = document.querySelector('#utilityTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No utility model registrations found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((ip, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${ip.number || 'N/A'}</td>
            <td>${ip.title || 'Untitled'}</td>
            <td>${ip.inventors || 'N/A'}</td>
            <td>${formatDate(ip.grantDate || ip.appDate)}</td>
        </tr>
    `).join('');
}

function populatePatentTable(data) {
    const tbody = document.querySelector('#patentTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No patent registrations found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((ip, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${ip.number || 'N/A'}</td>
            <td>${ip.title || 'Untitled'}</td>
            <td>${ip.inventors || 'N/A'}</td>
            <td>${formatDate(ip.grantDate || ip.appDate)}</td>
        </tr>
    `).join('');
}

function populateIndustrialTable(data) {
    const tbody = document.querySelector('#industrialTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No industrial design registrations found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((ip, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${ip.number || 'N/A'}</td>
            <td>${ip.title || 'Untitled'}</td>
            <td>${ip.inventors || 'N/A'}</td>
            <td>${formatDate(ip.grantDate || ip.appDate)}</td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    // If it's already formatted, return as is
    if (dateString.includes('/')) return dateString;
    
    // Convert YYYY-MM-DD to M/D/YYYY
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

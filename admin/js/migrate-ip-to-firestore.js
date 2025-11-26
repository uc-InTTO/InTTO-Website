/**
 * IP Applications Data Migration Script
 * Run this once to migrate localStorage data to Firestore
 * 
 * Open browser console on ip-applications.html and paste this script
 */

async function migrateIPApplicationsToFirestore() {
    
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined' || !window.db) {
        return;
    }
    
    // Get localStorage data
    const STORAGE_KEY = 'ucInttoIpData';
    const localData = localStorage.getItem(STORAGE_KEY);
    
    if (!localData) {
        return;
    }
    
    try {
        const ipApplications = JSON.parse(localData);
        
        // Check if already migrated
        const existingSnapshot = await db.collection('ipApplications').limit(1).get();
        if (!existingSnapshot.empty) {
            const proceed = confirm(
                `Firestore already contains IP applications.\n\n` +
                `Do you want to add ${ipApplications.length} more from localStorage?\n\n` +
                `Click OK to add them, or Cancel to skip migration.`
            );
            if (!proceed) {
                return;
            }
        }
        
        // Migrate each IP application
        let successCount = 0;
        let errorCount = 0;
        
        for (const ip of ipApplications) {
            try {
                // Remove old ID field, Firestore will generate new ones
                const { id, ...ipData } = ip;
                
                // Add timestamps
                ipData.createdAt = firebase.firestore.Timestamp.now();
                ipData.updatedAt = firebase.firestore.Timestamp.now();
                
                // Ensure keywords is an array
                if (!Array.isArray(ipData.keywords)) {
                    ipData.keywords = [];
                }
                
                await db.collection('ipApplications').add(ipData);
                successCount;
            } catch (error) {
                errorCount++;
            }
        }
        
        // Ask if user wants to clear localStorage
        if (successCount > 0) {
            const clearLocal = confirm(
                `Migration successful!\n\n` +
                `${successCount} IP applications are now in Firestore.\n\n` +
                `Do you want to clear the old localStorage data?\n` +
                `(This is recommended to avoid confusion)`
            );
            
            if (clearLocal) {
                localStorage.removeItem(STORAGE_KEY);
                alert('Migration complete! The page will reload to show Firestore data.');
                window.location.reload();
            } else {
                alert('Migration complete! Refresh the page to see Firestore data.');
            }
        }
        
    } catch (error) {
        alert('Migration failed. Check console for details.');
    }
}

// Migration function is available globally
// Run migrateIPApplicationsToFirestore() in console when needed

/**
 * IP Applications Data Migration Script
 * Run this once to migrate localStorage data to Firestore
 * 
 * Open browser console on ip-applications.html and paste this script
 */

async function migrateIPApplicationsToFirestore() {
    console.log('🔄 Starting IP Applications migration to Firestore...');
    
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined' || !window.db) {
        console.error('❌ Firebase not initialized. Make sure you\'re on the IP Applications page.');
        return;
    }
    
    // Get localStorage data
    const STORAGE_KEY = 'ucInttoIpData';
    const localData = localStorage.getItem(STORAGE_KEY);
    
    if (!localData) {
        console.log('ℹ️ No localStorage data found. Nothing to migrate.');
        return;
    }
    
    try {
        const ipApplications = JSON.parse(localData);
        console.log(`📊 Found ${ipApplications.length} IP applications in localStorage`);
        
        // Check if already migrated
        const existingSnapshot = await db.collection('ipApplications').limit(1).get();
        if (!existingSnapshot.empty) {
            const proceed = confirm(
                `Firestore already contains IP applications.\n\n` +
                `Do you want to add ${ipApplications.length} more from localStorage?\n\n` +
                `Click OK to add them, or Cancel to skip migration.`
            );
            if (!proceed) {
                console.log('⏭️ Migration cancelled by user');
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
                successCount++;
                console.log(`✅ Migrated: ${ipData.title}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Error migrating ${ip.title}:`, error);
            }
        }
        
        console.log(`\n🎉 Migration Complete!`);
        console.log(`✅ Successfully migrated: ${successCount}`);
        if (errorCount > 0) {
            console.log(`❌ Failed: ${errorCount}`);
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
                console.log('🗑️ localStorage data cleared');
                alert('Migration complete! The page will reload to show Firestore data.');
                window.location.reload();
            } else {
                console.log('ℹ️ localStorage data kept (you can delete it manually later)');
                alert('Migration complete! Refresh the page to see Firestore data.');
            }
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        alert('Migration failed. Check console for details.');
    }
}

// Instructions
console.log(`
╔════════════════════════════════════════════════════════════╗
║     IP Applications Migration to Firestore                 ║
╚════════════════════════════════════════════════════════════╝

To migrate your IP Applications data from localStorage to Firestore:

1. Make sure you're on the IP Applications admin page
2. Run this command in the console:

   migrateIPApplicationsToFirestore()

3. Follow the prompts

Note: This only needs to be run ONCE to migrate existing data.
After migration, all new IP applications will automatically save to Firestore.
`);

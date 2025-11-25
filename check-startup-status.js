const admin = require('firebase-admin');
const serviceAccount = require('./Contact-Us-DB/intto-website-8dd5c-firebase-adminsdk-i5mhp-5cd7f2c27c.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

(async () => {
  const snapshot = await db.collection('startups').get();
  console.log('\n=== STARTUP STATUS SUMMARY ===\n');
  
  let statusCount = {};
  let incubationCount = {};
  let combined = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'undefined';
    const incubation = data.incubationStatus || 'undefined';
    const combo = status + ' + ' + incubation;
    
    statusCount[status] = (statusCount[status] || 0) + 1;
    incubationCount[incubation] = (incubationCount[incubation] || 0) + 1;
    combined[combo] = (combined[combo] || 0) + 1;
    
    console.log(doc.id + ': status="' + status + '" incubationStatus="' + incubation + '" name="' + (data.name || 'Unnamed') + '"');
  });
  
  console.log('\n--- Status Distribution ---');
  Object.entries(statusCount).forEach(([k,v]) => console.log(k + ': ' + v));
  
  console.log('\n--- Incubation Status Distribution ---');
  Object.entries(incubationCount).forEach(([k,v]) => console.log(k + ': ' + v));
  
  console.log('\n--- Combined (status + incubationStatus) ---');
  Object.entries(combined).forEach(([k,v]) => console.log(k + ': ' + v));
  
  console.log('\n=== HOMEPAGE WILL SHOW: status=active AND incubationStatus=incubated ===');
  
  process.exit(0);
})();

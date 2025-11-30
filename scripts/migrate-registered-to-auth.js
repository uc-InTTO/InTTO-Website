// Migration script: create Firebase Auth users from Registered Accounts Firestore
// Usage: node migrate-registered-to-auth.js --serviceAccount=path/to/serviceAccount.json
// WARNING: This script requires service account credentials and admin privileges.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function usage() {
    console.log(`Usage: node migrate-registered-to-auth.js --serviceAccount=path/to/serviceAccount.json [--dryRun]`);
}

async function main() {
    const argv = process.argv.slice(2);
    const opts = {};
    argv.forEach(arg => {
        const [k,v] = arg.split('=');
        if (k === '--serviceAccount') opts.serviceAccount = v;
        if (k === '--dryRun') opts.dryRun = true;
    });

    if (!opts.serviceAccount) {
        usage();
        process.exit(1);
    }

    const saPath = path.resolve(opts.serviceAccount);
    if (!fs.existsSync(saPath)) {
        console.error('Service account file not found:', saPath);
        process.exit(1);
    }

    const sa = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    const db = admin.firestore();
    const auth = admin.auth();

    console.log('Scanning Registered Accounts in Firestore...');

    const usersToCreate = [];
    const snapshot = await db.collection('Registered Accounts').get();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const email = data.email;
        if (!email) continue;
        try {
            await auth.getUserByEmail(email);
            console.log(`Auth user exists for ${email} (UID found)`);
        } catch (err) {
            if (err.code === 'auth/user-not-found' || /not-found/i.test(err.message)) {
                usersToCreate.push({ docId: doc.id, email, data });
            } else {
                console.warn('Auth getUserByEmail error for', email, err.message);
            }
        }
    }

    console.log(`Detected ${usersToCreate.length} registered account(s) without Auth users.`);
    if (usersToCreate.length === 0) {
        console.log('Nothing to migrate. Exiting.');
        return;
    }

    if (opts.dryRun) {
        console.log('Dry run, not creating users. Summary:');
        usersToCreate.forEach(u => console.log('-', u.email, 'docId:', u.docId));
        return;
    }

    console.warn('Creating users in Firebase Auth for these entries. This is destructive if not expected.');
    for (const u of usersToCreate) {
        try {
            console.log('Creating Auth user for', u.email);
            const createdUser = await auth.createUser({ email: u.email, emailVerified: false, disabled: false });
            console.log('Created UID:', createdUser.uid);

            // update collection doc with the created UID and mark migration
            await db.collection('Registered Accounts').doc(u.docId).set({ authCreated: true, authUid: createdUser.uid }, { merge: true });

            // Generate password reset link to email to user (so they can set a password)
            const link = await auth.generatePasswordResetLink(u.email);
            console.log(`Password reset link for ${u.email}: ${link}`);

            // Optionally: email the link via your SMTP or EmailJS. For this script we'll log it.
        } catch (err) {
            console.error('Failed creating user for', u.email, err.message || err);
        }
    }

    console.log('Migration complete. Please review and send reset links to users as needed.');
}

main().catch(err => {
    console.error('Migration script error:', err);
    process.exit(1);
});

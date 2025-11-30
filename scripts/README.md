Migration script: Create Firebase Auth users for Firestore 'Registered Accounts'

Prerequisites:
- You must have a Firebase project service account Key (JSON). Get it from Firebase console -> Project Settings -> Service accounts -> Generate new private key.
- Node.js installed.

Instructions:
1. Save the service account JSON somewhere secure and note the path.
2. Run a dry run to review which emails will be affected:

```powershell
node scripts/migrate-registered-to-auth.js --serviceAccount=path\to\serviceAccount.json --dryRun
```

3. If the list looks correct, run the migration to create Auth users and add `authUid` to Firestore docs:

```powershell
node scripts/migrate-registered-to-auth.js --serviceAccount=path\to\serviceAccount.json
```

4. The script prints a password reset link for each new user; you should send these links to the user by email, or use your EmailJS/SMTP to send them programmatically.

Security Notes:
- This script creates Auth user accounts and must be run under an admin account. Keep the service account secure.
- Consider having proper backups of your Firestore data before any bulk operations.

# InTTO-Website

# UC InTTO Website - Developer's Manual

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Public Website User Guide](#public-website-user-guide)
7. [Admin Panel User Guide](#admin-panel-user-guide)
8. [uColab Platform User Guide](#ucolab-platform-user-guide)
9. [Developer Setup](#developer-setup)
10. [API Endpoints](#api-endpoints)
11. [Security & Authentication](#security--authentication)
12. [Third-Party Integrations](#third-party-integrations)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

---

## Introduction

The **UC InTTO (University of the Cordilleras Innovation & Technology Transfer Office)** website is a comprehensive platform that serves three main purposes:

1. **Public Website**: Showcases university startups, news/events, programs, and services
2. **Admin Panel**: Content management system for administrators
3. **uColab Platform**: Project submission and management portal for innovators

This manual provides complete documentation for developers maintaining the codebase and users interacting with the website.

---

## System Architecture

### High-Level Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT SIDE (Browser)                     │
├──────────────┬──────────────────┬─────────────────────────┤
│ Public Site  │  Admin Panel     │  uColab Platform        │
│ (HTML/CSS/JS)│  (Admin Portal)  │  (Project Submission)   │
└──────┬───────┴────────┬─────────┴────────┬────────────────┘
       │                │                  │
       │                │                  │
       └────────────────┼──────────────────┘
                        │
                ┌───────▼────────┐
                │  Firebase      │
                │  Services      │
                ├────────────────┤
                │ Firestore DB   │
                │ Authentication │
                │ Hosting        │
                └────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼───────┐ ┌────▼──────┐ ┌─────▼─────┐
│  Cloudinary   │ │  EmailJS  │ │ reCAPTCHA │
│ (Image Upload)│ │  (Email)  │ │(Security) │
└───────────────┘ └───────────┘ └───────────┘
```

### Data Flow
1. **Users** interact with the frontend (HTML pages)
2. **JavaScript** handles user actions and communicates with backend
3. **Firebase Firestore** stores and retrieves data
4. **Third-party services** handle specialized tasks (images, emails, security)

---

## Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom styling (no frameworks)
- **JavaScript (ES6+)** - Interactive functionality
- **Font Awesome 6.5.1** - Icons
- **Google Fonts (Poppins)** - Typography

### Backend Services
- **Firebase Firestore** - NoSQL database (v9.6.1 and v12.4.0 mixed)
- **Firebase Authentication** - User authentication
- **Firebase Hosting** - Static site hosting

### Third-Party Integrations
- **Cloudinary** - Image upload and hosting
- **EmailJS** - Contact form email delivery
- **reCAPTCHA v3** - Spam protection

### Development Tools
- **Git** - Version control
- **VS Code** - Primary IDE
- **Five Server** - Local development server

---

## Project Structure

## Database Schema

### Firebase Firestore Collections

#### 1. **startups** Collection
Stores information about incubated startups.

**Document Structure:**
```javascript
{
  name: "Startup Name",                    // string
  title: "Alternative title",              // string (optional)
  description: "Full description...",      // string
  industry: "Technology",                  // string
  category: "HealthTech",                  // string (optional)
  status: "active",                        // string: "active" | "inactive" | "graduated"
  incubationStatus: "incubated",           // string: "incubated" | "pre-incubation" | "graduated"
  trl: "TRL 7",                           // string: Technology Readiness Level
  founders: "John Doe, Jane Smith",        // string
  website: "https://startup.com",          // string
  email: "contact@startup.com",            // string
  phone: "+639123456789",                  // string
  logo: "https://cloudinary.com/...",      // string: URL
  imageUrls: [],                             // array of strings: image URLs
  sdgs: [9, 11, 17],                      // array of numbers: SDG IDs (1-17)
  keywords: ["AI", "Healthcare"],          // array of strings
  achievements: "Award winner 2024",       // string         
  socialImpact: "Helped 1000+ patients",   // string
  createdAt: Timestamp,                    // Firestore Timestamp
  updatedAt: Timestamp                     // Firestore Timestamp
}
```

#### 2. **newsEvents** Collection
Stores news articles and event announcements.

**Document Structure:**
```javascript
{
  title: "UC Joins TBI Summit",            // string
  content: "Full article content...",      // string
  type: "event",                           // string: "news" | "event"
  status: "published",                     // string: "draft" | "published"
  date: "2025-11-20",                      // string: ISO date
  imageUrls: [ ],                            // array of strings: image URLs
  tags: ["Innovation", "Summit"],          // array of strings
  sdgs: [9, 17],                          // array of numbers
  author: "Admin Name",                    // string (optional)
  createdAt: Timestamp,                    // Firestore Timestamp
  updatedAt: Timestamp                     // Firestore Timestamp
}
```

#### 3. **team** Collection
Stores team member profiles.

**Document Structure:**
```javascript
{
  name: "Dr. John Doe",                    // string
  position: "Director",                    // string
  role: "Leadership",                      // string
  department: "InTTO",                     // string (optional)
  bio: "Dr. Doe has 20 years...",         // string
  email: "john.doe@uc.edu.ph",            // string
  phone: "+639123456789",                  // string (optional)
  photo: "https://cloudinary.com/...",     // string: URL
  socialMedia: {                           // object
    linkedin: "linkedin.com/in/johndoe",
    facebook: "facebook.com/johndoe"
  },
  displayOrder: 1,                         // number: for sorting
  active: true,                            // boolean
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 4. **ipApplications** Collection
Stores intellectual property applications.

**Document Structure:**
```javascript
{
  title: "AI-Powered Diagnostic System",   // string
  type: "Utility Model",                   // string: "Patent" | "Utility Model" | "Industrial Design" | "Copyright"
  status: "filed",                         // string: "filed" | "granted" | "pending"
  number: "PH-2024-001234",               // string: application number
  applicant: "University of Cordilleras",  // string
  inventors: "Dr. Jane Smith, John Doe",   // string
  appDate: "2024-01-15",                  // string: application date
  grantDate: "2024-11-20",                // string: grant date (if granted)
  description: "An AI system that...",     // string
  startup: "HealthTech Startup",           // string: related startup (optional)
  keywords: [],          // array of strings
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 5. **incubation_applications** Collection
Stores incubation program applications.

**Document Structure:**
```javascript
{
  // Personal Information
  fullName: "Juan Dela Cruz",
  email: "juan@email.com",
  phone: "+639123456789",
  address: "123 Street, City",
  
  // Project Information
  projectTitle: "Eco-Friendly Packaging",
  projectDescription: "Sustainable packaging...",
  industry: "Environment",
  stage: "Idea",                           // "Idea" | "Prototype" | "MVP" | "Growth"
  
  // Team Information
  teamSize: 3,
  teamMembers: "Juan, Maria, Pedro",
  
  // Business Information
  targetMarket: "Retailers",
  revenueModel: "B2B Sales",
  
  // SDGs
  sdgs: [12, 13],
  
  // Application Status
  status: "pending",                       // "pending" | "approved" | "rejected"
  submittedAt: Timestamp,
  reviewedAt: Timestamp,
  reviewNotes: "Strong potential..."
}
```

#### 6. **Contact-us Messages** Collection
Stores contact form submissions.

**Document Structure:**
```javascript
{
  name: "John Doe",
  email: "john@email.com",
  subject: "Partnership Inquiry",
  message: "I would like to discuss...",
  phone: "+639123456789",                  // optional
  organization: "ABC Company",             // optional
  
  // Security & Rate Limiting
  fingerprint: "abc123...",                // browser fingerprint
  ipAddress: "192.168.1.1",               // IP address (if available)
  recaptchaScore: 0.9,                    // reCAPTCHA score
  
  // Status
  status: "unread",                        // "unread" | "read" | "replied"
  submittedAt: Timestamp,
  readAt: Timestamp,
  repliedAt: Timestamp
}
```

#### 7. **Registered Accounts** Collection
Stores user accounts for uColab platform.

**Document Structure:**
```javascript
{
  uid: "firebase-auth-uid",                // Firebase Auth UID
  email: "user@email.com",
  displayName: "John Doe",
  photoURL: "https://...",                 // optional
  
  // Profile Information
  role: "user",                            // "user" | "admin" | "superadmin"
  organization: "University",
  department: "Engineering",
  
  // Account Status
  isAdmin: false,                          // boolean
  isVerified: false,                       // email verification
  accountStatus: "active",                 // "active" | "suspended" | "pending"
  
  // Metadata
  createdAt: Timestamp,
  lastLogin: Timestamp,
  loginCount: 15
}
```

#### 8. **ucolab_projects** Collection
Stores innovation projects submitted on uColab platform.

**Document Structure:**
```javascript
{
  // Project Details
  title: "Smart Irrigation System",
  description: "IoT-based irrigation...",
  category: "Agriculture Tech",
  stage: "Prototype",                      // "Idea" | "Prototype" | "Testing" | "Deployed"
  
  // Creator Information
  creatorUid: "firebase-auth-uid",
  creatorName: "John Doe",
  creatorEmail: "john@email.com",
  creatorPhone: "+639123456789",
  
  // Project Details
  teamMembers: "John, Jane, Bob",
  features: [
    "Automated watering",
    "Weather integration",
    "Mobile app control"
  ],
  technologies: ["IoT", "React Native", "Firebase"],
  
  // Media
  imageUrls: [],
  videoUrl: "https://youtube.com/...",     // optional
  
  // Impact & SDGs
  sdgs: [2, 6, 13],
  targetUsers: "Farmers",
  expectedImpact: "Reduce water usage by 40%",
  
  // Status & Visibility
  status: "active",                        // "draft" | "active" | "archived"
  isPublic: true,                          // boolean
  views: 125,                              // number
  likes: 15,                               // number
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  publishedAt: Timestamp
}
```

---

## Public Website User Guide

### For Regular Visitors

#### 1. Homepage (index.html)
The landing page provides an overview of UC InTTO.

**What Users See:**
- Hero section with mission statement
- Featured startups (6 most recent)
- Latest news & events (3 most recent)
- Quick links to programs and services
- Team members showcase
- Contact information

**User Actions:**
- Browse featured startups
- Read latest news
- Navigate to different sections (About, Services, Programs)
- Contact UC InTTO via form
- View team members

#### 2. Startups Page (startups.html)
Displays all incubated startups with filtering and pagination.

**Features:**
- View all startups (9 per page, max 10 pages)
- Search by name or description
- Filter by status (Active, Inactive, Graduated)
- Filter by incubation status
- Sort by: Recent, Oldest, A-Z, Z-A
- Pagination controls with page numbers

**How to Use:**
1. Browse startups using pagination buttons
2. Use search bar to find specific startups
3. Click filter buttons to narrow results
4. Change sort order using dropdown
5. Click on any startup card to view details

#### 3. Startup Details Page (startup-details.html)
Shows comprehensive information about a specific startup.

**Information Displayed:**
- Startup name and logo
- Full description
- Industry and category
- Founders
- Contact information (website, email, phone)
- Technology Readiness Level (TRL)
- SDG alignment
- Image gallery with lightbox
- Key achievements
- Social impact metrics

**How to Access:**
- Click on any startup card from startups.html
- URL format: `startup-details.html?id=<firestore-document-id>`

#### 4. News & Events Page (events.html)
Lists all news articles and event announcements.

**Features:**
- View all news and events (6 per page)
- Search by title or content
- Filter by type (All, News, Events)
- Sort by: Recent, Oldest, A-Z, Z-A
- Pagination with green circular buttons

**How to Use:**
1. Browse news/events using pagination
2. Search for specific topics
3. Filter between news and events
4. Click on any card to read full article

#### 5. News/Event Detail Page (newsEventPage.html)
Displays full article or event details.

**Information Shown:**
- Title and cover image
- Full content/description
- Date published
- Type (News/Event)
- Tags
- Related SDGs
- Image gallery (if multiple images)

**How to Access:**
- Click on any news/event card
- URL format: `newsEventPage.html?id=<firestore-document-id>`

#### 6. Contact Form
Available throughout the website.

**How to Submit:**
1. Fill in name, email, subject, message
2. Optional: phone, organization
3. Pass reCAPTCHA verification (automatic)
4. Click "Send Message"
5. Receive confirmation

**Security Features:**
- Rate limiting (max 3 submissions per hour)
- Spam detection
- Honeypot field (hidden)
- Browser fingerprinting

---

## Admin Panel User Guide

### Accessing Admin Panel

**URL:** `/admin/dashboard.html`

**Access Control:**
- Protected by Firebase Authentication
- Only authenticated admin users can access
- Auto-redirects to login if not authenticated
- Session-based authentication

### Admin Dashboard (dashboard.html)

**Overview Statistics:**
- Total Startups (with active count)
- Published Events (with draft count)
- Team Members (with active count)
- Recent activity feed

**Features:**
- Real-time data from Firestore
- Recent startups list (last 5)
- Recent activity (last 5 news/events)
- Quick navigation to all sections

### 1. Manage Startups (admin/startups.html)

#### Adding a New Startup
1. Click "Add Startup" button
2. Fill in the form:
   - **Basic Info:** Name, description, industry, category
   - **Status:** Active/Inactive/Graduated
   - **Incubation Status:** Incubated/Pre-incubation/Graduated
   - **TRL Level:** TRL 1-9
   - **Founders:** Names of founders
   - **Contact:** Website, email, phone
   - **Images:** Upload up to 5 images (first is logo)
   - **SDGs:** Select multiple SDGs (checkboxes)
   - **Keywords:** Comma-separated tags
   - **Metrics:** Achievements, funding, employees, social impact
3. Click "Create Startup"

#### Editing a Startup
1. Click pencil icon on startup card
2. Form pre-fills with existing data
3. Modify any fields
4. Click "Update Startup"

#### Deleting a Startup
1. Click trash icon on startup card
2. Confirm deletion in popup
3. Startup removed from Firestore

### 2. Manage News & Events (admin/news-events.html)

#### Adding News/Event
1. Click "Add News/Event" button
2. Fill in form:
   - **Title:** Headline
   - **Type:** News or Event
   - **Status:** Draft or Published
   - **Date:** Publication/event date
   - **Content:** Full article or event details
   - **Images:** Upload up to 5 images (first is cover)
   - **Tags:** Comma-separated keywords
   - **SDGs:** Select relevant SDGs
3. Click "Save Item"

### 3. Manage Team (admin/team.html)

#### Adding Team Member
1. Click "Add Team Member"
2. Enter information:
   - **Name:** Full name with title
   - **Position:** Job title
   - **Bio:** Professional biography
   - **Contact:** Email and phone
   - **Photo:** Upload profile photo
   - **Display Order:** Number for sorting
3. Click "Add Team Member"

### 4. Manage IP Applications (admin/ip-applications.html)

#### Adding IP Application
1. Click "Add IP Application"
2. Fill in form:
   - **Title:** Invention name
   - **Type:** Patent/Utility Model/etc.
   - **Status:** Filed or Granted
   - **Application Number:** Official number
   - **Inventors:** Names
   - **Dates:** Application and grant dates
3. Click "Create IP Application"

### 5. SDG Analytics (admin/sdg.html)

**Features:**
- Total SDG usage count
- Unique SDGs covered
- Pie chart visualization
- Detailed breakdown by SDG

**Filtering:**
- All (startups + news/events)
- Startups only
- News & Events only

---

## uColab Platform User Guide

### For Visitors (No Account)

#### Browse Projects (ucolab/index.html)
- View all public projects
- Search by title or description
- Filter by category
- Click project card to view details

### For Registered Users

#### 1. Create Account (ucolab/signupform.html)
**Sign Up Methods:**
- Email & Password
- Google Sign-In

#### 2. Submit Project (ucolab/submit-project.html)
1. Fill in project details
2. Upload images (up to 5)
3. Select SDGs
4. Set visibility (Public/Private)
5. Click "Submit Project"

#### 3. Edit Project (ucolab/edit-project.html)
- Access via "Edit" button on your project
- Modify any fields
- Click "Update Project"

---

## Developer Setup

### Prerequisites
- Git
- Node.js (optional)
- Text editor (VS Code recommended)
- Firebase account
- Cloudinary account
- EmailJS account

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/KharonKade/InTTO-Website.git
cd InTTO-Website
```

2. **Install Dependencies** (optional)
```bash
npm install
```

3. **Configure Firebase**
Replace Firebase config in all HTML files:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

4. **Configure Cloudinary**
Update in `ucolab/js/cloudinary.js`:
```javascript
const CLOUDINARY_CLOUD_NAME = 'your-cloud-name';
const CLOUDINARY_API_KEY = 'your-api-key';
const CLOUDINARY_UPLOAD_PRESET = 'your-preset';
```

5. **Configure EmailJS**
Update in `Contact-Us-DB/emailC.js`:
```javascript
window.EMAIL_CONFIG = {
  SERVICE_ID: 'your-service-id',
  TEMPLATE_ID: 'your-template-id',
  PUBLIC_KEY: 'your-public-key'
};
```

### Running Locally

**VS Code Live Server:**
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

**Python HTTP Server:**
```bash
python -m http.server 8000
```

---

## API Endpoints
### News & Events API

**URL:** `/api/news-events.html`

**Query Parameters:**
- `status` - Filter by status
- `type` - Filter by type
- `limit` - Limit results

**Response:**
```json
[
  {
    "firestoreId": "abc123",
    "title": "UC Joins TBI Summit",
    "content": "Full content...",
    "type": "event",
    "status": "published",
    "date": "2025-11-20"
  }
]
```

---

## Security & Authentication

### Firebase Authentication
- Email/Password
- Google OAuth

### Security Layers
1. **Rate Limiting** - Max 3 submissions/hour
2. **Honeypot Field** - Catch simple bots
3. **Browser Fingerprinting** - Track users
4. **Input Validation** - Prevent injection

---

## Third-Party Integrations

### Cloudinary
- Image upload and hosting
- Automatic compression
- CDN delivery

### EmailJS
- Contact form emails
- Template-based

### reCAPTCHA v3
- Invisible bot protection
- Score-based verification

---

## Deployment

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### Custom Domain
1. Add domain in Firebase Console
2. Configure DNS A records
3. Wait for SSL certificate

---

## Troubleshooting

### Common Issues

#### 1. Firebase Connection Errors
**Solution:** Check Firebase config and API keys

#### 2. Images Not Loading
**Solution:** Verify Cloudinary URLs, add onerror handlers

#### 3. Upload Failures
**Solution:** Check Cloudinary credentials, compress images

#### 4. Contact Form Not Sending
**Solution:** Verify EmailJS config, check rate limits

#### 5. Admin Panel Access Denied
**Solution:** Check `isCute` field in Firestore

#### 6. Pagination Not Working
**Solution:** Check console for errors, adjust limits

#### 7. Search Returns No Results
**Solution:** Verify data fields, use toLowerCase()

#### 8. SDGs Not Displaying
**Solution:** Ensure SDGs stored as numbers, not strings

---

## Performance Optimization

### Best Practices
1. Compress images before upload
2. Use `.limit()` on Firestore queries
3. Lazy load images
4. Cache results client-side
5. Minify CSS/JS for production

---

## Maintenance

### Regular Tasks
- **Daily:** Monitor errors, check submissions
- **Weekly:** Backup Firestore, review accounts
- **Monthly:** Update content, clean unused images
- **Quarterly:** Security audit, update dependencies

---

## Support & Contact

### For Developers
- **Repository:** github.com/KharonKade/InTTO-Website
- **Issues:** Create GitHub issue

### InTTO Contact
- **Email:** intto@uc-bcf.edu.ph
- **Office:** University of the Cordilleras, Baguio City

---

**End of Developer's Manual**

Last Updated: November 26, 2025
Lead by: Sir Leandro Rey Gepila
Project Leader: Al John E. Orpilla
UI/UX: Kim Hyun Myeong, Hanzel Mae Antolin
Team Front and Back-end: Carl Joseph Baniaga, Kade Kharon Togana, Al John Orpilla
Version: 1.0.0
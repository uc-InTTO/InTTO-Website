# WordPress Integration Setup Guide

## What You Need to Share with the WordPress Team

When the WordPress crawler team asks what API to connect to, give them this information:

### 📍 Main API Endpoint
```
https://uc-intto.com/api/news-events.html
```

### 📋 Quick Information Sheet

**API Type:** Public REST-like JSON API  
**Authentication:** None required (public read-only)  
**Format:** JSON  
**Content Type:** application/json  
**Rate Limit:** None (recommended: 1 request per minute)  
**Documentation:** https://uc-intto.com/api/README.md  
**Live Demo:** https://uc-intto.com/api/index.html

### 🔗 What They Need to Do

The WordPress team just needs to:

1. **Set up their crawler/importer** to call:
   ```
   https://uc-intto.com/api/news-events.html?limit=50
   ```

2. **Parse the JSON response** which looks like:
   ```json
   {
     "success": true,
     "items": [
       {
         "id": "unique-id",
         "title": "News Title",
         "content": "Full content...",
         "date": "2024-11-22",
         "featured_image": "https://cloudinary.com/.../image.jpg",
         "tags": ["Innovation", "Tech"],
         "sdg_tags": ["SDG 9", "SDG 17"],
         "url": "https://uc-intto.com/newsEventPage.html?id=..."
       }
     ]
   }
   ```

3. **Map the fields** to their WordPress posts:
   - `title` → Post Title
   - `content` → Post Content  
   - `date` → Post Date
   - `featured_image` → Featured Image URL
   - `tags` → WordPress Tags
   - `sdg_tags` → WordPress Categories
   - `url` → Custom field for source link

4. **Schedule automatic imports** (recommended: once per day)

### 📦 Available Query Parameters

They can customize the API call with these parameters:

| Parameter | Example | Purpose |
|-----------|---------|---------|
| `limit` | `?limit=20` | Number of items (max 100) |
| `offset` | `?offset=10` | Skip items for pagination |
| `type` | `?type=news` | Filter by 'news' or 'event' |
| `since` | `?since=2024-01-01` | Only items after this date |

### 🔍 Example API Calls

**Latest 50 items:**
```
https://uc-intto.com/api/news-events.html?limit=50
```

**Only news articles:**
```
https://uc-intto.com/api/news-events.html?type=news&limit=50
```

**Content published after Jan 1, 2024:**
```
https://uc-intto.com/api/news-events.html?since=2024-01-01
```

**Pagination (page 2, 20 items per page):**
```
https://uc-intto.com/api/news-events.html?limit=20&offset=20
```

### ✅ What Happens Automatically

When your admin publishes news/events through the InTTO admin panel:

1. ✅ Data is saved to Firestore
2. ✅ Data is **immediately available** at the API endpoint
3. ✅ WordPress crawler fetches it on their scheduled import
4. ✅ Content appears on their WordPress site

**No additional steps needed from your side!**

### 🎯 Bonus: SDG Statistics API

If they also want SDG-related statistics:
```
https://uc-intto.com/api/sdg-stats.html
```

This provides counts of how many startups/news/events are tagged with each SDG.

---

## Testing the API

### Test in Browser
Simply open in any web browser:
```
https://uc-intto.com/api/news-events.html
```

You'll see the JSON data displayed.

### Test with cURL
```bash
curl https://uc-intto.com/api/news-events.html
```

### Test with Python
```python
import requests
response = requests.get('https://uc-intto.com/api/news-events.html')
print(response.json())
```

---

## Troubleshooting

### Problem: "No data showing"
**Solution:** Make sure news/events have `status: "published"` in admin panel

### Problem: "Images not loading"
**Solution:** Images are Cloudinary URLs - they should load directly. Check Cloudinary settings if issues persist.

### Problem: "CORS errors"
**Solution:** The API is configured to allow cross-origin requests. If still issues, WordPress may need to use server-side fetching instead of browser JavaScript.

---

## Files Created in Your Website

```
/api/
├── index.html           # Beautiful landing page with API documentation
├── news-events.html     # Main API endpoint for news & events
├── news-events.js       # API logic for news & events
├── sdg-stats.html       # SDG statistics endpoint
├── sdg-stats.js         # API logic for SDG stats
├── README.md            # Full technical documentation
└── WORDPRESS_SETUP.md   # This file
```

All files are ready to use immediately - no configuration needed!

---

## Summary for WordPress Team

**Subject: API Integration for UC InTTO Content**

Hi [WordPress Team],

We've set up a public API endpoint for you to crawl our news and events content.

**API Endpoint:**
```
https://uc-intto.com/api/news-events.html
```

**What you'll receive:**
- News articles and events
- Full content and images
- SDG tags
- Publication dates
- Source URLs

**Documentation:**
- Live API Demo: https://uc-intto.com/api/index.html
- Full Docs: https://uc-intto.com/api/README.md

**Recommended Import Schedule:** Daily

The endpoint is live and ready to use. No authentication needed.

Let us know if you need any assistance!

Best regards,
UC InTTO Team

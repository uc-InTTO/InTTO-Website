# InTTO WordPress Crawler API Documentation

## Overview
This API endpoint provides published news and events data from the InTTO Firestore database in a WordPress-compatible JSON format. WordPress crawlers can consume this API to automatically import content.

## Endpoint URL
```
https://uc-intto.com/api/news-events.html
```

## Authentication
**No authentication required** - This is a public read-only endpoint that only exposes published content.

## Request Format

### HTTP Method
`GET`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Number of items to return (max: 100) |
| `offset` | integer | No | 0 | Number of items to skip for pagination |
| `since` | string (ISO date) | No | - | Only return items published after this date (e.g., `2024-01-01`) |
| `type` | string | No | - | Filter by type: `news` or `event` |

### Example Requests

```bash
# Get latest 10 news & events
https://uc-intto.com/api/news-events.html

# Get 20 items with pagination
https://uc-intto.com/api/news-events.html?limit=20&offset=0

# Get only news items
https://uc-intto.com/api/news-events.html?type=news

# Get events published after Jan 1, 2024
https://uc-intto.com/api/news-events.html?type=event&since=2024-01-01

# Pagination - Page 2 (items 10-20)
https://uc-intto.com/api/news-events.html?limit=10&offset=10
```

## Response Format

### Success Response
```json
{
  "success": true,
  "total": 45,
  "count": 10,
  "offset": 0,
  "limit": 10,
  "items": [
    {
      "id": "abc123xyz",
      "title": "Innovation Week 2024",
      "content": "Full article content here...",
      "excerpt": "Short excerpt of content (200 chars)...",
      "type": "event",
      "status": "published",
      "date": "2024-11-01",
      "created_at": "2024-10-15T08:30:00.000Z",
      "updated_at": "2024-10-20T14:45:00.000Z",
      "featured_image": "https://res.cloudinary.com/.../image.jpg",
      "images": [
        "https://res.cloudinary.com/.../image1.jpg",
        "https://res.cloudinary.com/.../image2.jpg"
      ],
      "tags": ["Innovation", "Workshop", "Tech"],
      "sdg_tags": ["SDG 9", "SDG 17"],
      "sdg_ids": ["9", "17"],
      "url": "https://uc-intto.com/newsEventPage.html?id=abc123xyz",
      "source_url": "https://uc-intto.com",
      "meta": {
        "source": "UC InTTO",
        "source_system": "InTTO Website",
        "firestore_id": "abc123xyz",
        "original_url": "https://uc-intto.com/newsEventPage.html?id=abc123xyz"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "pages": 5,
    "current_page": 1,
    "per_page": 10,
    "has_next": true,
    "has_prev": false,
    "next_url": "/api/news-events.html?limit=10&offset=10",
    "prev_url": null
  },
  "generated_at": "2024-11-22T10:30:00.000Z",
  "api_version": "1.0"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Failed to fetch news and events",
  "message": "Detailed error message",
  "generated_at": "2024-11-22T10:30:00.000Z"
}
```

## Data Fields Explanation

### Item Object Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique Firestore document ID |
| `title` | string | Title of the news/event |
| `content` | string | Full HTML/text content |
| `excerpt` | string | Short excerpt (first 200 characters) |
| `type` | string | Either "news" or "event" |
| `status` | string | Always "published" (only published items are exposed) |
| `date` | string | Publication date (YYYY-MM-DD format) |
| `created_at` | string | ISO timestamp when created |
| `updated_at` | string | ISO timestamp when last updated |
| `featured_image` | string \| null | URL of the first image, or null if no images |
| `images` | array | Array of all image URLs |
| `tags` | array | Array of string tags |
| `sdg_tags` | array | Array of SDG tags formatted as "SDG X" |
| `sdg_ids` | array | Array of SDG numbers as strings |
| `url` | string | Direct link to the item on InTTO website |
| `source_url` | string | Base URL of the source website |
| `meta` | object | Additional metadata about the source |

## WordPress Integration Guide

### Option 1: WordPress Plugin (Recommended)
Create a custom WordPress plugin that periodically calls this API:

```php
<?php
/**
 * Plugin Name: InTTO News Importer
 * Description: Imports news and events from UC InTTO API
 */

function intto_import_news() {
    $api_url = 'https://uc-intto.com/api/news-events.html?limit=50';
    
    $response = wp_remote_get($api_url);
    
    if (is_wp_error($response)) {
        error_log('InTTO API Error: ' . $response->get_error_message());
        return;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (!$data['success']) {
        error_log('InTTO API returned error');
        return;
    }
    
    foreach ($data['items'] as $item) {
        // Check if post already exists
        $existing = get_posts([
            'meta_key' => 'intto_firestore_id',
            'meta_value' => $item['id'],
            'post_type' => 'post',
            'posts_per_page' => 1
        ]);
        
        if (!empty($existing)) {
            // Update existing post
            $post_id = $existing[0]->ID;
            wp_update_post([
                'ID' => $post_id,
                'post_title' => $item['title'],
                'post_content' => $item['content'],
                'post_date' => $item['date'],
                'post_status' => 'publish'
            ]);
        } else {
            // Create new post
            $post_id = wp_insert_post([
                'post_title' => $item['title'],
                'post_content' => $item['content'],
                'post_excerpt' => $item['excerpt'],
                'post_date' => $item['date'],
                'post_status' => 'publish',
                'post_type' => 'post',
            ]);
        }
        
        // Save metadata
        update_post_meta($post_id, 'intto_firestore_id', $item['id']);
        update_post_meta($post_id, 'intto_source_url', $item['url']);
        update_post_meta($post_id, 'intto_type', $item['type']);
        
        // Set tags
        wp_set_post_tags($post_id, $item['tags'], false);
        
        // Handle SDG tags (as categories or custom taxonomy)
        foreach ($item['sdg_tags'] as $sdg) {
            wp_set_post_categories($post_id, [get_cat_ID($sdg)], true);
        }
        
        // Download and set featured image
        if ($item['featured_image']) {
            $image_id = intto_download_image($item['featured_image'], $post_id);
            if ($image_id) {
                set_post_thumbnail($post_id, $image_id);
            }
        }
    }
}

// Helper function to download and attach images
function intto_download_image($image_url, $post_id) {
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    
    $tmp = download_url($image_url);
    if (is_wp_error($tmp)) {
        return false;
    }
    
    $file_array = [
        'name' => basename($image_url),
        'tmp_name' => $tmp
    ];
    
    $id = media_handle_sideload($file_array, $post_id);
    
    if (is_wp_error($id)) {
        @unlink($tmp);
        return false;
    }
    
    return $id;
}

// Schedule automatic imports (daily)
if (!wp_next_scheduled('intto_daily_import')) {
    wp_schedule_event(time(), 'daily', 'intto_daily_import');
}

add_action('intto_daily_import', 'intto_import_news');
?>
```

### Option 2: WP All Import Plugin
1. Install **WP All Import** plugin
2. Create new import
3. Set URL: `https://uc-intto.com/api/news-events.html?limit=100`
4. Set format: JSON
5. Map fields:
   - `items[*].title` → Post Title
   - `items[*].content` → Post Content
   - `items[*].date` → Post Date
   - `items[*].featured_image` → Featured Image
   - `items[*].tags` → Tags
   - `items[*].sdg_tags` → Categories
6. Set unique identifier: `items[*].id`
7. Schedule import to run daily

### Option 3: Zapier/Make Integration
1. Create Zapier/Make scenario
2. Trigger: Schedule (daily)
3. Action: HTTP Request to `https://uc-intto.com/api/news-events.html`
4. Parse JSON response
5. For each item, create WordPress post via WordPress API

## Rate Limiting
No rate limiting is currently enforced. Please be respectful:
- Maximum 1 request per minute recommended
- Cache responses for at least 1 hour
- Use pagination for large datasets

## Support & Updates
- **API Version**: 1.0
- **Last Updated**: November 22, 2024
- **Contact**: UC InTTO Technical Team

## Changelog

### Version 1.0 (2024-11-22)
- Initial release
- Support for news and events
- Pagination support
- WordPress-compatible JSON format
- SDG tags support
- Image URLs included

# CORS Configuration (Optional)

If the WordPress crawler experiences CORS (Cross-Origin Resource Sharing) issues when fetching from JavaScript, you may need to add these headers to your server configuration.

## For Apache (.htaccess)

Add this to your `/api/.htaccess` file:

```apache
<IfModule mod_headers.c>
    # Allow requests from any origin
    Header set Access-Control-Allow-Origin "*"
    
    # Allow specific HTTP methods
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
    
    # Allow specific headers
    Header set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept"
    
    # Cache preflight requests for 1 hour
    Header set Access-Control-Max-Age "3600"
    
    # Expose custom headers
    Header set Access-Control-Expose-Headers "Content-Length, Content-Type"
</IfModule>

# Set proper content type for JSON
<FilesMatch "\.(html|js)$">
    Header set Content-Type "application/json; charset=utf-8"
</FilesMatch>
```

## For Nginx

Add this to your Nginx server block:

```nginx
location /api/ {
    # Allow CORS from any origin
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept' always;
    add_header 'Access-Control-Max-Age' 3600 always;
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    # Set content type
    default_type application/json;
}
```

## For Firebase Hosting (firebase.json)

If you're using Firebase Hosting, add this to your `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "/api/**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          },
          {
            "key": "Access-Control-Allow-Methods",
            "value": "GET, OPTIONS"
          },
          {
            "key": "Access-Control-Allow-Headers",
            "value": "Origin, X-Requested-With, Content-Type, Accept"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    ]
  }
}
```

## Testing CORS

Test if CORS is working with this command:

```bash
curl -H "Origin: https://wordpress-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     -i https://uc-intto.com/api/news-events.html
```

You should see headers like:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

## Note

**In most cases, CORS configuration is NOT needed** because:

1. WordPress plugins typically fetch data **server-side** (no CORS issues)
2. Your API endpoints are static HTML files that load Firebase and render JSON
3. Crawlers and importers don't run in browser contexts

Only configure CORS if:
- WordPress is using client-side JavaScript (AJAX) to fetch data
- You get specific CORS-related error messages in the browser console
- The WordPress team specifically requests it

## Security Note

Using `Access-Control-Allow-Origin: *` means any website can access your API. This is fine for **public read-only data** like news and events. 

If you want to restrict access to specific domains:

```apache
Header set Access-Control-Allow-Origin "https://wordpress-site.com"
```

Replace `https://wordpress-site.com` with the actual WordPress domain.

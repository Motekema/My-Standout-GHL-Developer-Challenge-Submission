# GHL Lead Router - API Configuration Guide

## Free APIs Used in This Solution

### 1. Zippopotam (Zip Code to Coordinates)
- **Service**: http://api.zippopotam.us
- **Cost**: Completely free
- **Usage**: Get latitude/longitude for any US zip code
- **Rate Limit**: Reasonable for production use
- **Setup**: No API key required

Example:
```javascript
// Get coordinates for zip code 90210
fetch('http://api.zippopotam.us/us/90210')
```

### 2. JSONBin.io (Data Storage)
- **Service**: https://jsonbin.io
- **Cost**: Free tier with 100,000 requests/month
- **Usage**: Store location capacity data and analytics
- **Setup Required**: Create free account and get API key

#### Setup Steps:
1. Go to https://jsonbin.io
2. Create free account
3. Get your API key from dashboard
4. Set environment variable: `JSONBIN_API_KEY=your_api_key_here`

### 3. Webhook.site (Testing Webhooks)
- **Service**: https://webhook.site
- **Cost**: Free
- **Usage**: Test webhook deliveries during development
- **Setup**: Generate unique URL for testing

#### Setup Steps:
1. Go to https://webhook.site
2. Copy your unique URL
3. Set environment variable: `WEBHOOK_URL=your_webhook_url_here`

### 4. OpenStreetMap Nominatim (Geocoding Backup)
- **Service**: https://nominatim.openstreetmap.org
- **Cost**: Free
- **Usage**: Backup geocoding service
- **Rate Limit**: 1 request per second
- **Setup**: No API key required (but add User-Agent header)

## Environment Variables Setup

Create a `.env` file in your project root:

```bash
# Required for data persistence
JSONBIN_API_KEY=your_jsonbin_api_key_here

# Optional for webhook testing
WEBHOOK_URL=https://webhook.site/your-unique-id

# Optional for GHL integration
GHL_API_KEY=your_ghl_api_key_here

# Optional for enhanced analytics
ANALYTICS_WEBHOOK_URL=your_production_webhook_url
```

## Production Considerations

### Rate Limiting
- Zippopotam: Built-in reasonable limits
- JSONBin: 100k requests/month on free tier
- Nominatim: 1 request/second (use sparingly)

### Caching Strategy
The system implements intelligent caching to minimize API calls:
- Zip code coordinates cached in memory
- Location capacity cached for 5 minutes
- Distance calculations cached for the session

### Error Handling
All API calls have fallback mechanisms:
- If Zippopotam fails, uses fallback coordinate data
- If JSONBin fails, uses simulated capacity data  
- If webhooks fail, still logs to console

### Scaling Considerations
For production at scale, consider upgrading to:
- JSONBin Pro plan for higher limits
- Google Maps Distance Matrix API for more accurate distances
- Dedicated webhook infrastructure

## Testing the Setup

Run the test to verify API integration:

```bash
node routerTest.js
```

Check for:
- ✅ Real distance calculations working
- ✅ Webhook deliveries (check webhook.site)
- ✅ Data persistence (check JSONBin dashboard)

## Monitoring API Health

The system includes automatic API health monitoring:
- Tracks API response times
- Logs API failures
- Implements circuit breaker pattern for resilience

## Security Notes

- Never commit API keys to version control
- Use environment variables for all secrets
- Implement API key rotation for production
- Monitor API usage to prevent quota exhaustion

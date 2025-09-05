# Health Endpoint Documentation

## Overview
The health endpoint provides a simple way to check if the VFXB backend server is running and responsive.

## Endpoint Details

**URL:** `GET /api/health`  
**Authentication:** None required  
**Rate Limiting:** Subject to general rate limiting (see rateLimiter middleware)

## Response Format

### Success Response (200 OK)
```json
{
  "status": "OK",
  "timestamp": "2025-08-15T10:00:29.848Z",
  "uptime": 190.8294434,
  "environment": "development"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always "OK" when server is healthy |
| `timestamp` | string | ISO 8601 timestamp of the response |
| `uptime` | number | Server uptime in seconds |
| `environment` | string | Current environment (development/production) |

## Usage Examples

### cURL
```bash
curl -X GET http://localhost:3001/api/health
```

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
```

### JavaScript/Fetch
```javascript
fetch('http://localhost:3001/api/health')
  .then(response => response.json())
  .then(data => console.log('Server health:', data));
```

## Performance Metrics

- **Average Response Time:** ~164ms (local testing)
- **Expected Response Time:** < 500ms
- **Availability Target:** 99.9%

## Monitoring

This endpoint is ideal for:
- Load balancer health checks
- Monitoring system probes
- CI/CD pipeline verification
- Development environment validation

## Error Handling

If the server is not responding, you will receive:
- Connection timeout
- Connection refused
- HTTP 5xx errors (if server is partially functional)

## Implementation

The health endpoint is implemented in `backend/server.js`:

```javascript
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});
```

## Testing

Run the health endpoint tests:
```bash
npm test -- health.test.js
```

See `backend/src/tests/health.test.js` for test implementation.
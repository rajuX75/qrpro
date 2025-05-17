# QR Code Generation API Documentation

## Overview

The QR Code Generation API provides endpoints for creating, managing, and tracking QR codes. This documentation provides detailed information about available endpoints, request/response formats, and authentication requirements.

## Authentication

All API requests require an API key for authentication. Include your API key in the `X-API-Key` header:

```http
X-API-Key: your-api-key-here
```

### Getting an API Key

To obtain an API key, make a POST request to `/api/v1/apikey`:

```http
POST /api/v1/apikey
```

Response:
```json
{
  "success": true,
  "message": "API key created successfully",
  "data": {
    "apiKey": {
      "id": 1,
      "key": "uuid-string",
      "status": "active",
      "tier": "free",
      "usage": {
        "total": 0,
        "daily": 0,
        "monthly": 0
      },
      "limits": {
        "rateLimit": 1000,
        "rateLimitInterval": "day"
      },
      "metadata": {
        "createdAt": "2024-03-14T12:00:00.000Z",
        "expiresAt": null
      }
    }
  }
}
```

## Rate Limiting

API requests are subject to rate limiting based on your tier:

- Free Tier: 1,000 requests per day
- Premium Tier: 10,000 requests per day

Rate limit information is included in the response headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1710432000
```

## Endpoints

### Static QR Codes

#### Generate QR Code

```http
POST /api/v1/qr/generate
```

Request body:
```json
{
  "data": "https://example.com",
  "size": 300,
  "format": "png",
  "color": {
    "dark": "#000000",
    "light": "#ffffff"
  },
  "logo": {
    "url": "https://example.com/logo.png",
    "width": 50,
    "height": 50
  }
}
```

Response:
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "filePath": "data/static/qrcode/api-key/static/qr-123456.png",
    "downloadUrl": "http://localhost:3000/data/static/qrcode/api-key/static/qr-123456.png",
    "metadata": {
      "size": 300,
      "format": "png",
      "timestamp": "2024-03-14T12:00:00.000Z"
    }
  }
}
```

### Dynamic QR Codes

#### Create Dynamic QR Code

```http
POST /api/v1/qr/dynamic/create
```

Request body:
```json
{
  "targetUrl": "https://example.com",
  "size": 300,
  "format": "png",
  "color": {
    "dark": "#000000",
    "light": "#ffffff"
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Dynamic QR code created successfully",
  "data": {
    "shortId": "abc123",
    "filePath": "data/static/qrcode/api-key/dynamic/abc123.png",
    "downloadUrl": "http://localhost:3000/data/static/qrcode/api-key/dynamic/abc123.png",
    "targetUrl": "https://example.com",
    "metadata": {
      "size": 300,
      "format": "png",
      "timestamp": "2024-03-14T12:00:00.000Z"
    }
  }
}
```

#### Update Dynamic QR Code

```http
PUT /api/v1/qr/dynamic/:shortId/update
```

Request body:
```json
{
  "targetUrl": "https://new-example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Dynamic QR code updated successfully",
  "data": {
    "shortId": "abc123",
    "targetUrl": "https://new-example.com",
    "updatedAt": "2024-03-14T12:00:00.000Z"
  }
}
```

#### Get QR Code Analytics

```http
GET /api/v1/qr/dynamic/:shortId/analytics
```

Response:
```json
{
  "success": true,
  "message": "Analytics retrieved successfully",
  "data": {
    "shortId": "abc123",
    "totalScans": 150,
    "lastScanned": "2024-03-14T12:00:00.000Z",
    "scansByDate": {
      "2024-03-14": 50,
      "2024-03-13": 100
    },
    "scansByLocation": {
      "US": 100,
      "UK": 50
    }
  }
}
```

### Bulk Generation

#### Generate Multiple QR Codes

```http
POST /api/v1/qr/bulk/generate
```

Request body:
```json
{
  "jobs": [
    {
      "data": "https://example.com/1",
      "size": 300,
      "format": "png"
    },
    {
      "data": "https://example.com/2",
      "size": 300,
      "format": "png"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Bulk QR codes generated successfully",
  "data": {
    "bulkRequestId": "bulk-123456",
    "totalJobs": 2,
    "completedJobs": 2,
    "failedJobs": 0,
    "files": [
      {
        "filePath": "data/static/qrcode/api-key/bulk/bulk-123456/qr-1.png",
        "downloadUrl": "http://localhost:3000/data/static/qrcode/api-key/bulk/bulk-123456/qr-1.png",
        "metadata": {
          "size": 300,
          "format": "png",
          "timestamp": "2024-03-14T12:00:00.000Z"
        }
      },
      {
        "filePath": "data/static/qrcode/api-key/bulk/bulk-123456/qr-2.png",
        "downloadUrl": "http://localhost:3000/data/static/qrcode/api-key/bulk/bulk-123456/qr-2.png",
        "metadata": {
          "size": 300,
          "format": "png",
          "timestamp": "2024-03-14T12:00:00.000Z"
        }
      }
    ]
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

Common error codes:
- 400: Bad Request - Invalid input parameters
- 401: Unauthorized - Missing or invalid API key
- 403: Forbidden - Rate limit exceeded
- 404: Not Found - Resource not found
- 500: Internal Server Error - Server-side error

## Best Practices

1. Always include the API key in the `X-API-Key` header
2. Monitor rate limit headers to avoid exceeding limits
3. Use appropriate content types in requests
4. Handle errors gracefully in your application
5. Cache QR codes when possible to reduce API calls
6. Use bulk generation for multiple QR codes
7. Implement proper error handling for failed requests

## Support

For additional support or questions, please contact:
- Email: support@qrpro.com
- GitHub Issues: https://github.com/yourusername/qrpro/issues

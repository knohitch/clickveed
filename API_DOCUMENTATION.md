# FinalClickVid API Documentation

## Overview

This document provides comprehensive documentation for all API endpoints available in the FinalClickVid application. The API follows RESTful conventions and uses JSON for data exchange.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Most API endpoints require authentication using Bearer tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

### Rate Limiting

All API endpoints are subject to rate limiting to prevent abuse:

- **Standard endpoints**: 60 requests per minute
- **AI generation endpoints**: 5 requests per minute
- **Authentication endpoints**: 10 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets

## Core Endpoints

### Authentication

#### POST /api/auth/signin
Signs in a user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### GET /api/auth/session
Returns the current user session.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER"
  },
  "expires": "2024-01-01T00:00:00Z"
}
```

#### GET /api/auth/verify-email
Verifies a user's email address using a token.

**Query Parameters:**
- `token` (string): Verification token

**Response:** Redirects to login page with success/error status

### Video Generation

#### POST /api/video/generate-from-url
Generates a video script from a URL.

**Authentication:** Required
**Rate Limit:** 5 requests per minute

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "topic": "Focus on the main conclusions"
}
```

**Response:**
```json
{
  "success": true,
  "script": "Generated video script content..."
}
```

**Error Responses:**
- `400`: Invalid URL format
- `401`: Authorization required
- `429`: Rate limit exceeded
- `500`: Server error

#### POST /api/video/generate-script
Generates a video script from a prompt.

**Authentication:** Required
**Rate Limit:** 5 requests per minute

**Request Body:**
```json
{
  "prompt": "Create a script about sustainable living",
  "duration": 60,
  "style": "educational"
}
```

**Response:**
```json
{
  "success": true,
  "script": "Generated script content...",
  "estimatedDuration": 60
}
```

### AI Services

#### POST /api/ai/generate-image
Generates images using AI.

**Authentication:** Required
**Rate Limit:** 5 requests per minute

**Request Body:**
```json
{
  "prompt": "A modern office with natural lighting",
  "count": 4,
  "style": "realistic"
}
```

**Response:**
```json
{
  "success": true,
  "images": [
    "https://cdn.example.com/image1.png",
    "https://cdn.example.com/image2.png",
    "https://cdn.example.com/image3.png",
    "https://cdn.example.com/image4.png"
  ]
}
```

#### POST /api/ai/generate-voice
Generates voice-over from text.

**Authentication:** Required
**Rate Limit:** 10 requests per minute

**Request Body:**
```json
{
  "text": "Welcome to our video about AI",
  "voice": "professional-male",
  "speed": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "https://cdn.example.com/audio.mp3",
  "duration": 5.2
}
```

### Media Management

#### POST /api/media/upload
Uploads media files (images, videos, audio).

**Authentication:** Required
**Rate Limit:** 30 requests per minute

**Request:** multipart/form-data
- `file`: The media file
- `type`: Media type (image, video, audio)
- `projectId`: Associated project ID (optional)

**Response:**
```json
{
  "success": true,
  "mediaId": "media_id",
  "url": "https://cdn.example.com/media.png",
  "size": 1024000,
  "type": "image"
}
```

#### GET /api/media/{id}
Retrieves media file information.

**Authentication:** Required

**Response:**
```json
{
  "id": "media_id",
  "url": "https://cdn.example.com/media.png",
  "type": "image",
  "size": 1024000,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### DELETE /api/media/{id}
Deletes a media file.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

### Projects

#### GET /api/projects
Lists user projects.

**Authentication:** Required

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term

**Response:**
```json
{
  "projects": [
    {
      "id": "project_id",
      "name": "My Video Project",
      "description": "Project description",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### POST /api/projects
Creates a new project.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description"
}
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "project_id",
    "name": "New Project",
    "description": "Project description",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/projects/{id}
Retrieves project details.

**Authentication:** Required

**Response:**
```json
{
  "id": "project_id",
  "name": "Project Name",
  "description": "Project description",
  "media": [
    {
      "id": "media_id",
      "type": "video",
      "url": "https://cdn.example.com/video.mp4"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### User Management

#### GET /api/user/profile
Retrieves user profile information.

**Authentication:** Required

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "avatar": "https://cdn.example.com/avatar.jpg",
  "subscription": {
    "plan": "Pro",
    "status": "active",
    "renewsOn": "2024-02-01T00:00:00Z"
  },
  "usage": {
    "projects": 5,
    "mediaAssets": 25,
    "aiCredits": 150,
    "storage": 2.5
  }
}
```

#### PUT /api/user/profile
Updates user profile information.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Name",
  "avatar": "https://cdn.example.com/new-avatar.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Updated Name",
    "avatar": "https://cdn.example.com/new-avatar.jpg"
  }
}
```

### Support

#### POST /api/support/tickets
Creates a support ticket.

**Authentication:** Required

**Request Body:**
```json
{
  "subject": "Issue with video generation",
  "message": "I'm having trouble generating videos from URLs...",
  "priority": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "ticketId": "ticket_123",
  "message": "Support ticket created successfully"
}
```

#### GET /api/support/tickets
Lists user support tickets.

**Authentication:** Required

**Response:**
```json
{
  "tickets": [
    {
      "id": "ticket_123",
      "subject": "Issue with video generation",
      "status": "open",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastReply": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Admin Endpoints

#### GET /api/admin/analytics
Retrieves platform analytics (admin only).

**Authentication:** Required (Admin role)

**Response:**
```json
{
  "summary": {
    "totalUsers": 1000,
    "activeSubscriptions": 250,
    "mrr": 2500,
    "churnRate": 0.02
  },
  "userGrowth": [
    { "date": "2024-01-01", "users": 950 },
    { "date": "2024-01-02", "users": 1000 }
  ],
  "revenueData": [
    { "date": "2024-01-01", "mrr": 2400 },
    { "date": "2024-01-02", "mrr": 2500 }
  ]
}
```

#### GET /api/admin/settings
Retrieves admin settings (admin only).

**Authentication:** Required (Admin role)

**Response:**
```json
{
  "appName": "FinalClickVid",
  "logoUrl": "https://cdn.example.com/logo.png",
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "priceMonthly": 0,
      "features": ["Basic features"]
    }
  ],
  "apiKeys": {
    "openai": "sk-...",
    "elevenlabs": "..."
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Webhooks

### Stripe Webhook

**Endpoint:** `POST /api/stripe/webhook`

Handles Stripe webhook events for subscription management.

**Request Headers:**
```
Stripe-Signature: <signature>
```

**Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## SDK and Integration

### JavaScript/TypeScript Client

```typescript
import { FinalClickVidClient } from 'finalclickvid-sdk';

const client = new FinalClickVidClient({
  baseURL: 'https://api.finalclickvid.com',
  apiKey: 'your-api-key'
});

// Generate video script
const script = await client.video.generateFromUrl({
  url: 'https://example.com/article',
  topic: 'Main conclusions'
});

// Upload media
const media = await client.media.upload(file, {
  type: 'video',
  projectId: 'project_id'
});
```

### Python Client

```python
from finalclickvid import FinalClickVidClient

client = FinalClickVidClient(
    base_url='https://api.finalclickvid.com',
    api_key='your-api-key'
)

# Generate video script
script = client.video.generate_from_url(
    url='https://example.com/article',
    topic='Main conclusions'
)

# Upload media
media = client.media.upload(file, type='video', project_id='project_id')
```

## Rate Limiting Best Practices

1. **Implement exponential backoff** when receiving 429 responses
2. **Check rate limit headers** to avoid hitting limits
3. **Cache responses** where appropriate
4. **Use batch operations** when available

## Security Considerations

1. **Never expose API keys** in client-side code
2. **Use HTTPS** for all API requests
3. **Validate all input data** before processing
4. **Implement proper authentication** and authorization
5. **Log all API access** for monitoring and auditing

## Support

For API support and questions:
- Email: api-support@finalclickvid.com
- Documentation: https://docs.finalclickvid.com
- Status Page: https://status.finalclickvid.com

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Core video generation endpoints
- Authentication and user management
- Media upload and management
- Admin analytics and settings

### v1.1.0 (2024-01-15)
- Added rate limiting
- Enhanced error responses
- New AI voice generation endpoint
- Improved webhook handling

### v1.2.0 (2024-02-01)
- Added batch operations
- Enhanced search functionality
- New analytics endpoints
- Performance improvements

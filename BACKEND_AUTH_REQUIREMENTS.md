# Backend Authentication Requirements

This document outlines the backend API requirements for the platform-aware authentication system implemented in the frontend.

---

## Overview

The frontend now supports **two authentication modes**:

| Platform | Token Storage | Refresh Token Handling |
|----------|---------------|------------------------|
| **Web** | `localStorage` | HTTP-only cookie (SSO enabled) |
| **Mobile** | Capacitor Preferences (native secure storage) | Stored locally in response body |

---

## Required API Endpoints

### 1. Web Login
```
POST /v2/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "nameWithInitials": "J. Doe",
    "userType": "Student",
    "imageUrl": "https://..."
  }
}
```

**Response Headers (CRITICAL):**
```
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

> ⚠️ The refresh token MUST be set as an HTTP-only cookie for web security.

---

### 2. Mobile Login
```
POST /v2/auth/login/mobile
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "android_1706438400000_abc123xyz"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "nameWithInitials": "J. Doe",
    "userType": "Student",
    "imageUrl": "https://..."
  }
}
```

> ⚠️ Mobile returns `refresh_token` in the response body (not as cookie).

---

### 3. Web Token Refresh
```
POST /auth/refresh
```

**Request Headers:**
```
Cookie: refresh_token=<token>
Content-Type: application/json
```

**Request Body:** (empty or `{}`)

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "nameWithInitials": "J. Doe",
    "userType": "Student",
    "imageUrl": "https://..."
  }
}
```

**Response Headers:**
```
Set-Cookie: refresh_token=<new_token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

---

### 4. Mobile Token Refresh
```
POST /auth/refresh/mobile
```

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "android_1706438400000_abc123xyz"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "nameWithInitials": "J. Doe",
    "userType": "Student",
    "imageUrl": "https://..."
  }
}
```

---

### 5. Web Logout
```
POST /auth/logout
```

**Request Headers:**
```
Cookie: refresh_token=<token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Response Headers:**
```
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

> ⚠️ Clear the HTTP-only cookie by setting `Max-Age=0`.

---

### 6. Mobile Logout
```
POST /auth/logout/mobile
```

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "android_1706438400000_abc123xyz"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 7. Get Current User
```
GET /auth/me
```

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "nameWithInitials": "J. Doe",
  "userType": "Student",
  "imageUrl": "https://..."
}
```

---

## Token Specifications

### Access Token (JWT)
| Property | Value |
|----------|-------|
| Type | JWT |
| Expiry | 15 minutes - 1 hour |
| Storage (Web) | `localStorage` |
| Storage (Mobile) | Capacitor Preferences |

### Refresh Token (JWT or Opaque)
| Property | Value |
|----------|-------|
| Type | JWT or Opaque Token |
| Expiry | 7 - 30 days |
| Storage (Web) | HTTP-only cookie |
| Storage (Mobile) | Capacitor Preferences |

---

## Security Considerations

### Web Platform
1. **HTTP-only cookies** - Refresh token must never be accessible via JavaScript
2. **Secure flag** - Cookie only sent over HTTPS
3. **SameSite=Strict** - Prevent CSRF attacks
4. **CORS** - Ensure `credentials: include` is allowed

### Mobile Platform
1. **Device ID** - Track and validate device sessions
2. **Token rotation** - Issue new refresh token on each refresh
3. **Revocation** - Support invalidating specific device tokens

---

## CORS Configuration

Backend must allow:

```javascript
// Express.js example
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://lms.suraksha.lk',
    'capacitor://localhost',  // iOS
    'http://localhost'        // Android WebView
  ],
  credentials: true,  // CRITICAL for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Database Schema (Suggested)

### RefreshTokens Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,  -- Hashed refresh token
  device_id VARCHAR(255),            -- NULL for web, set for mobile
  platform ENUM('web', 'android', 'ios') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,              -- NULL if active
  
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_device_id (device_id)
);
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "Token has been revoked"
}
```

### 400 Bad Request
```json
{
  "error": "bad_request",
  "message": "Missing required field: email"
}
```

---

## Implementation Checklist

- [ ] `POST /v2/auth/login` - Web login with HTTP-only cookie
- [ ] `POST /v2/auth/login/mobile` - Mobile login with token in body
- [ ] `POST /auth/refresh` - Web token refresh (uses cookie)
- [ ] `POST /auth/refresh/mobile` - Mobile token refresh (uses body)
- [ ] `POST /auth/logout` - Web logout (clears cookie)
- [ ] `POST /auth/logout/mobile` - Mobile logout (revokes token)
- [ ] `GET /auth/me` - Get current user data
- [ ] CORS configuration with `credentials: true`
- [ ] Token rotation on refresh
- [ ] Device session management for mobile
- [ ] Token revocation support

---

## Testing

### Web Flow
1. Login → Check cookie is set (HttpOnly)
2. Refresh → Check new access token returned
3. Logout → Check cookie is cleared

### Mobile Flow
1. Login → Check both tokens in response body
2. Refresh → Send refresh_token in body, get new tokens
3. Logout → Send refresh_token in body, verify revoked

---

## Questions?

Contact the frontend team if you need clarification on any endpoint or data structure.

---

# Push Notification Backend Requirements

This section outlines the backend API requirements for push notifications.

---

## FCM Token Management Endpoints

### 1. Register FCM Token
```
POST /users/fcm-tokens
```

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "uuid-here",
  "fcmToken": "firebase-cloud-messaging-token",
  "deviceId": "android_1706438400000_abc123xyz",
  "deviceType": "android",
  "deviceName": "Samsung Galaxy S21",
  "osVersion": "Android 14",
  "appVersion": "1.0.0",
  "isActive": true
}
```

**Device Types:** `android`, `ios`, `web`

**Response:**
```json
{
  "id": "token-uuid-here",
  "userId": "uuid-here",
  "fcmToken": "firebase-cloud-messaging-token",
  "deviceId": "android_1706438400000_abc123xyz",
  "deviceType": "android",
  "deviceName": "Samsung Galaxy S21",
  "isActive": true,
  "createdAt": "2026-01-21T10:00:00.000Z",
  "updatedAt": "2026-01-21T10:00:00.000Z"
}
```

### 2. Get User's FCM Tokens
```
GET /users/fcm-tokens/user/:userId
```

**Response:**
```json
{
  "data": [
    {
      "id": "token-uuid-1",
      "deviceId": "android_...",
      "deviceType": "android",
      "deviceName": "Samsung Galaxy S21",
      "isActive": true,
      "lastUsedAt": "2026-01-21T10:00:00.000Z"
    },
    {
      "id": "token-uuid-2",
      "deviceId": "web_...",
      "deviceType": "web",
      "deviceName": "Chrome",
      "isActive": true,
      "lastUsedAt": "2026-01-20T08:00:00.000Z"
    }
  ]
}
```

### 3. Delete FCM Token (Logout)
```
DELETE /users/fcm-tokens/:id
```

**Response:** `204 No Content`

---

## User Notification Endpoints

### 4. Get System/Global Notifications
```
GET /push-notifications/system
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `unreadOnly` (optional): Filter unread only (default: false)

**Response:**
```json
{
  "data": [
    {
      "id": "notification-uuid",
      "title": "System Maintenance",
      "body": "System will be down for maintenance...",
      "imageUrl": null,
      "icon": "ic_maintenance",
      "actionUrl": "/announcements/123",
      "scope": "GLOBAL",
      "priority": "HIGH",
      "isRead": false,
      "createdAt": "2026-01-21T08:00:00.000Z",
      "sentAt": "2026-01-21T08:00:01.000Z",
      "senderName": "System Admin"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

### 5. Get System Unread Count
```
GET /push-notifications/system/unread-count
```

**Response:**
```json
{
  "unreadCount": 3,
  "totalCount": 15
}
```

### 6. Get Institute Notifications
```
GET /push-notifications/institute/:instituteId
```

**Query Parameters:**
- `page`, `limit`, `unreadOnly` (same as system)
- `scope` (optional): `INSTITUTE`, `CLASS`, or `SUBJECT`
- `classId` (optional): Filter by class
- `subjectId` (optional): Filter by subject

**Response:** Same structure as system notifications, with additional fields:
- `targetClassName` - For CLASS/SUBJECT scope
- `targetSubjectName` - For SUBJECT scope

### 7. Get Institute Unread Count
```
GET /push-notifications/institute/:instituteId/unread-count
```

### 8. Mark Notification as Read
```
POST /push-notifications/:id/read
```

**Response:** `200 OK`

### 9. Mark Multiple as Read
```
POST /push-notifications/mark-read
```

**Request Body:**
```json
{
  "notificationIds": ["id1", "id2", "id3"]
}
```

**Response:**
```json
{
  "message": "Marked 3 notifications as read",
  "count": 3
}
```

### 10. Mark All as Read (Institute)
```
POST /push-notifications/institute/:instituteId/mark-all-read
```

### 11. Mark All as Read (System)
```
POST /push-notifications/system/mark-all-read
```

---

## Admin Notification Endpoints

### 12. Create Notification
```
POST /push-notifications/admin
```

**Access:** SUPERADMIN, Institute Admin, Teacher

**Request Body:**
```json
{
  "title": "Holiday Announcement",
  "body": "School will remain closed on January 26th...",
  "imageUrl": "https://example.com/image.jpg",
  "icon": "ic_announcement",
  "actionUrl": "/announcements/holiday-jan26",
  "scope": "INSTITUTE",
  "targetUserTypes": ["STUDENTS", "PARENTS"],
  "instituteId": "institute-uuid",
  "classId": "class-uuid",
  "subjectId": "subject-uuid",
  "priority": "HIGH",
  "sendImmediately": true,
  "scheduledAt": "2026-01-25T08:00:00.000Z"
}
```

**Scope Values:**
- `GLOBAL` - All users (SUPERADMIN only)
- `INSTITUTE` - Institute-wide
- `CLASS` - Specific class
- `SUBJECT` - Specific subject

**Target User Types:**
- `ALL` - Everyone in scope
- `STUDENTS` - Students only
- `PARENTS` - Parents only
- `TEACHERS` - Teachers only
- `ADMINS` - Admins only

**Priority:** `LOW`, `NORMAL`, `HIGH`, `URGENT`

**Response:**
```json
{
  "id": "notification-uuid",
  "title": "Holiday Announcement",
  "body": "School will remain closed...",
  "scope": "INSTITUTE",
  "status": "SENT",
  "recipientCount": 450,
  "successCount": 445,
  "failureCount": 5,
  "createdAt": "2026-01-21T10:00:00.000Z",
  "sentAt": "2026-01-21T10:00:03.000Z",
  "senderId": "admin-user-uuid",
  "senderName": "Admin User"
}
```

### 13. Get Admin Notifications List
```
GET /push-notifications/admin
```

**Query Parameters:**
- `page`, `limit`
- `scope` (optional)
- `status` (optional): `DRAFT`, `PENDING`, `SENT`, `FAILED`, `CANCELLED`
- `instituteId` (optional)

### 14. Get Notification Details
```
GET /push-notifications/admin/:id
```

### 15. Send Draft Notification
```
POST /push-notifications/admin/:id/send
```

### 16. Resend Failed Notification
```
POST /push-notifications/admin/:id/resend
```

### 17. Cancel Scheduled Notification
```
PUT /push-notifications/admin/:id/cancel
```

### 18. Delete Notification
```
DELETE /push-notifications/admin/:id
```

---

## Firebase Admin SDK Setup

Backend needs Firebase Admin SDK to send push notifications:

```typescript
// Node.js example
import * as admin from 'firebase-admin';

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "suraksha-ab3c0",
    privateKeyId: "YOUR_PRIVATE_KEY_ID",
    privateKey: "YOUR_PRIVATE_KEY",
    clientEmail: "firebase-adminsdk-xxxxx@suraksha-ab3c0.iam.gserviceaccount.com"
  })
});

// Send notification
async function sendPushNotification(tokens: string[], payload: any) {
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl
    },
    data: {
      notificationId: payload.id,
      actionUrl: payload.actionUrl || '',
      scope: payload.scope
    },
    tokens: tokens // Array of FCM tokens
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  return {
    successCount: response.successCount,
    failureCount: response.failureCount
  };
}
```

---

## Database Schema (Push Notifications)

### FCM Tokens Table
```sql
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  fcm_token VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_type ENUM('android', 'ios', 'web') NOT NULL,
  device_name VARCHAR(255),
  os_version VARCHAR(100),
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  
  UNIQUE(device_id),
  INDEX idx_user_id (user_id),
  INDEX idx_fcm_token (fcm_token)
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  image_url VARCHAR(500),
  icon VARCHAR(100),
  action_url VARCHAR(500),
  data_payload JSONB,
  scope ENUM('GLOBAL', 'INSTITUTE', 'CLASS', 'SUBJECT') NOT NULL,
  target_user_types JSONB NOT NULL, -- Array of user types
  institute_id UUID REFERENCES institutes(id),
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
  status ENUM('DRAFT', 'PENDING', 'SENT', 'FAILED', 'CANCELLED') DEFAULT 'DRAFT',
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  sender_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_scope (scope),
  INDEX idx_institute_id (institute_id),
  INDEX idx_status (status),
  INDEX idx_scheduled_at (scheduled_at)
);
```

### User Notification Reads Table
```sql
CREATE TABLE notification_reads (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id),
  user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(notification_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_notification_id (notification_id)
);
```

---

## Push Notification Implementation Checklist

### FCM Token Management
- [ ] `POST /users/fcm-tokens` - Register token
- [ ] `GET /users/fcm-tokens/user/:userId` - List user tokens
- [ ] `DELETE /users/fcm-tokens/:id` - Delete token

### User Notifications
- [ ] `GET /push-notifications/system` - System notifications
- [ ] `GET /push-notifications/system/unread-count`
- [ ] `GET /push-notifications/institute/:id` - Institute notifications
- [ ] `GET /push-notifications/institute/:id/unread-count`
- [ ] `POST /push-notifications/:id/read` - Mark as read
- [ ] `POST /push-notifications/mark-read` - Mark multiple
- [ ] `POST /push-notifications/institute/:id/mark-all-read`
- [ ] `POST /push-notifications/system/mark-all-read`

### Admin Notifications
- [ ] `POST /push-notifications/admin` - Create notification
- [ ] `GET /push-notifications/admin` - List admin notifications
- [ ] `GET /push-notifications/admin/:id` - Get details
- [ ] `POST /push-notifications/admin/:id/send` - Send draft
- [ ] `POST /push-notifications/admin/:id/resend` - Resend failed
- [ ] `PUT /push-notifications/admin/:id/cancel` - Cancel scheduled
- [ ] `DELETE /push-notifications/admin/:id` - Delete

### Infrastructure
- [ ] Firebase Admin SDK configured
- [ ] FCM service account credentials stored securely
- [ ] Scheduled notification job runner (cron)
- [ ] Failed notification retry mechanism

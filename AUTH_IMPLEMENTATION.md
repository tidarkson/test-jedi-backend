# Authentication System Implementation Guide

## Overview

This document provides comprehensive details about the authentication system implemented for Test-Jedi Backend. The system includes:

- **JWT-based authentication** with access tokens (15-minute expiry) and refresh tokens (7-day expiry)
- **Bcrypt password hashing** (12 rounds) for secure password storage
- **Role-Based Access Control (RBAC)** with 6 role levels: OWNER, ADMIN, QA_LEAD, QA_ENGINEER, DEVELOPER, VIEWER
- **Project-level permission overrides** for granular access control
- **Redis-based refresh token management** for token revocation
- **httpOnly cookies** for secure refresh token storage

## Architecture

### Components

```
┌─────────────┐
│    Client   │
└──────┬──────┘
       │
       ├─ POST /register        → Creates user + org
       ├─ POST /login           → Returns JWT tokens
       ├─ POST /refresh         → Issues new access token
       ├─ POST /logout          → Revokes refresh token
       └─ GET  /me              → Current user profile
       │
       ▼
┌─────────────────────────┐
│   Express Middleware    │
├─────────────────────────┤
│ authenticate()          │ ← Verifies JWT token
│ requireRole()           │ ← Checks user roles
│ requireProjectPerm()    │ ← Checks project-level permissions
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   AuthController        │
├─────────────────────────┤
│ register()              │
│ login()                 │
│ refresh()               │
│ logout()                │
│ getProfile()            │
│ changePassword()        │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│    AuthService          │
├─────────────────────────┤
│ JWT generation/verify   │
│ Bcrypt hashing          │
│ Redis token management  │
│ RBAC permission checks  │
└──────────┬──────────────┘
           │
      ┌────┴────┐
      ▼         ▼
   Prisma    Redis
   (Users)   (Tokens)
```

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
OWNER
└─ Full system access including billing
   └─ ADMIN
      └─ All permissions except billing/organization-level settings
         └─ QA_LEAD
            └─ Can manage test runs, approve results, close runs
               └─ QA_ENGINEER
                  └─ Can create and edit test cases and runs
                     └─ DEVELOPER
                        └─ Can view and execute tests
                           └─ VIEWER
                              └─ Read-only access
```

### Permission Matrix

| Action | VIEWER | DEVELOPER | QA_ENGINEER | QA_LEAD | ADMIN | OWNER |
|--------|--------|-----------|-------------|---------|-------|-------|
| read   | ✓      | ✓         | ✓           | ✓       | ✓     | ✓     |
| create | ✗      | ✗         | ✓           | ✓       | ✓     | ✓     |
| edit   | ✗      | ✗         | ✓           | ✓       | ✓     | ✓     |
| delete | ✗      | ✗         | ✗           | ✗       | ✓     | ✓     |
| assign | ✗      | ✗         | ✓           | ✓       | ✓     | ✓     |
| approve| ✗      | ✗         | ✗           | ✓       | ✓     | ✓     |
| close  | ✗      | ✗         | ✗           | ✓       | ✓     | ✓     |
| manage_users | ✗ | ✗        | ✗           | ✗       | ✓     | ✓     |

## Configuration

### Environment Variables

```env
# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=15m                    # Access token expiry
REFRESH_TOKEN_EXPIRY=7d           # Refresh token expiry

# Bcrypt
BCRYPT_ROUNDS=12                  # Higher = slower but more secure

# Redis (for token management)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# Cookies
NODE_ENV=production               # Secure flag requires HTTPS in production

# CORS
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### 1. Register User

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Create a new user account and organization

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePass123!",
  "organizationName": "Acme Corp"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (@$!%*?&)

**Success Response (201):**
```json
{
  "status": "success",
  "code": 201,
  "data": {
    "user": {
      "userId": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "roles": ["OWNER"]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

**Cookies Set:**
- `refreshToken` (httpOnly, secure, sameSite=strict, maxAge=7d)

**Error Responses:**
- `409` - User already exists
- `400` - Validation failed (invalid email, weak password, etc.)

---

### 2. Login User

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Authenticate user and return tokens

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "user": {
      "userId": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "roles": ["OWNER"],
      "organizationId": "org-uuid"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Logged in successfully"
}
```

**Cookies Set:**
- `refreshToken` (httpOnly, secure, sameSite=strict, maxAge=7d)

**Error Responses:**
- `401` - Invalid credentials
- `400` - Validation failed

---

### 3. Refresh Access Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Description:** Issue a new access token using refresh token

**Request:**
- Method: `POST`
- Cookie: `refreshToken` (automatically sent by browser)
- Or Body: `{ "refreshToken": "token-string" }`

**Success Response (200):**
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "accessToken": "new-jwt-token-here"
  },
  "message": "Access token refreshed"
}
```

**Error Responses:**
- `401` - Token expired or revoked
- `401` - Invalid refresh token

---

### 4. Logout User

**Endpoint:** `POST /api/v1/auth/logout`

**Description:** Revoke refresh token and logout user

**Request:**
- Headers: `Authorization: Bearer {accessToken}`

**Success Response (200):**
```json
{
  "status": "success",
  "code": 200,
  "message": "Logged out successfully"
}
```

**Side Effects:**
- Refresh token stored in Redis as revoked
- `refreshToken` cookie cleared

**Error Responses:**
- `401` - Unauthorized (missing token)

---

### 5. Get Current User Profile

**Endpoint:** `GET /api/v1/auth/me`

**Description:** Get authenticated user's profile

**Request:**
- Headers: `Authorization: Bearer {accessToken}`

**Success Response (200):**
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "userId": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["OWNER"],
    "organizationId": "org-uuid"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found

---

### 6. Change Password

**Endpoint:** `POST /api/v1/auth/change-password`

**Description:** Change user password (requires current password)

**Request:**
- Headers: `Authorization: Bearer {accessToken}`
- Body:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "code": 200,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `401` - Unauthorized or wrong current password
- `400` - Validation failed (weak password)

---

## Using Middleware

### Protect Route with Authentication

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { MyController } from '../controllers/MyController';

const router = Router();

router.get(
  '/protected-route',
  authenticate,  // Requires valid JWT token
  MyController.handler
);

export default router;
```

### Require Specific Roles

```typescript
import { requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

router.post(
  '/admin-only',
  authenticate,
  requireRole('ADMIN', 'OWNER'),  // Only ADMIN or OWNER can access
  AdminController.handler
);
```

### Require Project Permission

```typescript
import { requireProjectPermission } from '../middleware/auth';

router.post(
  '/projects/:projectId/test-cases',
  authenticate,
  requireProjectPermission('create'),  // User must have 'create' permission
  TestCaseController.create
);
```

---

## Client Implementation (Frontend)

### Setup

```typescript
// axiosConfig.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true,  // Send cookies
});

// Axios interceptor for access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('accessToken', data.data.accessToken);
        
        // Retry original request
        return api(error.config);
      } catch (e) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Register

```typescript
async function register(
  email: string,
  name: string,
  password: string,
  organizationName: string
) {
  const { data } = await api.post('/auth/register', {
    email,
    name,
    password,
    organizationName,
  });

  localStorage.setItem('accessToken', data.data.accessToken);
  // refreshToken is in httpOnly cookie
  return data.data.user;
}
```

### Login

```typescript
async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', {
    email,
    password,
  });

  localStorage.setItem('accessToken', data.data.accessToken);
  return data.data.user;
}
```

### Logout

```typescript
async function logout() {
  await api.post('/auth/logout');
  localStorage.removeItem('accessToken');
}
```

### Protected Requests

```typescript
// All subsequent requests will automatically include the Authorization header
const response = await api.get('/projects');  // Automatically includes JWT
```

---

## Security Considerations

### Best Practices Implemented

1. **Password Security**
   - Bcrypt hashing with 12 rounds (configurable)
   - Never store plain passwords
   - Passwords validated for strength

2. **Token Security**
   - JWT signed with secret key
   - Short-lived access tokens (15 min default)
   - Long-lived refresh tokens stored securely
   - Refresh tokens can be revoked via Redis

3. **HTTP Cookie Security**
   - httpOnly flag (cannot be accessed by JavaScript)
   - secure flag (HTTPS only in production)
   - sameSite=strict (prevents CSRF)

4. **Rate Limiting** (to be implemented)
   - Limit login attempts
   - Throttle token refresh

5. **CORS Protection**
   - Whitelist origin
   - Credentials only from trusted sources

### Additional Security Measures to Consider

1. **Email Verification**
   - Send verification link on registration
   - Verify email before account activation

2. **Two-Factor Authentication (2FA)**
   - TOTP (Time-based One-Time Password)
   - SMS/Email codes

3. **Session Management**
   - Track active sessions
   - Device fingerprinting
   - Force logout from other devices

4. **Audit Logging**
   - Log all auth events
   - Track failed login attempts
   - Monitor suspicious activities

5. **API Rate Limiting**
   - Limit auth endpoints specifically
   - Prevent brute force attacks

---

## Error Codes

```typescript
enum ErrorCodes {
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // Server
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',
}
```

---

## Database Schema

### User Model

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String
  passwordHash    String            // Bcrypt hash
  role            UserRole  @default(QA_ENGINEER)
  avatarUrl       String?
  isEmailVerified Boolean   @default(false)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organizationMembers OrganizationMember[]
  projectMembers      ProjectMember[]
  // ... other relations
}
```

### New Enum Values

```prisma
enum UserRole {
  OWNER          // Organization owner + all permissions
  ADMIN          // All permissions except billing
  QA_LEAD        // Can manage runs and approve results
  QA_ENGINEER    // Can create/edit cases and runs
  DEVELOPER      // Can view and execute tests
  VIEWER         // Read-only access
}
```

---

## Testing

### Unit Tests

Tests are located in `__tests__/unit/services/`

```bash
# Run all tests
npm test

# Run specific test file
npm test -- AuthService.test.ts

# Run with coverage
npm test:coverage
```

### Integration Tests

Tests located in `__tests__/integration/`

Test scenarios:
- User registration with validation
- Login with correct/incorrect credentials
- Token refresh and expiration
- Logout and token revocation
- Permission checks for different roles

---

## Troubleshooting

### Token Errors

**"Invalid token" on refresh**
- Refresh token may have expired (7 days)
- Redis might be not running
- Token was revoked (after logout)

**"Missing token" on protected routes**
- Check Authorization header format: `Bearer {token}`
- Browser may not be sending cookies (withCredentials needed)

### Password Issues

**"Password must contain uppercase, lowercase, number, and special character"**
- Check password meets all requirements
- Special characters: @$!%*?&

### CORS Errors

**"CORS policy: No 'Access-Control-Allow-Origin' header"**
- Verify domain is in CORS_ORIGIN whitelist
- Check frontend and backend are aligned
- Ensure credentials flag is set correctly

---

## Deployment Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Change SESSION_SECRET to strong random string
- [ ] Set NODE_ENV=production
- [ ] Configure DATABASE_URL for production database
- [ ] Configure REDIS_URL for production Redis
- [ ] Set CORS_ORIGIN to production domain
- [ ] Enable HTTPS (secure flag automatically set)
- [ ] Set up email service for verification emails
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring/logging (Sentry)
- [ ] Review and update password requirements if needed
- [ ] Test refresh token expiry and revocation
- [ ] Verify cookie settings (httpOnly, secure, sameSite)

---

## References

- [JWT.io](https://jwt.io)
- [Bcrypt.js](https://www.npmjs.com/package/bcrypt)
- [Zod Validation](https://zod.dev)
- [Prisma Authentication](https://www.prisma.io/docs/concepts/components/prisma-client/authentication-and-credentials)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

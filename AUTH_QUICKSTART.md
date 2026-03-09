# Authentication - Quick Start Guide

## Installation

All dependencies are already included in `package.json`. Just run:

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update required environment variables:
```env
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/test_jedi_dev

# JWT secrets (change these in production!)
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Redis for token management
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

## Database Setup

1. Create database:
```bash
# Make sure PostgreSQL is running
createdb test_jedi_dev
```

2. Run migrations:
```bash
npm run db:migrate
```

3. (Optional) Seed with test data:
```bash
npm run db:seed
```

## Start Development Server

```bash
npm run dev
```

Server will be running at `http://localhost:3000`

## Testing Authentication

### 1. Register a new user

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePass123!",
    "organizationName": "My Company"
  }'
```

**Success Response:**
```json
{
  "status": "success",
  "code": 201,
  "data": {
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "roles": ["OWNER"]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login user

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Access protected endpoint

Use the `accessToken` from login/register:

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 4. Refresh token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Testing with Postman

### Import Collection

1. Open Postman
2. Create new collection: "Test-Jedi Auth"
3. Add requests:

**Register**
- Method: POST
- URL: `http://localhost:3000/api/v1/auth/register`
- Body:
```json
{
  "email": "test@example.com",
  "name": "Test User",
  "password": "TestPass123!",
  "organizationName": "Test Organization"
}
```

**Login**
- Method: POST
- URL: `http://localhost:3000/api/v1/auth/login`
- Body:
```json
{
  "email": "test@example.com",
  "password": "TestPass123!"
}
```

**Get Profile (Protected)**
- Method: GET
- URL: `http://localhost:3000/api/v1/auth/me`
- Headers:
  - Key: `Authorization`
  - Value: `Bearer {accessToken}` (copy from login response)

## Testing with Frontend

### React Example

```typescript
// auth.api.ts
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true,
});

// Store token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (email: string, name: string, password: string, organizationName: string) =>
    API.post('/auth/register', { email, name, password, organizationName }),
  
  login: (email: string, password: string) =>
    API.post('/auth/login', { email, password }),
  
  getProfile: () =>
    API.get('/auth/me'),
  
  logout: () =>
    API.post('/auth/logout'),
};

// useAuth.ts
import { useState } from 'react';
import { authAPI } from './auth.api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = async (email: string, name: string, password: string, org: string) => {
    setLoading(true);
    try {
      const { data } = await authAPI.register(email, name, password, org);
      localStorage.setItem('accessToken', data.data.accessToken);
      setUser(data.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      localStorage.setItem('accessToken', data.data.accessToken);
      setUser(data.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('accessToken');
      setUser(null);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return { user, loading, error, register, login, logout };
}
```

## Common Issues

### Redis Connection Failed
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_URL in .env
- If Redis is disabled, set `REDIS_ENABLED=false` (not recommended for production)

### Database Connection Failed
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Create database if not exists

### CORS Errors
- Verify frontend domain is in CORS_ORIGIN
- Ensure withCredentials is set on frontend API client

### Invalid Password Error
- Password must be at least 8 characters
- Must include: uppercase, lowercase, number, and special character (@$!%*?&)

Example valid passwords:
- `MySecretPass123!`
- `Test@1234567`
- `Secure$Password99`

### Token Expired
- Access tokens expire after 15 minutes (default)
- Use refresh endpoint to get new access token
- Refresh tokens expire after 7 days

## File Structure

```
src/
├── config/
│   ├── environment.ts   # Config from env vars
│   ├── database.ts      # Prisma setup
│   ├── redis.ts         # Redis setup
│   └── logger.ts        # Winston logging
├── types/
│   ├── auth.ts          # Auth type definitions
│   ├── express.ts       # Express request extensions
│   └── errors.ts        # Error types
├── validators/
│   └── auth.validator.ts # Zod validation schemas
├── services/
│   └── AuthService.ts   # Business logic
├── controllers/
│   └── AuthController.ts # HTTP handlers
├── middleware/
│   ├── auth.ts          # JWT & RBAC middleware
│   ├── errorHandler.ts  # Global error handling
│   └── requestLogger.ts # Request logging
├── routes/
│   └── auth.ts          # Route definitions
└── index.ts             # Express app setup
```

## Next Steps

1. **User Management**
   - Add user updating (profile, avatar, name)
   - Add user deletion (with privacy considerations)
   - Add user listing (for admins)

2. **Email Verification**
   - Send verification email on registration
   - Verify email before account activation

3. **Two-Factor Authentication**
   - TOTP apps
   - SMS verification
   - Email codes

4. **Advanced RBAC**
   - Invite users to organization
   - Set per-project roles
   - Custom permission definitions

5. **Audit Logging**
   - Log all auth events
   - Track login attempts
   - Monitor suspicious activity

6. **Security Enhancements**
   - Rate limiting on auth endpoints
   - IP whitelisting
   - Device fingerprinting
   - Session management

## Resources

- [Auth Implementation Details](./AUTH_IMPLEMENTATION.md)
- [Prisma Docs](https://www.prisma.io)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Questions?** Check the detailed [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) guide for comprehensive documentation.

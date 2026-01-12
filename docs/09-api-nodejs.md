# Node.js API Documentation

## Base URL

```
http://localhost:5002
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained via the `/api/auth/login` or `/api/auth/register` endpoints.

## Endpoints

### Authentication

#### `POST /api/auth/register`

Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_123",
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "free",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error (invalid email, short password, etc.)
- `409`: Email already exists

---

#### `POST /api/auth/login`

Login user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_123",
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "free"
  }
}
```

**Error Responses:**
- `401`: Invalid credentials

---

#### `GET /api/auth/me`

Get current authenticated user.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "user_id_123",
  "name": "John Doe",
  "email": "john@example.com",
  "plan": "free",
  "usage": {
    "bots": 1,
    "chats_today": 5,
    "code_to_doc": 2,
    "tokens": 2500
  },
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

#### `PUT /api/auth/profile`

Update user profile.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

**Response:**
```json
{
  "id": "user_id_123",
  "name": "John Updated",
  "email": "john.updated@example.com",
  "plan": "free"
}
```

---

#### `PUT /api/auth/change-password`

Change user password.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Error Responses:**
- `401`: Current password incorrect

---

### User Management

#### `GET /api/users/usage`

Get user usage statistics.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "plan": "free",
  "limits": {
    "bots": 1,
    "chats_per_day": 10,
    "code_to_doc": 2,
    "tokens": 5000
  },
  "usage": {
    "bots": 1,
    "chats_today": 5,
    "code_to_doc": 2,
    "tokens": 2500
  },
  "remaining": {
    "bots": 0,
    "chats_today": 5,
    "code_to_doc": 0,
    "tokens": 2500
  }
}
```

---

#### `POST /api/users/usage/increment`

Increment usage counter (internal use).

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "codeToDoc",
  "amount": 1
}
```

**Response:**
```json
{
  "success": true,
  "usage": {
    "code_to_doc": 3
  }
}
```

---

#### `PUT /api/users/plan`

Update user plan.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "plan": "pro"
}
```

**Response:**
```json
{
  "id": "user_id_123",
  "plan": "pro",
  "limits": {
    "bots": 5,
    "chats_per_day": 100,
    "code_to_doc": 20,
    "tokens": 50000
  }
}
```

---

#### `DELETE /api/users/account`

Delete user account.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

### Reports

#### `POST /api/reports`

Submit a new report (bug, feature request, feedback).

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "bug",
  "title": "Bug Title",
  "description": "Bug description",
  "category": "frontend"
}
```

**Response:**
```json
{
  "id": "report_id_123",
  "type": "bug",
  "title": "Bug Title",
  "description": "Bug description",
  "category": "frontend",
  "status": "open",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

#### `GET /api/reports`

Get user's reports.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "reports": [
    {
      "id": "report_id_123",
      "type": "bug",
      "title": "Bug Title",
      "status": "open",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `GET /api/reports/:id`

Get a single report.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "report_id_123",
  "type": "bug",
  "title": "Bug Title",
  "description": "Bug description",
  "category": "frontend",
  "status": "open",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

#### `PUT /api/reports/:id`

Update a report.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "resolved"
}
```

**Response:**
```json
{
  "id": "report_id_123",
  "title": "Updated Title",
  "description": "Updated description",
  "status": "resolved"
}
```

---

#### `DELETE /api/reports/:id`

Delete a report.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

---

### Settings

#### `GET /api/settings`

Get user settings.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "theme": "light",
  "notifications": {
    "email": true,
    "push": false
  },
  "preferences": {
    "language": "en",
    "timezone": "UTC"
  }
}
```

---

#### `PUT /api/settings`

Update user settings.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "theme": "dark",
  "notifications": {
    "email": false,
    "push": true
  }
}
```

**Response:**
```json
{
  "theme": "dark",
  "notifications": {
    "email": false,
    "push": true
  }
}
```

---

#### `POST /api/settings/reset`

Reset settings to defaults.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "settings": {
    "theme": "light",
    "notifications": {
      "email": true,
      "push": false
    }
  }
}
```

---

### Generation Status

#### `GET /api/generation-status`

Get code-to-doc generation status and history.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (`pending`, `completed`, `error`)

**Response:**
```json
{
  "statuses": [
    {
      "id": "status_id_123",
      "type": "github_repo",
      "repo_url": "https://github.com/owner/repo",
      "status": "completed",
      "progress": 100,
      "current_step": "Documentation generated",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:05:00Z"
    }
  ],
  "total": 10,
  "limit": 10,
  "offset": 0
}
```

---

#### `POST /api/generation-status`

Create a new generation status entry (internal use).

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "github_repo",
  "repo_url": "https://github.com/owner/repo",
  "status": "pending"
}
```

**Response:**
```json
{
  "id": "status_id_123",
  "type": "github_repo",
  "repo_url": "https://github.com/owner/repo",
  "status": "pending",
  "progress": 0,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

#### `PUT /api/generation-status/:id`

Update generation status (internal use).

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "status": "generating",
  "progress": 50,
  "current_step": "Building RAG index"
}
```

**Response:**
```json
{
  "id": "status_id_123",
  "status": "generating",
  "progress": 50,
  "current_step": "Building RAG index",
  "updated_at": "2025-01-01T00:02:00Z"
}
```

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid or missing token)
- `403`: Forbidden (usage limits exceeded)
- `404`: Not Found
- `409`: Conflict (duplicate email, etc.)
- `500`: Internal Server Error

## Rate Limiting

Rate limiting is applied to prevent abuse:
- **Window**: 15 minutes (900000ms)
- **Max Requests**: 100 per window per IP

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Usage Limits

### Free Plan
- **Bots**: 1
- **Chats per day**: 10
- **Code-to-Doc uses**: 2
- **Tokens**: 5,000

### Pro Plan
- **Bots**: 5
- **Chats per day**: 100
- **Code-to-Doc uses**: 20
- **Tokens**: 50,000

### Enterprise Plan
- **Bots**: Unlimited
- **Chats per day**: Unlimited
- **Code-to-Doc uses**: Unlimited
- **Tokens**: Unlimited

---

**Next:** [API Authentication](./10-api-authentication.md)


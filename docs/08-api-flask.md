# Python Flask API Documentation

## Base URL

```
http://localhost:5001
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The token is obtained from the Node.js backend authentication endpoints.

## Endpoints

### Health Check

#### `GET /api/health`

Check system health and status.

**Response:**
```json
{
  "status": "ok",
  "model": "qwen3-14b",
  "lm_studio": {
    "status": "connected",
    "base_url": "http://192.168.1.83:1234/v1"
  },
  "available_models": ["model1", "model2"],
  "model_loaded": true,
  "max_files": 5,
  "max_repo_files": 100,
  "max_content_preview": 200000,
  "platform": {
    "os": "Windows",
    "cpu_percent": 25.5,
    "memory_percent": 45.2,
    "memory_used_gb": 7.2,
    "memory_total_gb": 16.0,
    "gpu_available": true,
    "gpu_info": {
      "name": "NVIDIA RTX 3060",
      "memory_gb": 12.0
    }
  },
  "faiss": {
    "available": true,
    "backend": "GPU",
    "recommended": "faiss-gpu"
  }
}
```

---

### File Upload

#### `POST /api/upload`

Upload files for documentation generation. Supports regular files and zip archives.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `file`: File(s) to upload (max 5 files, or 1 zip file)

**Response (Regular Files):**
```json
{
  "filename": "example.py, example2.js",
  "filenames": ["example.py", "example2.js"],
  "file_count": 2,
  "content": "FILE: example.py\n...",
  "content_type": "code",
  "skipped": [],
  "is_zip": false
}
```

**Response (Zip File):**
```json
{
  "filename": "project.zip",
  "filenames": ["src/main.py", "src/utils.py", ...],
  "file_count": 45,
  "content": "FILE: src/main.py\n...",
  "content_type": "code",
  "skipped": ["node_modules/", ".git/", ...],
  "warnings": [],
  "is_zip": true,
  "repo_files": [
    {
      "path": "src/main.py",
      "content": "..."
    },
    ...
  ]
}
```

**Error Responses:**
- `400`: Validation error (file type, size, count)
- `500`: Server error

---

### Generate Documentation

#### `POST /api/generate`

Generate documentation from uploaded files or zip archives.

**Request:**
```json
{
  "rawContent": "FILE: example.py\n...",
  "contentType": "code",
  "title": "My Project Documentation",
  "file_count": 2,
  "is_zip": false,
  "repo_files": null
}
```

**For Zip Files:**
```json
{
  "is_zip": true,
  "repo_files": [
    {
      "path": "src/main.py",
      "content": "..."
    }
  ],
  "title": "My Project Documentation"
}
```

**Response:**
```json
{
  "output": "# My Project Documentation\n...",
  "docText": "# My Project Documentation\n...",
  "pdfFilename": "documentation.pdf",
  "pdfPath": "/uploads/documentation.pdf",
  "pdfUrl": "http://localhost:5001/uploads/documentation.pdf",
  "content_type": "code",
  "file_count": 2,
  "success": true
}
```

**Error Responses:**
- `400`: Validation error
- `500`: Generation error

---

### Repository Ingestion

#### `POST /api/repo/ingest`

Ingest a GitHub repository for analysis.

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "repo_id": "owner_repo_1234567890",
  "owner": "owner",
  "repo_name": "repo",
  "included_files": [
    {
      "path": "src/main.py",
      "size": 1024,
      "extension": "py"
    }
  ],
  "skipped_files": ["node_modules/", ".git/"],
  "total_files": 45,
  "total_chars": 125000,
  "warnings": []
}
```

**Error Responses:**
- `400`: Invalid repository URL or private repository
- `429`: Rate limit exceeded
- `500`: Server error

---

### Repository Documentation Generation

#### `POST /api/repo/generate`

Generate documentation from a GitHub repository using the RAG pipeline.

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "repo_id": "owner_repo_1234567890",
  "title": "Repository Documentation"
}
```

**Response:**
```json
{
  "success": true,
  "output": "# Repository Documentation\n...",
  "docText": "# Repository Documentation\n...",
  "pdfFilename": "repo-doc-owner_repo_1234567890.pdf",
  "pdfPath": "/uploads/repo-doc-owner_repo_1234567890.pdf",
  "pdfUrl": "http://localhost:5001/uploads/repo-doc-owner_repo_1234567890.pdf",
  "chapters": [
    {
      "title": "Overview",
      "content": "..."
    }
  ],
  "repo_info": {
    "owner": "owner",
    "repo_name": "repo",
    "file_count": 45
  },
  "duration_seconds": 125.5
}
```

**Status Updates:**
The generation process reports progress via the Node.js backend status API. Status updates include:
- `pending`: Initial state
- `scanning`: Analyzing repository structure
- `indexing`: Building RAG index
- `generating`: Generating documentation chapters
- `completed`: Finished successfully
- `error`: Generation failed

**Error Responses:**
- `400`: Invalid request
- `403`: Usage limit exceeded
- `500`: Generation error

---

### Bot Management

#### `GET /api/bots`

List all bots for the authenticated user.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>` (optional, set by Node backend)

**Response:**
```json
{
  "bots": [
    {
      "id": "bot_id_123",
      "name": "Customer Support Bot",
      "description": "Answers customer questions",
      "status": "active",
      "document_count": 5,
      "query_count": 150,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/bots`

Create a new bot.

**Request:**
```json
{
  "name": "My Bot",
  "description": "Bot description",
  "user_id": "user_id_123"
}
```

**Response:**
```json
{
  "id": "bot_id_123",
  "name": "My Bot",
  "description": "Bot description",
  "status": "active",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

#### `GET /api/bots/<bot_id>`

Get bot details.

**Response:**
```json
{
  "id": "bot_id_123",
  "name": "My Bot",
  "description": "Bot description",
  "status": "active",
  "document_count": 5,
  "query_count": 150,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

#### `PUT /api/bots/<bot_id>`

Update bot.

**Request:**
```json
{
  "name": "Updated Bot Name",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": "bot_id_123",
  "name": "Updated Bot Name",
  "description": "Updated description",
  "status": "active"
}
```

---

#### `DELETE /api/bots/<bot_id>`

Delete a bot.

**Response:**
```json
{
  "success": true,
  "message": "Bot deleted successfully"
}
```

---

### Bot Chat

#### `POST /api/bots/<bot_id>/chat`

Chat with a bot.

**Request:**
```json
{
  "message": "What is this project about?",
  "user_id": "user_id_123"
}
```

**Response:**
```json
{
  "response": "This project is about...",
  "bot_id": "bot_id_123",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

### Serve Uploaded Files

#### `GET /uploads/<filename>`

Serve uploaded files (PDFs, etc.).

**Response:**
- File content with appropriate Content-Type header

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message here"
}
```

Optional trace information (when `DEBUG_TRACE=true`):
```json
{
  "error": "Error message here",
  "trace": "Traceback..."
}
```

## Rate Limiting

- File uploads: 5 files max per request
- Repository files: 100 files max per repository
- Content size: 200KB max per file, 200KB total

## File Types Supported

**Code Files:**
- `py`, `js`, `jsx`, `ts`, `tsx`, `java`, `kt`, `dart`, `go`, `rs`, `cpp`, `c`, `h`, `cs`

**Text Files:**
- `html`, `css`, `md`, `txt`, `json`, `yaml`, `yml`

**Documents:**
- `pdf`, `doc`, `docx`, `xml`

**Archives:**
- `zip` (extracted and processed)

---

**Next:** [Node.js API Documentation](./09-api-nodejs.md)


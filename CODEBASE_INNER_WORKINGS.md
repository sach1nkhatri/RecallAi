# Recall AI - Complete Inner Workings Analysis

**Generated:** January 2025  
**Project:** Recall AI - RAG-Powered SaaS Platform  
**Architecture:** Full-Stack Multi-Backend Application

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Frontend Architecture (React)](#frontend-architecture-react)
3. [Python Backend (Flask) - RAG Engine](#python-backend-flask---rag-engine)
4. [Node.js Backend (Express) - Auth & Database](#nodejs-backend-express---auth--database)
5. [Data Flow & Workflows](#data-flow--workflows)
6. [Key Components Deep Dive](#key-components-deep-dive)
7. [Configuration & Environment](#configuration--environment)
8. [API Endpoints Reference](#api-endpoints-reference)

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Port 3000)               │
│  - Feature-based architecture                               │
│  - Context API for state management                         │
│  - React Router for navigation                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐  ┌─────────▼──────────┐
│ Python Backend │  │  Node.js Backend   │
│  (Port 5001)   │  │   (Port 5002)      │
│                │  │                    │
│ - RAG Engine   │  │ - Authentication   │
│ - Document Gen │  │ - User Management  │
│ - Bot Service  │  │ - MongoDB Storage  │
│ - FAISS Index  │  │ - Status Tracking  │
└───────┬────────┘  └─────────┬──────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   MongoDB Database  │
        │   - Users           │
        │   - Bots            │
        │   - Status          │
        └─────────────────────┘
```

### Technology Stack

**Frontend:**
- React 19.1.1
- React Router 6.30.1
- TailwindCSS
- Context API

**Python Backend:**
- Flask
- FAISS (CPU/GPU)
- PyPDF2
- fpdf2
- LM Studio Client
- MongoDB (pymongo)

**Node.js Backend:**
- Express 4.18.2
- Mongoose 7.5.0
- JWT (jsonwebtoken)
- bcryptjs
- Helmet, CORS, Rate Limiting

---

## Frontend Architecture (React)

### Entry Point

**`src/app/App.jsx`**
- Wraps application with `BrowserRouter` and `AuthProvider`
- Renders `AppRoutes` component

**`src/app/routes.jsx`**
- Defines all application routes
- Implements `ProtectedRoute` and `AdminProtectedRoute` middleware
- Route structure:
  - Public: `/`, `/login`, `/signup`, `/forgot-password`, `/pricing`
  - Protected: `/dashboard/*`, `/checkout`
  - Admin: `/admin`, `/admin/dashboard`

### Core Context

**`src/core/context/AuthContext.jsx`**
- Manages authentication state using `useReducer`
- Persists auth state in `localStorage`
- Key functions:
  - `login(email, password)` - Authenticates user via Node.js backend
  - `signup(name, email, password)` - Registers new user
  - `logout()` - Clears auth state
  - `verifyToken()` - Validates JWT on mount
- Token stored in both `localStorage.getItem('token')` and `localStorage.getItem('auth')`
- Auto-verifies token on component mount with timeout protection

### Feature Modules

#### 1. Code-to-Documentation (`src/features/code_to_doc/`)

**Main Hook: `useCode2Doc.js`**
- Manages file upload, generation, and repository processing
- Key state:
  - `fileInfo`, `output`, `pdfLink`, `isUploading`, `isGenerating`
  - `lastUploadMeta` - Stores upload metadata (fileCount, contentType, rawContent, isZip, repoFiles)
  - `apiHealth` - Monitors Python backend health
  - `repoInfo` - GitHub repository information

**Key Functions:**
- `handleUpload(files)` - Uploads files to Python backend `/api/upload`
  - Supports regular files and ZIP archives
  - ZIP files are extracted and converted to repo format
- `handleGenerate()` - Generates documentation from uploaded files
  - Checks usage limits before generation
  - Handles both regular files and ZIP archives
  - For ZIP: Uses RAG pipeline like GitHub repos
  - For regular files: Direct LLM generation
- `handleRepoIngest(repoUrl)` - Ingests GitHub repository
  - Calls `/api/repo/ingest` to scan repository
  - Returns repo_id, file count, warnings
- `handleRepoGenerate(repoUrl, repoId, repoFiles)` - Generates from repository
  - Uses `/api/repo/generate` for GitHub repos
  - Uses `/api/generate` with `repo_files` for ZIP uploads
  - Implements 30-minute timeout for large repositories

**Status Tracking: `useGenerationStatus.js`**
- Polls Node.js backend `/api/generation-status` for real-time updates
- Status types: `pending`, `ingesting`, `scanning`, `indexing`, `generating`, `merging`, `completed`, `failed`
- Updates progress percentage and current step
- Stores completed markdown and PDF info

**Main Component: `codetodoc.jsx`**
- Dual-mode interface: File Upload vs GitHub Repository
- Shows generation status in real-time
- Displays output panel with markdown preview
- History modal for viewing past generations

#### 2. Bot Management (`src/features/bot_setup/`)

**Hook: `useBots.js`**
- Fetches bots from Node.js backend
- Creates, updates, deletes bots
- Coordinates with Python backend for document upload and vectorization

**Components:**
- `BotListCard` - Lists all user bots
- `BotConfigCard` - Bot configuration (name, description, system prompt, temperature, topK)
- `DocumentUploadCard` - Upload documents for bot training
- `BotPreviewCard` - Preview bot and chat interface

#### 3. Authentication (`src/features/auth/`)

**Components:**
- `LoginForm.jsx` - Email/password login
- `SignupForm.jsx` - User registration
- `ForgotPasswordForm.jsx` - Password reset flow

**Flow:**
1. User submits credentials
2. Frontend calls Node.js backend `/api/auth/login` or `/api/auth/register`
3. Backend returns JWT token and user info
4. Token stored in localStorage
5. AuthContext updates state
6. Protected routes become accessible

#### 4. Admin Dashboard (`src/features/admin_dashboard/`)

**Components:**
- `UserManagement` - CRUD operations for users
- `PaymentManagement` - View payment history
- `ReportManagement` - View user reports
- `HelpFAQManagement` - Manage help articles and FAQs

**Access Control:**
- `AdminProtectedRoute` middleware checks admin authentication
- Admin login via `/api/admin/login`

---

## Python Backend (Flask) - RAG Engine

### Application Entry

**`backend/app.py`**
- Loads environment variables from `.env` files
- Configures logging
- Creates Flask app via `create_app()`
- Runs on port 5001 (configurable)

**`backend/src/infrastructure/api/routes.py`**
- Main Flask application factory
- Initializes services:
  - `LMStudioClient` - LLM and embedding client
  - `FPDFGenerator` - PDF generation
  - `DocumentService` - Document generation logic
  - `FileService` - File upload handling
  - `ZipService` - ZIP extraction
  - `StatusReporter` - Reports status to Node.js backend
  - `UserService` - User usage tracking

### Core Services

#### 1. RAG Engine (`backend/src/infrastructure/external/rag/rag_engine.py`)

**Class: `RAGEngine`**

**Key Methods:**

**`vectorize_file(file_path, bot_id, emit, chunk_size, overlap, existing_index_path)`**
- Extracts text from file using `Extractor`
- Chunks text using `Chunker` (default: 500 words, 100 overlap)
- Generates embeddings using `LMStudioEmbedder`
- Builds/updates FAISS index using `Vectorstore`
- Saves index and metadata to disk
- Emits progress updates via callback

**`query(index_path, question, system_prompt, temperature, top_p, top_k)`**
- Loads FAISS index and metadata
- Embeds user question
- Searches for similar chunks (top_k=5, similarity_threshold=0.6)
- Filters results by similarity (>= 0.5)
- Handles large context with multipart processing (if > 5000 tokens)
- Streams response from LM Studio
- Returns: `(prompt, selected_chunks, stream_generator)`

**Multipart Processing:**
- If context exceeds 5000 tokens, splits into batches
- Processes each batch separately
- Synthesizes partial responses into final answer
- Uses non-streaming for batches, streaming for final synthesis

#### 2. RAG Components

**Extractor (`extractor.py`)**
- Extracts text from PDF (PyPDF2) and text files
- Supports: `.pdf`, `.txt`, `.md`, `.rtf`, `.csv`, `.json`
- Handles encoding errors gracefully

**Chunker (`chunker.py`)**
- Splits text into semantic chunks using sentence boundaries
- Preserves semantic meaning better than word-based chunking
- Default: 500 words per chunk, 100 words overlap
- Falls back to word-based chunking if no sentence boundaries

**Embedder (`embedder.py`)**
- `LMStudioEmbedder` class
- Auto-detects embedding model from LM Studio
- Uses `/v1/embeddings` endpoint
- Implements retry logic with exponential backoff
- Handles connection errors and timeouts

**Vectorstore (`vectorstore.py`)**
- FAISS index management
- Auto-detects GPU/CPU platform
- Functions:
  - `build_faiss_index(embeddings)` - Creates index
  - `save_index(index, path)` - Saves to disk
  - `load_index(path)` - Loads from disk
  - `save_metadata(path, metadatas)` - Saves chunk metadata
  - `load_metadata(path)` - Loads metadata
  - `search(index, query_vector, top_k, similarity_threshold)` - Vector search

#### 3. Document Service (`document_service.py`)

**Class: `DocumentService`**

**`generate_document(generation: DocumentGeneration)`**
- Validates request
- Pre-processes content (truncates if > 1.5x limit)
- Calls LLM client to generate markdown documentation
- Generates PDF using `PDFGenerator`
- Returns `GeneratedDocument` with markdown and PDF paths

**Content Processing:**
- Preserves structure when truncating (70% start + 30% end)
- Validates generated content length (min 50 chars)
- Handles PDF generation failures gracefully

#### 4. Repository Services

**RepoOrchestratorService (`repo_orchestrator_service.py`)**
- Orchestrates complete repository-to-documentation pipeline
- Steps:
  1. **Ingest** - Download repository files from GitHub
  2. **Scan** - Analyze repository structure, generate chapter outline
  3. **Index** - Build RAG index from repository files
  4. **Generate** - Generate documentation chapter by chapter
  5. **PDF** - Generate PDF from markdown

**`generate_documentation(repo_id, repo_url, title)`**
- Full pipeline with progress reporting
- Reports status via callback to Node.js backend
- Saves checkpoints for resume capability
- Handles errors and reports to status system

**`generate_documentation_from_files(repo_id, repo_files, repo_name, owner, title)`**
- Skips ingestion step (for ZIP uploads)
- Directly processes provided files
- Same pipeline: scan → index → generate → PDF

**GitHubService (`github_service.py`)**
- Ingests GitHub repositories
- Downloads file contents via GitHub API
- Filters files by extension and size
- Returns `RepoIngestionResult` with file list

**RepoScanService (`repo_scan_service.py`)**
- Analyzes repository structure
- Generates chapter outline using LLM
- Creates retrieval queries for each chapter
- Returns list of `Chapter` objects

**RepoDocService (`repo_doc_service.py`)**
- Generates documentation chapter by chapter
- Uses RAG to retrieve relevant context for each chapter
- Combines chapters into final markdown
- Progress callback for each chapter

**RAGIndexService (`rag_index_service.py`)**
- Builds RAG index from repository files
- Processes files in batches
- Uses `RAGEngine` for vectorization
- Saves index with metadata

#### 5. Bot Service (`bot_service.py`)

**Class: `BotService`**

**Methods:**
- `list_bots(user_id)` - List all bots for user
- `get_bot(bot_id)` - Get bot by ID
- `create_bot(bot_data, user_id)` - Create new bot
- `update_bot(bot_id, update_data)` - Update bot config
- `delete_bot(bot_id)` - Delete bot and RAG index
- `update_document_count(bot_id, count)` - Update document count

**Bot Model:**
- Stored in MongoDB via `BotModel`
- Fields: `id`, `name`, `description`, `systemPrompt`, `temperature`, `topK`, `documentCount`, `userId`, `indexPath`

### API Routes

**Main Routes (`routes.py`):**
- `GET /api/health` - Health check with system info
- `POST /api/upload` - File upload (supports ZIP)
- `POST /api/generate` - Generate documentation

**Bot Routes (`bot_routes.py`):**
- `GET /api/bots` - List bots
- `POST /api/bots` - Create bot
- `GET /api/bots/<bot_id>` - Get bot
- `PUT /api/bots/<bot_id>` - Update bot
- `DELETE /api/bots/<bot_id>` - Delete bot
- `POST /api/bots/<bot_id>/documents` - Upload documents for bot
- `GET /api/bots/<bot_id>/documents` - List bot documents
- `POST /api/bots/<bot_id>/chat` - Chat with bot (streaming)

**Repo Routes (`repo_routes.py`):**
- `POST /api/repo/ingest` - Ingest GitHub repository
- `POST /api/repo/generate` - Generate documentation from repository

### Status Reporting

**StatusReporter (`status_reporter.py`)**
- Reports progress to Node.js backend
- Methods:
  - `report_progress()` - Updates generation status
  - `report_completion()` - Marks generation as completed
  - `report_error()` - Reports errors

**UserService (`user_service.py`)**
- Checks usage limits before generation
- Increments usage after successful generation
- Communicates with Node.js backend

---

## Node.js Backend (Express) - Auth & Database

### Application Entry

**`node_backend/server.js`**
- Configures Express app
- Sets up middleware: Helmet, CORS, Rate Limiting
- Connects to MongoDB
- Registers routes
- Runs on port 5002

### Models

**User Model (`models/User.js`)**
- Schema:
  - `name`, `email`, `password` (hashed with bcrypt)
  - `plan` - `free`, `pro`, `enterprise`
  - `usage` - Tracks usage limits:
    - `bots.current/limit`
    - `chats.today/limit` (resets daily)
    - `codeToDoc.used/limit`
    - `tokens.used/limit`
  - `isActive`, `lastLogin`, `createdAt`, `updatedAt`
- Methods:
  - `matchPassword(enteredPassword)` - Compares password
  - `resetDailyUsage()` - Resets daily chat usage

**Plan Limits:**
- Free: 1 bot, 10 chats/day, 2 codeToDoc, 5000 tokens
- Pro: 10 bots, 100 chats/day, 50 codeToDoc, 50000 tokens
- Enterprise: Unlimited

**GenerationStatus Model (`models/GenerationStatus.js`)**
- Tracks generation progress
- Fields: `type`, `status`, `progress`, `currentStep`, `markdown`, `pdfUrl`, `error`, `userId`, `createdAt`, `updatedAt`, `completedAt`

**Other Models:**
- `Bot` - Bot coordination (links to Python backend)
- `Payment` - Payment records
- `Report` - User reports
- `Settings` - User settings
- `HelpFAQ` - Help articles
- `Admin` - Admin accounts

### Controllers

**AuthController (`controllers/authController.js`)**
- `register(name, email, password)` - Creates user, returns JWT
- `login(email, password)` - Authenticates, returns JWT
- `getMe()` - Returns current user (protected)
- `updateProfile(name, email)` - Updates user profile
- `changePassword(currentPassword, newPassword)` - Changes password

**GenerationStatusController (`controllers/generationStatusController.js`)**
- `getStatus()` - Gets current generation status for user
- `updateStatus()` - Updates generation status (called by Python backend)
- `createStatus()` - Creates new status entry

**BotController (`controllers/botController.js`)**
- Coordinates bot creation with Python backend
- Fetches bots from Python backend
- Manages bot metadata in MongoDB

### Middleware

**Auth Middleware (`middleware/auth.js`)**
- Verifies JWT token from `Authorization: Bearer <token>` header
- Attaches user to `req.user`
- Returns 401 if invalid

**AdminAuth Middleware (`middleware/adminAuth.js`)**
- Verifies admin JWT token
- Checks admin role
- Returns 403 if not admin

### Routes

**Auth Routes (`routes/authRoutes.js`):**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)

**Generation Status Routes (`routes/generationStatusRoutes.js`):**
- `GET /api/generation-status` - Get status (protected)
- `POST /api/generation-status` - Update status (called by Python backend)

**Bot Routes (`routes/botRoutes.js`):**
- `GET /api/bots` - List bots (protected)
- `POST /api/bots` - Create bot (protected)

**Other Routes:**
- User routes, Admin routes, Payment routes, Report routes, Settings routes, HelpFAQ routes

---

## Data Flow & Workflows

### 1. Code-to-Documentation Workflow

**File Upload Flow:**
```
User uploads files
  ↓
Frontend: useCode2Doc.handleUpload()
  ↓
POST /api/upload (Python backend)
  ↓
FileService.save_uploaded_files()
  ↓
Extract content from files
  ↓
Return: {filename, content, content_type, file_count}
  ↓
Frontend stores in lastUploadMeta
```

**Regular File Generation Flow:**
```
User clicks Generate
  ↓
Frontend: useCode2Doc.handleGenerate()
  ↓
Check usage limits (Node.js backend)
  ↓
POST /api/generate (Python backend)
  ↓
DocumentService.generate_document()
  ↓
LMStudioClient.generate_documentation()
  ↓
FPDFGenerator.generate_from_markdown()
  ↓
StatusReporter.report_completion()
  ↓
Return: {output, pdfUrl}
  ↓
Frontend displays markdown and PDF link
```

**ZIP/Repository Generation Flow:**
```
User uploads ZIP or GitHub repo
  ↓
If ZIP: Extract and convert to repo_files format
If GitHub: POST /api/repo/ingest
  ↓
POST /api/repo/generate or /api/generate (with repo_files)
  ↓
RepoOrchestratorService.generate_documentation()
  ↓
Step 1: Ingest/Download files
  ↓
Step 2: RepoScanService.scan_repository()
  - Generates chapter outline using LLM
  ↓
Step 3: RAGIndexService.build_repo_index()
  - Extracts text from files
  - Chunks text
  - Generates embeddings
  - Builds FAISS index
  ↓
Step 4: RepoDocService.generate_documentation()
  - For each chapter:
    - Query RAG index for relevant chunks
    - Generate chapter content using LLM
  - Combine chapters into markdown
  ↓
Step 5: Generate PDF
  ↓
StatusReporter.report_completion()
  ↓
Return: {output, pdfUrl, chapters}
  ↓
Frontend displays documentation
```

### 2. Bot Management Workflow

**Bot Creation:**
```
User creates bot (Frontend)
  ↓
POST /api/bots (Node.js backend)
  ↓
POST /api/bots (Python backend)
  ↓
BotService.create_bot()
  ↓
BotModel.create() (MongoDB)
  ↓
Return bot with ID
```

**Document Upload for Bot:**
```
User uploads documents
  ↓
POST /api/bots/<bot_id>/documents (Python backend)
  ↓
Save files to bot_upload_dir
  ↓
RAGEngine.vectorize_file() for each file
  ↓
Build/update FAISS index
  ↓
Save index and metadata
  ↓
Update bot document count
  ↓
Return: {documents: [{filename, status}]}
```

**Bot Chat:**
```
User sends message
  ↓
POST /api/bots/<bot_id>/chat (Python backend)
  ↓
Load bot config and RAG index
  ↓
RAGEngine.query()
  - Embed question
  - Search FAISS index
  - Retrieve top_k chunks
  - Build prompt with context
  - Stream response from LM Studio
  ↓
Return: Streaming SSE response
  ↓
Frontend displays streaming text
```

### 3. Authentication Flow

**Login:**
```
User enters email/password
  ↓
Frontend: AuthContext.login()
  ↓
POST /api/auth/login (Node.js backend)
  ↓
AuthController.login()
  - Find user by email
  - Compare password (bcrypt)
  - Check isActive
  - Reset daily usage if needed
  - Generate JWT token
  ↓
Return: {token, user}
  ↓
Frontend stores token in localStorage
  ↓
AuthContext updates state
  ↓
Protected routes become accessible
```

**Token Verification:**
```
On app mount
  ↓
AuthContext.verifyToken()
  ↓
GET /api/auth/me (Node.js backend)
  ↓
Auth middleware verifies JWT
  ↓
AuthController.getMe()
  ↓
Return: {user}
  ↓
AuthContext restores auth state
```

---

## Key Components Deep Dive

### 1. RAG Pipeline Architecture

**Components:**
1. **Extractor** - Text extraction from files
2. **Chunker** - Semantic text chunking
3. **Embedder** - LM Studio embedding generation
4. **Vectorstore** - FAISS index management
5. **RAGEngine** - Orchestrates retrieval and generation

**Index Storage:**
- Location: `backend/data/rag_indices/`
- Format: `<bot_id>_<timestamp>.index` and `.index.meta.json`
- Metadata includes: `chunk_id`, `text`, `filename`, `similarity`, `distance`

**Query Process:**
1. User question → Embed question
2. Search FAISS index → Get top_k similar chunks
3. Filter by similarity threshold (>= 0.5)
4. Build prompt: `system_prompt + context + question`
5. Stream response from LM Studio
6. Return streaming text to frontend

### 2. Status Tracking System

**Architecture:**
- Python backend reports status to Node.js backend
- Node.js backend stores status in MongoDB
- Frontend polls Node.js backend for updates

**Status Types:**
- `pending` - Initial state
- `ingesting` - Downloading repository files
- `scanning` - Analyzing repository structure
- `indexing` - Building RAG index
- `generating` - Generating documentation
- `merging` - Combining chapters, generating PDF
- `completed` - Generation finished
- `failed` - Error occurred

**Progress Tracking:**
- Progress: 0-100%
- Current step: Human-readable status message
- Total steps: Total number of steps
- Completed steps: Steps completed so far

### 3. Usage Tracking

**Limits by Plan:**
- Free: 1 bot, 10 chats/day, 2 codeToDoc, 5000 tokens
- Pro: 10 bots, 100 chats/day, 50 codeToDoc, 50000 tokens
- Enterprise: Unlimited (-1)

**Tracking:**
- Checked before generation (Python backend calls Node.js backend)
- Incremented after successful generation
- Daily chat usage resets at midnight
- Stored in User model `usage` field

### 4. File Processing

**Supported Formats:**
- Code: `.py`, `.js`, `.ts`, `.java`, `.cpp`, `.c`, `.go`, `.rs`, `.php`, `.rb`, etc.
- Text: `.txt`, `.md`, `.rtf`
- Data: `.json`, `.csv`, `.xml`
- Documents: `.pdf`

**ZIP Processing:**
- Extracts ZIP archive
- Filters files by extension and size
- Converts to `repo_files` format: `[{path, content}]`
- Processes through RAG pipeline

**GitHub Processing:**
- Uses GitHub API to list repository files
- Filters by extension and size
- Downloads file contents
- Processes through RAG pipeline

---

## Configuration & Environment

### Python Backend Environment Variables

```bash
# LM Studio Configuration
LM_STUDIO_BASE_URL=http://192.168.1.83:1234/v1
LM_MODEL_NAME=qwen3-14b
LM_STUDIO_EMBED_MODEL=qwen-2.5-1.5b-embedding-entropy-rl-1
LM_STUDIO_TIMEOUT=120

# File Upload Configuration
MAX_FILES=5
MAX_CONTENT_PREVIEW=200000
UPLOAD_DIR=uploads

# GitHub Configuration
GITHUB_TOKEN=optional_token
GITHUB_MAX_REPO_FILES=100
GITHUB_MAX_TOTAL_CHARS=200000
GITHUB_MAX_SINGLE_FILE_SIZE=200000

# RAG Configuration
RAG_CHUNK_SIZE=700
RAG_CHUNK_OVERLAP=80
RAG_TOP_K=5
RAG_INDEX_DIR=data/rag_indices

# API Configuration
PORT=5001
HOST=0.0.0.0
DEBUG=false

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/recall_ai
MONGODB_DB_NAME=recall_ai

# Node Backend Configuration
NODE_BACKEND_URL=http://localhost:5002
```

### Node.js Backend Environment Variables

```bash
# Server Configuration
PORT=5002
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/recall_ai

# JWT Configuration
JWT_SECRET=your_secret_key_here

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables

```bash
REACT_APP_API_BASE_URL=http://localhost:5001
```

---

## API Endpoints Reference

### Python Backend (Port 5001)

**Health:**
- `GET /api/health` - Health check with system info

**File Operations:**
- `POST /api/upload` - Upload files (supports ZIP)
- `GET /uploads/<filename>` - Serve uploaded files

**Document Generation:**
- `POST /api/generate` - Generate documentation from files

**Bot Management:**
- `GET /api/bots` - List bots
- `POST /api/bots` - Create bot
- `GET /api/bots/<bot_id>` - Get bot
- `PUT /api/bots/<bot_id>` - Update bot
- `DELETE /api/bots/<bot_id>` - Delete bot
- `POST /api/bots/<bot_id>/documents` - Upload documents
- `GET /api/bots/<bot_id>/documents` - List documents
- `POST /api/bots/<bot_id>/chat` - Chat with bot (streaming)

**Repository Processing:**
- `POST /api/repo/ingest` - Ingest GitHub repository
- `POST /api/repo/generate` - Generate documentation from repository

**User Operations:**
- `GET /api/users/me` - Get current user info
- `GET /api/users/usage` - Get usage statistics

### Node.js Backend (Port 5002)

**Health:**
- `GET /api/health` - Health check

**Authentication:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)

**User Management:**
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/usage` - Get usage statistics

**Bot Management:**
- `GET /api/bots` - List user's bots
- `POST /api/bots` - Create bot

**Generation Status:**
- `GET /api/generation-status` - Get generation status
- `POST /api/generation-status` - Update generation status

**Settings:**
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

**Payments:**
- `POST /api/payments` - Create payment
- `GET /api/payments` - Get payment history
- `POST /api/payments/upload` - Upload payment receipt

**Reports:**
- `POST /api/reports` - Create report
- `GET /api/reports` - Get user reports

**Admin:**
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/payments` - List all payments
- `GET /api/admin/reports` - List all reports
- `POST /api/admin/help-faq` - Create help/FAQ
- `PUT /api/admin/help-faq/:id` - Update help/FAQ
- `DELETE /api/admin/help-faq/:id` - Delete help/FAQ

**Help/FAQ:**
- `GET /api/help-faq` - Get help/FAQ items

---

## Summary

Recall AI is a sophisticated RAG-powered SaaS platform with:

1. **Modern React Frontend** - Feature-based architecture with Context API
2. **Python Flask Backend** - RAG engine with FAISS, LM Studio integration
3. **Node.js Express Backend** - Authentication, MongoDB, status tracking
4. **Comprehensive RAG Pipeline** - Extract → Chunk → Embed → Index → Query → Generate
5. **Multi-format Support** - Files, ZIP archives, GitHub repositories
6. **Real-time Status Tracking** - Progress updates via polling
7. **Usage Management** - Plan-based limits and tracking
8. **Bot System** - Custom AI chatbots with RAG capabilities

The system is production-ready with proper error handling, logging, security measures, and scalable architecture.

---

**Last Updated:** January 2025  
**Document Version:** 1.0


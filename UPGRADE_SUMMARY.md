# Code-to-Doc Upgrade Summary

## Overview
Upgraded the Code-to-Doc feature to remove direct text mode and add GitHub repository ingestion with RAG-based documentation generation.

## Changes Made

### Backend Changes

#### 1. Configuration (`backend/src/config/settings.py`)
- Added GitHub configuration:
  - `GITHUB_TOKEN`: Optional GitHub token for rate limits
  - `GITHUB_MAX_REPO_FILES`: Max files to process (default: 60)
  - `GITHUB_MAX_TOTAL_CHARS`: Max total characters (default: 200,000)
  - `GITHUB_MAX_SINGLE_FILE_SIZE`: Max single file size (default: 200KB)
  - `GITHUB_TIMEOUT`: Request timeout (default: 60s)
- Added RAG configuration:
  - `RAG_CHUNK_SIZE`: Chunk size for vectorization (default: 700)
  - `RAG_CHUNK_OVERLAP`: Overlap between chunks (default: 80)
  - `RAG_TOP_K`: Number of chunks to retrieve (default: 5)
  - `RAG_INDEX_DIR`: Directory for RAG indices

#### 2. New Services

**GitHub Service** (`backend/src/application/services/github_service.py`)
- Parses GitHub repository URLs (supports multiple formats)
- Fetches repository tree recursively
- Filters files by extension and size limits
- Ignores common directories (node_modules, .git, dist, build, .next, venv, etc.)
- Downloads file contents safely
- Returns structured ingestion results

**Repo Scan Service** (`backend/src/application/services/repo_scan_service.py`)
- Scans repository structure
- Generates chapter outline using LLM
- Creates retrieval queries for each chapter
- Parses LLM output into structured Chapter objects

**RAG Index Service** (`backend/src/application/services/rag_index_service.py`)
- Chunks repository files
- Generates embeddings using LM Studio
- Builds FAISS vector index
- Queries index with multiple queries
- Returns unique relevant chunks

**Repo Doc Service** (`backend/src/application/services/repo_doc_service.py`)
- Generates individual chapters using RAG
- Retrieves relevant chunks for each chapter
- Combines chapters into complete documentation
- Maintains proper markdown structure

**Repo Orchestrator Service** (`backend/src/application/services/repo_orchestrator_service.py`)
- Orchestrates complete pipeline:
  1. Ingest repository
  2. Download file contents
  3. Scan and generate outline
  4. Build RAG index
  5. Generate documentation chapter-by-chapter
  6. Generate PDF

#### 3. API Endpoints (`backend/src/infrastructure/api/repo_routes.py`)

**POST /api/repo/ingest**
- Ingests a GitHub repository
- Returns: `repo_id`, included/skipped files, counts, warnings
- Validates repository URL and accessibility

**POST /api/repo/generate**
- Generates documentation from repository
- Returns: markdown, PDF URL, chapters, repo info, duration
- Handles full RAG pipeline

#### 4. Updated Routes (`backend/src/infrastructure/api/routes.py`)
- Registered repo routes
- Updated `/api/generate` to enforce file upload mode only
- Added validation to reject direct text mode

### Frontend Changes

#### 1. New Component (`src/features/code_to_doc/components/GitHubRepoCard.jsx`)
- GitHub repository input field
- Ingest and Generate buttons
- Repository info display
- Warnings display
- Step-by-step instructions

#### 2. Updated Main Page (`src/features/code_to_doc/page/codetodoc.jsx`)
- Removed "Direct Text" mode tab
- Added "GitHub Repository" mode tab
- Updated mode switching logic
- Removed EditorCard usage

#### 3. Updated Hook (`src/features/code_to_doc/hooks/useCode2Doc.js`)
- Removed direct text mode state (title, contentType setters)
- Added `isIngesting` state
- Added `repoInfo` state
- Added `handleRepoIngest` function
- Added `handleRepoGenerate` function
- Updated `handleGenerate` to enforce file upload mode only

#### 4. Styling (`src/features/code_to_doc/css/GitHubRepoCard.css`)
- New styles for GitHub repo card
- Button styles (primary/secondary)
- Info display styles
- Warning display styles

## Architecture

### Clean Architecture Maintained
- **Domain Layer**: Models and exceptions (unchanged)
- **Application Layer**: 
  - New services: `github_service`, `repo_scan_service`, `rag_index_service`, `repo_doc_service`, `repo_orchestrator_service`
- **Infrastructure Layer**: 
  - New routes: `repo_routes.py`
  - Reused: `lm_studio_client`, `pdf_generator_impl`, RAG components

### RAG Pipeline Flow
1. **Repository Ingestion**: Parse URL → Fetch tree → Filter files → Download contents
2. **Repository Scanning**: Analyze structure → Generate outline → Create retrieval queries
3. **RAG Indexing**: Chunk files → Generate embeddings → Build FAISS index
4. **Chapter Generation**: For each chapter → Query index → Retrieve chunks → Generate markdown
5. **Document Assembly**: Combine chapters → Generate PDF

## Configuration

### Environment Variables

Add to `backend/.env`:
```env
# GitHub Configuration (Optional)
GITHUB_TOKEN=your_github_token_here  # Optional, for higher rate limits

# GitHub Limits
GITHUB_MAX_REPO_FILES=60
GITHUB_MAX_TOTAL_CHARS=200000
GITHUB_MAX_SINGLE_FILE_SIZE=200000
GITHUB_TIMEOUT=60

# RAG Configuration
RAG_CHUNK_SIZE=700
RAG_CHUNK_OVERLAP=80
RAG_TOP_K=5
RAG_INDEX_DIR=data/rag_indices
```

## Validation & Limits

### File Upload Mode
- Max 5 files (enforced in backend and frontend)
- Allowed extensions: code files, text files, documents
- Direct text mode: **REMOVED**

### GitHub Repository Mode
- Public repositories only (or with GITHUB_TOKEN)
- Max 60 files per repository
- Max 200,000 total characters
- Max 200KB per file
- Automatic filtering of:
  - node_modules, .git, dist, build, .next, venv, __pycache__
  - Unsupported file extensions

## Error Handling

### User-Friendly Messages
- Repository not found or private
- Rate limit exceeded (suggests GITHUB_TOKEN)
- Timeout errors with actionable suggestions
- File size/limit exceeded warnings
- LM Studio connection errors

### Backend Validation
- URL format validation
- Repository accessibility checks
- File count/size limits
- Content validation

## Testing Recommendations

1. **Repository Ingestion**:
   - Test with various URL formats
   - Test with large repositories (should hit limits)
   - Test with private repos (should fail gracefully)
   - Test rate limiting

2. **RAG Pipeline**:
   - Test with small repos (1-5 files)
   - Test with medium repos (20-30 files)
   - Test chunking and embedding generation
   - Test chapter generation quality

3. **File Upload Mode**:
   - Verify max 5 files enforced
   - Verify direct text mode rejected
   - Verify existing functionality still works

4. **Error Cases**:
   - Invalid URLs
   - Network timeouts
   - LM Studio unavailable
   - Empty repositories
   - Repositories with no code files

## Dependencies

### Required Python Packages
- `requests` (already in requirements.txt)
- `faiss-cpu` or `faiss-gpu` (for RAG indexing)
- `numpy` (for vector operations)

Install with:
```bash
pip install faiss-cpu numpy
```

### Frontend
- No new dependencies required
- Uses existing React components and hooks

## Migration Notes

### Breaking Changes
- **Direct text mode removed**: Users can no longer paste text directly
- **File upload mode**: Still works, but now requires file_count validation
- **API changes**: `/api/generate` now requires `file_count` parameter

### Backward Compatibility
- File upload flow remains compatible
- Existing uploads and projects still work
- PDF generation unchanged

## Future Enhancements

Potential improvements:
- Generation history for repositories
- Caching of ingested repositories
- Support for private repositories with authentication
- Progress indicators for long-running operations
- Streaming chapter generation
- Custom chapter templates
- Multi-branch support


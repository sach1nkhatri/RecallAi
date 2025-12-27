# Recall AI Backend

Clean Architecture implementation for the Recall AI backend service.

## Project Structure

```
backend/
├── app.py                      # Application entry point
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variables template
├── src/                        # Source code
│   ├── __init__.py
│   ├── config/                 # Configuration
│   │   ├── __init__.py
│   │   └── settings.py         # Application settings
│   ├── domain/                 # Domain Layer (Business Logic)
│   │   ├── __init__.py
│   │   ├── models.py           # Domain models and entities
│   │   └── exceptions.py       # Domain exceptions
│   ├── application/            # Application Layer (Use Cases)
│   │   ├── services/           # Business services
│   │   │   ├── __init__.py
│   │   │   ├── document_service.py
│   │   │   └── file_service.py
│   │   └── interfaces/         # Abstract interfaces
│   │       ├── __init__.py
│   │       ├── llm_client.py
│   │       └── pdf_generator.py
│   └── infrastructure/        # Infrastructure Layer (External)
│       ├── api/                 # API/Web layer
│       │   ├── __init__.py
│       │   └── routes.py       # Flask routes
│       └── external/           # External service implementations
│           ├── __init__.py
│           ├── lm_studio_client.py
│           ├── pdf_generator_impl.py
│           └── rag/            # RAG (Retrieval Augmented Generation) components
│               ├── __init__.py
│               ├── rag_engine.py
│               ├── chunker.py
│               ├── embedder.py
│               ├── extractor.py
│               └── vectorstore.py
└── uploads/                    # Uploaded files directory
```

## Architecture Layers

### Domain Layer (`src/domain/`)
- **Purpose**: Contains business entities and domain logic
- **Contains**: Models, value objects, domain exceptions
- **Dependencies**: None (pure Python)

### Application Layer (`src/application/`)
- **Purpose**: Contains use cases and business logic orchestration
- **Contains**: Services, interfaces (abstract definitions)
- **Dependencies**: Domain layer only

### Infrastructure Layer (`src/infrastructure/`)
- **Purpose**: Contains external concerns (API, databases, external services)
- **Contains**: 
  - API routes and handlers
  - External service implementations (LM Studio, PDF generation)
- **Dependencies**: Application and Domain layers

## Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:
```env
updated 
updated

# LM Studio Configuration
LM_STUDIO_BASE_URL=http://192.168.1.83:1234/v1
LM_MODEL_NAME=gpt-oss-20b
LM_STUDIO_TIMEOUT=90

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_CONTENT_PREVIEW=8000
MAX_FILES=5

# API Configuration
PORT=5001
HOST=0.0.0.0
DEBUG=false
```

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/upload` - Upload files
- `POST /api/generate` - Generate documentation
- `GET /uploads/<filename>` - Serve uploaded files

## Clean Architecture Principles

1. **Dependency Rule**: Dependencies point inward
   - Infrastructure → Application → Domain
   - Domain has no dependencies

2. **Separation of Concerns**: Each layer has a single responsibility
   - Domain: Business rules
   - Application: Use cases
   - Infrastructure: Technical details

3. **Dependency Inversion**: High-level modules don't depend on low-level modules
   - Application defines interfaces
   - Infrastructure implements interfaces

## RAG Functionality

The RAG (Retrieval Augmented Generation) components are located in `src/infrastructure/external/rag/`:

- **rag_engine.py**: Main RAG engine for document vectorization and querying
- **chunker.py**: Text chunking utilities
- **embedder.py**: LM Studio embedding client
- **extractor.py**: Text extraction from PDFs and text files
- **vectorstore.py**: FAISS vector store utilities

### Optional Dependencies

RAG functionality requires additional dependencies (commented in `requirements.txt`):
- `PyPDF2`: For PDF text extraction
- `faiss-cpu`: For vector similarity search
- `numpy`: For numerical operations

Install with:
```bash
pip install PyPDF2 faiss-cpu numpy
```

## Migration from Old Structure

The old files have been refactored into the new clean architecture structure:

- `config.py` → `src/config/settings.py`
- `lm_client.py` → `src/infrastructure/external/lm_studio_client.py`
- `pdf_utils.py` → `src/infrastructure/external/pdf_generator_impl.py`
- RAG files from `uploads/` → `src/infrastructure/external/rag/`

The new structure provides:

- Better testability
- Clearer separation of concerns
- Easier maintenance
- Better scalability
- Clean uploads folder (only user-uploaded files)


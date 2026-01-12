# Overview

## What is Recall AI?

Recall AI is a comprehensive RAG (Retrieval Augmented Generation) powered SaaS platform that enables users to:

- **Generate Documentation** from code repositories (GitHub or zip uploads)
- **Create AI Chatbots** trained on custom documents
- **Manage Knowledge Bases** with intelligent search and retrieval

## Key Features

### 1. Code-to-Documentation Generation
- **GitHub Integration**: Connect and analyze public repositories
- **Zip Upload**: Upload entire project folders as zip files
- **Intelligent Analysis**: Automatic code structure analysis and documentation outline generation
- **RAG-Powered**: Uses Retrieval Augmented Generation for context-aware documentation
- **PDF Export**: Generate professional PDF documentation

### 2. AI Bot Management
- **Custom Bots**: Create specialized chatbots for different use cases
- **Document Training**: Upload documents to train your bots
- **RAG Integration**: Bots use the same RAG pipeline for intelligent responses
- **Analytics**: Track bot usage and performance

### 3. RAG Pipeline
- **Vector Search**: FAISS-based similarity search (CPU/GPU support)
- **Embeddings**: LM Studio integration for text embeddings
- **Chunking**: Intelligent text chunking with overlap
- **Cross-Platform**: Works on Windows, Mac, and Linux

## Technology Stack

### Frontend
- **React 19.1.1** - Modern React with hooks
- **React Router v6** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Context API** - State management

### Backend
- **Python Flask** - REST API server
- **Node.js/Express** - Authentication and user management
- **MongoDB** - Database for users, bots, and metadata
- **LM Studio** - Local LLM inference server
- **FAISS** - Vector similarity search (CPU/GPU)

### Infrastructure
- **Clean Architecture** - Layered architecture (Domain, Application, Infrastructure)
- **JWT Authentication** - Secure token-based auth
- **CORS** - Cross-origin resource sharing
- **Error Handling** - Comprehensive error management

## System Requirements

### Minimum Requirements
- **RAM**: 8GB (16GB+ recommended)
- **Storage**: 5GB free space
- **CPU**: Multi-core processor
- **OS**: Windows 10+, macOS 10.15+, or Linux

### Recommended for Best Performance
- **RAM**: 32GB
- **GPU**: NVIDIA GPU with 12GB+ VRAM (for GPU-accelerated FAISS)
- **CPU**: Intel i7 or equivalent
- **Storage**: SSD with 10GB+ free space

## Architecture Overview

```
┌─────────────────┐
│   React Frontend │
│   (Port 3000)    │
└────────┬─────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼─────────┐  ┌────▼────────────┐
│  Node.js Backend │  │  Python Backend  │
│  (Port 5002)     │  │  (Port 5001)     │
│  - Auth          │  │  - RAG Pipeline  │
│  - User Mgmt     │  │  - Doc Gen      │
└────────┬─────────┘  └────┬────────────┘
         │                 │
         └────────┬────────┘
                  │
         ┌────────▼─────────┐
         │     MongoDB      │
         │   (Port 27017)   │
         └─────────────────┘
                  │
         ┌────────▼─────────┐
         │    LM Studio     │
         │   (Port 1234)    │
         └─────────────────┘
```

## Use Cases

1. **Software Documentation**: Generate comprehensive docs for codebases
2. **Knowledge Base Bots**: Create chatbots for internal documentation
3. **Code Analysis**: Understand large codebases quickly
4. **Onboarding**: Help new developers understand projects
5. **API Documentation**: Auto-generate API docs from code

## Getting Started

1. **Install Dependencies**: See [Installation Guide](./02-installation.md)
2. **Configure Environment**: Set up `.env` files
3. **Start Services**: Launch all backend services
4. **Run Frontend**: Start the React development server
5. **Create Account**: Sign up and start using

For detailed setup instructions, see the [Quick Start Guide](./03-quick-start.md).

## Support

- **Documentation**: This documentation site
- **Issues**: Report bugs via the in-app reporting system
- **FAQ**: See [FAQ](./21-faq.md) for common questions

---

**Next:** [Installation Guide](./02-installation.md)


# Performance Optimization Guide

## System Requirements

### Minimum Requirements
- **RAM**: 8GB (16GB recommended)
- **CPU**: Multi-core processor (4+ cores recommended)
- **Storage**: 5GB free space
- **GPU**: Optional but recommended for faster processing

### Recommended Configurations

#### Windows/Linux with NVIDIA GPU
- **RAM**: 16GB+ (32GB ideal)
- **GPU**: NVIDIA GPU with 8GB+ VRAM (RTX 3060 12GB, RTX 3070, etc.)
- **CPU**: Intel i5/i7 or AMD Ryzen 5/7
- **FAISS**: Use `faiss-gpu` for GPU acceleration

#### Mac (Intel or Apple Silicon)
- **RAM**: 16GB+ (32GB ideal)
- **CPU**: Apple Silicon (M1/M2/M3) or Intel i5/i7
- **FAISS**: Use `faiss-cpu` (GPU acceleration not available)

## Installation by Platform

### Windows (with NVIDIA GPU)
```bash
# Install GPU-accelerated FAISS
pip uninstall faiss-cpu
pip install faiss-gpu

# Verify GPU
nvidia-smi
```

### Mac (Intel or Apple Silicon)
```bash
# Install CPU-only FAISS (default)
pip install faiss-cpu

# Or if already installed, ensure CPU version
pip uninstall faiss-gpu 2>/dev/null || true
pip install faiss-cpu
```

### Linux (with NVIDIA GPU)
```bash
# Install GPU-accelerated FAISS
pip uninstall faiss-cpu
pip install faiss-gpu

# Verify GPU
nvidia-smi
```

### Linux (CPU only)
```bash
# Install CPU-only FAISS
pip install faiss-cpu
```

## LM Studio Configuration

### For RTX 3060 12GB (Your PC)
1. **Model Loading**:
   - Use 4-bit quantization: `qwen3-14b-instruct-Q4_K_M.gguf`
   - Or 8-bit quantization: `qwen3-14b-instruct-Q8_0.gguf`
   - 4-bit uses ~8GB VRAM, 8-bit uses ~12GB VRAM

2. **Settings**:
   - Enable GPU acceleration
   - Context length: 8192-16384 tokens
   - Threads: 4-6 (leave some for system)

### For Mac Laptop
1. **Model Loading**:
   - Use smaller models: `qwen3-7b` or `qwen3-1.8b`
   - Or use 4-bit quantized 14B if you have 16GB+ unified memory
   - Apple Silicon: Models use unified memory (RAM + VRAM)

2. **Settings**:
   - Enable Metal acceleration (automatic on Apple Silicon)
   - Context length: 4096-8192 tokens
   - Threads: 4-6

## Performance Optimization Tips

### 1. FAISS Indexing Speed
- **GPU (Windows/Linux)**: 5-10x faster than CPU
- **CPU (Mac)**: Still fast for <100 files
- **Large projects**: Consider processing in batches

### 2. LM Studio Model Selection
- **14B models**: Best quality, slower (5-10 min per chapter)
- **7B models**: Good quality, faster (2-5 min per chapter)
- **1.8B models**: Basic quality, very fast (1-2 min per chapter)

### 3. Chunk Size Optimization
Current defaults work well, but you can adjust:
```env
RAG_CHUNK_SIZE=700      # Larger = more context, slower
RAG_CHUNK_OVERLAP=80    # More overlap = better context
```

### 4. File Limits
- **100 files**: Good balance of quality and speed
- **50 files**: Faster processing, still comprehensive
- **200+ files**: May be slow, consider splitting project

### 5. Memory Management
- Close other applications during large processing
- Monitor memory usage (system will warn if low)
- Process smaller batches if memory constrained

## Cross-Platform Workflow

### Working on PC (Home)
1. Install `faiss-gpu` for GPU acceleration
2. Use full 14B model with 4-bit quantization
3. Process large projects (80-100 files)

### Working on Mac (Class)
1. Install `faiss-cpu` (default)
2. Use smaller model (7B) or quantized 14B
3. Process medium projects (30-50 files)

### Synchronization
- Both platforms use same codebase
- FAISS indices are platform-independent (can be shared)
- Generated PDFs work on both platforms

## Troubleshooting

### GPU Not Detected (Windows/Linux)
```bash
# Check NVIDIA drivers
nvidia-smi

# Reinstall faiss-gpu
pip uninstall faiss-gpu faiss-cpu
pip install faiss-gpu
```

### Out of Memory
- Reduce `GITHUB_MAX_REPO_FILES` to 50
- Use smaller LM Studio model
- Close other applications
- Process in smaller batches

### Slow Processing
- Check if GPU is being used (nvidia-smi on Windows/Linux)
- Verify LM Studio is using GPU acceleration
- Reduce chunk size or file count
- Use smaller model for faster generation

## Performance Benchmarks

### RTX 3060 12GB + 32GB RAM (Your PC)
- **100 files indexing**: ~2-3 minutes
- **Chapter generation**: ~5-8 minutes per chapter
- **Full documentation (10 chapters)**: ~60-90 minutes

### Mac Laptop (16GB RAM)
- **50 files indexing**: ~3-5 minutes
- **Chapter generation**: ~8-12 minutes per chapter
- **Full documentation (8 chapters)**: ~90-120 minutes

## Monitoring

The system includes automatic resource monitoring:
- Memory usage tracking
- CPU usage warnings
- GPU availability detection
- Platform-specific optimizations

Check system status via `/api/health` endpoint.


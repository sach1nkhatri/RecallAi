# Cross-Platform Installation Guide

## Quick Setup by Platform

### Windows (PC with NVIDIA GPU)

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install CPU version first (required for dependencies)
pip install faiss-cpu numpy

# Then install GPU version (replaces CPU)
pip uninstall faiss-cpu
pip install faiss-gpu

# Install other dependencies
pip install -r requirements.txt
```

**Verify GPU:**
```bash
nvidia-smi
```

### Mac (Laptop - Intel or Apple Silicon)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate

# Install CPU version (required for Mac)
pip install faiss-cpu numpy

# Install other dependencies
pip install -r requirements.txt
```

**Note:** Mac doesn't support GPU-accelerated FAISS. CPU version works well.

## Automatic Detection

The system automatically detects your platform and uses the appropriate FAISS backend:

- **Windows/Linux with NVIDIA GPU**: Uses `faiss-gpu` if available
- **Mac**: Always uses `faiss-cpu`
- **Windows/Linux without GPU**: Falls back to `faiss-cpu`

## Checking Your Setup

### Check Platform and GPU
```bash
# From backend directory
python -c "from src.infrastructure.external.platform_detector import PlatformDetector; import json; print(json.dumps(PlatformDetector.get_gpu_info(), indent=2))"
```

### Check System Resources
```bash
# Start the server and check health endpoint
python app.py

# In another terminal or browser:
curl http://localhost:5001/api/health
```

## Troubleshooting

### "faiss-gpu not found" on Windows
```bash
# Make sure CUDA toolkit is installed
# Then reinstall:
pip uninstall faiss-gpu faiss-cpu
pip install faiss-gpu
```

### "nvidia-smi not found"
- Install NVIDIA drivers
- Verify GPU is detected: `nvidia-smi`
- If no GPU, use `faiss-cpu` instead

### Mac Issues
- Mac always uses `faiss-cpu` (this is normal)
- If you get import errors, reinstall: `pip install --upgrade faiss-cpu`

## Working Across Platforms

The codebase is designed to work on both platforms:

1. **Same codebase**: Works on both Mac and Windows
2. **Auto-detection**: Automatically uses correct FAISS backend
3. **Shared indices**: FAISS indices are platform-independent
4. **Same API**: All endpoints work the same way

### Recommended Workflow

1. **On PC (Home)**: Use `faiss-gpu` for faster processing
2. **On Mac (Class)**: Use `faiss-cpu` (automatic)
3. **Sync code**: Use git to sync between machines
4. **Indices**: Can be shared between platforms (optional)

## Performance Notes

- **PC with GPU**: 5-10x faster indexing
- **Mac**: Still fast for <100 files
- **Both**: Same quality results


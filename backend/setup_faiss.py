#!/usr/bin/env python3
"""
Cross-platform FAISS setup script
Automatically installs the correct FAISS version for your platform
"""

import subprocess
import sys
import platform
from pathlib import Path

def get_platform():
    """Get platform name"""
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    elif system == "windows":
        return "windows"
    elif system == "linux":
        return "linux"
    return "unknown"

def has_cuda():
    """Check if CUDA is available"""
    if get_platform() == "macos":
        return False
    
    try:
        result = subprocess.run(
            ["nvidia-smi"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False

def install_faiss():
    """Install appropriate FAISS version"""
    platform_name = get_platform()
    cuda_available = has_cuda()
    
    print(f"Platform: {platform_name}")
    print(f"CUDA available: {cuda_available}")
    print()
    
    # Uninstall both versions first
    print("Uninstalling existing FAISS versions...")
    subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "faiss-cpu", "faiss-gpu"], 
                   capture_output=True)
    
    if platform_name == "macos":
        print("Installing faiss-cpu for Mac...")
        subprocess.run([sys.executable, "-m", "pip", "install", "faiss-cpu"], check=True)
        print("✓ Installed faiss-cpu")
    elif cuda_available:
        print("Installing faiss-gpu for Windows/Linux with CUDA...")
        subprocess.run([sys.executable, "-m", "pip", "install", "faiss-gpu"], check=True)
        print("✓ Installed faiss-gpu")
    else:
        print("Installing faiss-cpu (no CUDA GPU detected)...")
        subprocess.run([sys.executable, "-m", "pip", "install", "faiss-cpu"], check=True)
        print("✓ Installed faiss-cpu")
    
    print()
    print("FAISS setup complete!")
    print()
    print("Verify installation:")
    print("  python -c 'import faiss; print(f\"FAISS version: {faiss.__version__}\")'")

if __name__ == "__main__":
    try:
        install_faiss()
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInstallation cancelled")
        sys.exit(1)


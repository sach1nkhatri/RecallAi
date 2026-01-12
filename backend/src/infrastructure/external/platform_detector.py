"""Platform detection and GPU availability checking"""

import logging
import platform
import subprocess
import sys
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class PlatformDetector:
    """Detect platform and GPU capabilities"""
    
    @staticmethod
    def get_platform() -> str:
        """Get platform name"""
        system = platform.system().lower()
        if system == "darwin":
            return "macos"
        elif system == "windows":
            return "windows"
        elif system == "linux":
            return "linux"
        return "unknown"
    
    @staticmethod
    def has_cuda() -> bool:
        """Check if CUDA is available (NVIDIA GPU)"""
        # Skip on Mac - no CUDA support
        if PlatformDetector.get_platform() == "macos":
            return False
        
        try:
            # Windows: hide console window if possible
            kwargs = {
                "capture_output": True,
                "text": True,
                "timeout": 5
            }
            if platform.system() == "Windows":
                try:
                    kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
                except AttributeError:
                    # CREATE_NO_WINDOW not available in this Python version
                    pass
            
            result = subprocess.run(
                ["nvidia-smi"],
                **kwargs
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
            logger.debug(f"CUDA check failed: {e}")
            return False
    
    @staticmethod
    def has_metal() -> bool:
        """Check if Metal is available (Apple Silicon/AMD GPU on Mac)"""
        system = platform.system().lower()
        if system != "darwin":
            return False
        
        # Check for Apple Silicon
        try:
            machine = platform.machine().lower()
            if machine in ["arm64", "aarch64"]:
                return True
        except Exception:
            pass
        
        return False
    
    @staticmethod
    def get_gpu_info() -> Optional[dict]:
        """Get GPU information if available"""
        info = {
            "platform": PlatformDetector.get_platform(),
            "has_cuda": False,
            "has_metal": False,
            "gpu_type": None,
        }
        
        if PlatformDetector.has_cuda():
            info["has_cuda"] = True
            info["gpu_type"] = "nvidia_cuda"
            try:
                kwargs = {
                    "capture_output": True,
                    "text": True,
                    "timeout": 5
                }
                if platform.system() == "Windows":
                    try:
                        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
                    except AttributeError:
                        pass
                
                result = subprocess.run(
                    ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                    **kwargs
                )
                if result.returncode == 0:
                    lines = result.stdout.strip().split("\n")
                    if lines:
                        gpu_name = lines[0].split(",")[0].strip()
                        info["gpu_name"] = gpu_name
            except Exception as e:
                logger.debug(f"Failed to get GPU name: {e}")
        
        if PlatformDetector.has_metal():
            info["has_metal"] = True
            if not info["gpu_type"]:
                info["gpu_type"] = "apple_metal"
        
        return info
    
    @staticmethod
    def get_faiss_backend() -> Tuple[str, str]:
        """
        Determine which FAISS backend to use.
        
        Returns:
            Tuple of (backend_name, installation_command)
        """
        platform_name = PlatformDetector.get_platform()
        
        if platform_name == "macos":
            # Mac: Use CPU (Metal support in FAISS is limited)
            return "faiss-cpu", "pip install faiss-cpu"
        
        elif platform_name in ["windows", "linux"]:
            # Windows/Linux: Try GPU if CUDA available
            if PlatformDetector.has_cuda():
                return "faiss-gpu", "pip install faiss-gpu"
            else:
                return "faiss-cpu", "pip install faiss-cpu"
        
        else:
            # Unknown platform: default to CPU
            return "faiss-cpu", "pip install faiss-cpu"


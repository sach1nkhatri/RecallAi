"""System resource monitoring for performance tracking"""

import logging
import platform
from typing import Dict, Optional
from dataclasses import dataclass

# Try to import psutil with better error handling
psutil = None
psutil_error = None
try:
    import psutil
    # Verify psutil is actually working by testing a simple call
    try:
        _ = psutil.cpu_count()  # Test that psutil functions work
    except Exception as e:
        psutil_error = f"psutil imported but not functional: {e}"
        psutil = None
except ImportError as e:
    psutil_error = f"psutil import failed: {e}"
except Exception as e:
    psutil_error = f"Unexpected error importing psutil: {e}"

logger = logging.getLogger(__name__)

# Log warning only once at module load if psutil is unavailable
if psutil is None:
    logger.warning(
        f"psutil not available - resource monitoring will be limited. "
        f"Error: {psutil_error or 'Unknown error'}. "
        f"To install: pip install psutil>=5.9.0"
    )


@dataclass
class SystemResources:
    """System resource information"""
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_percent: float
    platform: str
    gpu_available: bool
    gpu_info: Optional[Dict] = None


class SystemMonitor:
    """Monitor system resources"""
    
    @staticmethod
    def get_resources() -> SystemResources:
        """Get current system resource usage"""
        if psutil is None:
            # Warning already logged at module load, just return defaults
            from src.infrastructure.external.platform_detector import PlatformDetector
            gpu_info = PlatformDetector.get_gpu_info()
            return SystemResources(
                cpu_percent=0.0,
                memory_percent=0.0,
                memory_used_gb=0.0,
                memory_total_gb=0.0,
                disk_percent=0.0,
                platform=PlatformDetector.get_platform(),
                gpu_available=gpu_info.get("has_cuda", False) if gpu_info else False,
                gpu_info=gpu_info
            )
        
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            # Get disk usage (handle different platforms)
            try:
                if platform.system() == "Windows":
                    disk = psutil.disk_usage('C:\\')
                else:
                    disk = psutil.disk_usage('/')
                disk_percent = disk.percent
            except Exception:
                disk_percent = 0.0
            
            # Get GPU info if available
            from src.infrastructure.external.platform_detector import PlatformDetector
            gpu_info = PlatformDetector.get_gpu_info()
            gpu_available = gpu_info.get("has_cuda", False) if gpu_info else False
            
            return SystemResources(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_gb=memory.used / (1024**3),
                memory_total_gb=memory.total / (1024**3),
                disk_percent=disk_percent,
                platform=PlatformDetector.get_platform(),
                gpu_available=gpu_available,
                gpu_info=gpu_info
            )
        except Exception as e:
            logger.warning(f"Failed to get system resources: {e}")
            from src.infrastructure.external.platform_detector import PlatformDetector
            gpu_info = PlatformDetector.get_gpu_info()
            return SystemResources(
                cpu_percent=0.0,
                memory_percent=0.0,
                memory_used_gb=0.0,
                memory_total_gb=0.0,
                disk_percent=0.0,
                platform=PlatformDetector.get_platform(),
                gpu_available=gpu_info.get("has_cuda", False) if gpu_info else False,
                gpu_info=gpu_info
            )
    
    @staticmethod
    def check_resources_available(min_memory_gb: float = 2.0) -> tuple[bool, str]:
        """
        Check if system has enough resources.
        
        Args:
            min_memory_gb: Minimum required free memory in GB
            
        Returns:
            Tuple of (is_available, message)
        """
        if psutil is None:
            return True, "Resource check unavailable (psutil not installed)"
        
        try:
            resources = SystemMonitor.get_resources()
            
            if resources.memory_total_gb == 0:
                return True, "Resource check unavailable"
            
            free_memory_gb = resources.memory_total_gb - resources.memory_used_gb
            
            if free_memory_gb < min_memory_gb:
                return False, f"Insufficient memory: {free_memory_gb:.1f}GB free, need {min_memory_gb}GB"
            
            if resources.memory_percent > 90:
                return False, f"Memory usage too high: {resources.memory_percent:.1f}%"
            
            if resources.cpu_percent > 95:
                return False, f"CPU usage too high: {resources.cpu_percent:.1f}%"
            
            return True, "Resources available"
        except Exception as e:
            logger.warning(f"Resource check failed: {e}")
            return True, "Resource check unavailable"  # Don't block if check fails


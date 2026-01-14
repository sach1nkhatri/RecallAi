"""Status page route for monitoring system health"""

import logging
import time
import random
from datetime import datetime
from typing import Dict, Any

from flask import Flask, render_template_string, jsonify
import requests
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from src.config.settings import settings
from src.infrastructure.storage.database import get_client, get_database
from src.infrastructure.storage.status_history import StatusHistory

logger = logging.getLogger(__name__)

# Track server start time for uptime calculation
_server_start_time = time.time()


def get_uptime_seconds() -> float:
    """Get server uptime in seconds"""
    return time.time() - _server_start_time


def format_uptime(seconds: float) -> str:
    """Format uptime in human-readable format"""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if secs > 0 or not parts:
        parts.append(f"{secs}s")
    
    return " ".join(parts)


def check_mongodb() -> Dict[str, Any]:
    """Check MongoDB connection status"""
    try:
        # Try to get client (may raise exception if not connected)
        try:
            client = get_client()
        except Exception as e:
            result = {
                "status": "unhealthy",
                "connected": False,
                "error": f"Connection failed: {str(e)}",
            }
            # Record status check
            try:
                StatusHistory.record_status_check("mongodb", "unhealthy", result)
            except:
                pass
            return result
        
        # Test connection with ping
        try:
            client.admin.command('ping')
        except Exception as e:
            result = {
                "status": "unhealthy",
                "connected": False,
                "error": f"Ping failed: {str(e)}",
            }
            # Record status check
            try:
                StatusHistory.record_status_check("mongodb", "unhealthy", result)
            except:
                pass
            return result
        
        # Get server info
        try:
            server_info = client.server_info()
            server_version = server_info.get("version", "unknown")
        except Exception:
            server_version = "unknown"
        
        # Get database stats
        try:
            db = get_database()
            db_stats = db.command("dbStats")
            collections = db_stats.get("collections", 0)
            data_size_mb = round(db_stats.get("dataSize", 0) / (1024 * 1024), 2)
        except Exception as e:
            logger.warning(f"Failed to get database stats: {e}")
            collections = 0
            data_size_mb = 0
        
        result = {
            "status": "healthy",
            "connected": True,
            "server_version": server_version,
            "database": settings.MONGODB_DB_NAME,
            "collections": collections,
            "data_size_mb": data_size_mb,
        }
        
        # Record status check
        try:
            StatusHistory.record_status_check("mongodb", "healthy", result)
        except:
            pass
        
        return result
    except Exception as e:
        logger.exception("MongoDB check failed")
        result = {
            "status": "error",
            "connected": False,
            "error": str(e),
        }
        # Record status check
        try:
            StatusHistory.record_status_check("mongodb", "error", result)
        except:
            pass
        return result


def check_python_backend() -> Dict[str, Any]:
    """Check Python backend health"""
    try:
        # Check if we can access the health endpoint
        health_url = f"http://localhost:{settings.API_PORT}/api/health"
        response = requests.get(health_url, timeout=2)
        
        if response.status_code == 200:
            data = response.json()
            result = {
                "status": "healthy",
                "uptime": format_uptime(get_uptime_seconds()),
                "port": settings.API_PORT,
                "host": settings.API_HOST,
                "health_data": data,
            }
            # Record status check
            try:
                StatusHistory.record_status_check("python_backend", "healthy", result)
            except:
                pass
            return result
        else:
            result = {
                "status": "unhealthy",
                "port": settings.API_PORT,
                "error": f"Health check returned status {response.status_code}",
            }
            # Record status check
            try:
                StatusHistory.record_status_check("python_backend", "unhealthy", result)
            except:
                pass
            return result
    except requests.exceptions.ConnectionError:
        result = {
            "status": "unhealthy",
            "port": settings.API_PORT,
            "error": "Cannot connect to Python backend",
        }
        # Record status check
        try:
            StatusHistory.record_status_check("python_backend", "unhealthy", result)
        except:
            pass
        return result
    except Exception as e:
        logger.exception("Python backend check failed")
        result = {
            "status": "error",
            "error": str(e),
        }
        # Record status check
        try:
            StatusHistory.record_status_check("python_backend", "error", result)
        except:
            pass
        return result


def check_node_backend() -> Dict[str, Any]:
    """Check Node.js backend health"""
    try:
        # Try to connect to Node backend
        node_url = settings.NODE_BACKEND_URL.rstrip('/')
        health_url = f"{node_url}/api/health"
        
        response = requests.get(health_url, timeout=2)
        
        if response.status_code == 200:
            data = response.json()
            result = {
                "status": "healthy",
                "url": node_url,
                "health_data": data,
            }
            # Record status check
            try:
                StatusHistory.record_status_check("node_backend", "healthy", result)
            except:
                pass
            return result
        else:
            result = {
                "status": "unhealthy",
                "url": node_url,
                "error": f"Health check returned status {response.status_code}",
            }
            # Record status check
            try:
                StatusHistory.record_status_check("node_backend", "unhealthy", result)
            except:
                pass
            return result
    except requests.exceptions.ConnectionError:
        result = {
            "status": "unhealthy",
            "url": settings.NODE_BACKEND_URL,
            "error": "Cannot connect to Node.js backend",
        }
        # Record status check
        try:
            StatusHistory.record_status_check("node_backend", "unhealthy", result)
        except:
            pass
        return result
    except Exception as e:
        logger.exception("Node backend check failed")
        result = {
            "status": "error",
            "error": str(e),
        }
        # Record status check
        try:
            StatusHistory.record_status_check("node_backend", "error", result)
        except:
            pass
        return result


STATUS_PAGE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recall AI - System Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .header p {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin-bottom: 30px;
        }
        
        .status-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .status-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        
        .status-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .status-title {
            font-size: 24px;
            font-weight: 600;
            color: #333;
        }
        
        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-badge.healthy {
            background: #10b981;
            color: white;
        }
        
        .status-badge.unhealthy {
            background: #ef4444;
            color: white;
        }
        
        .status-badge.error {
            background: #f59e0b;
            color: white;
        }
        
        .status-details {
            margin-top: 20px;
        }
        
        .status-detail-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .status-detail-item:last-child {
            border-bottom: none;
        }
        
        .status-detail-label {
            font-weight: 500;
            color: #6b7280;
        }
        
        .status-detail-value {
            color: #111827;
            font-weight: 600;
        }
        
        .status-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 12px;
            margin-top: 15px;
            color: #991b1b;
            font-size: 14px;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            opacity: 0.8;
        }
        
        .refresh-info {
            text-align: center;
            color: white;
            margin-top: 20px;
            font-size: 14px;
            opacity: 0.7;
        }
        
        .overall-status {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
        }
        
        .overall-status h2 {
            font-size: 32px;
            margin-bottom: 15px;
            color: #333;
        }
        
        .overall-status .status-badge {
            display: inline-block;
            font-size: 18px;
            padding: 12px 24px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Recall AI</h1>
            <p>System Status Dashboard</p>
        </div>
        
        <div class="overall-status">
            <h2>Overall Status</h2>
            <span class="status-badge {{ overall_status_class }}">{{ overall_status }}</span>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <div class="status-header">
                    <h3 class="status-title">🌐 Web Frontend</h3>
                    <span class="status-badge {{ web_status_class }}">{{ web_status }}</span>
                </div>
                <div class="status-details">
                    <div class="status-detail-item">
                        <span class="status-detail-label">Status</span>
                        <span class="status-detail-value">{{ web_status }}</span>
                    </div>
                    <div class="status-detail-item">
                        <span class="status-detail-label">Last Checked</span>
                        <span class="status-detail-value">{{ timestamp }}</span>
                    </div>
                </div>
            </div>
            
            <div class="status-card">
                <div class="status-header">
                    <h3 class="status-title">🐍 Python Backend</h3>
                    <span class="status-badge {{ python_status_class }}">{{ python_status }}</span>
                </div>
                <div class="status-details">
                    {% if python_uptime %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Uptime</span>
                        <span class="status-detail-value">{{ python_uptime }}</span>
                    </div>
                    {% endif %}
                    {% if python_port %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Port</span>
                        <span class="status-detail-value">{{ python_port }}</span>
                    </div>
                    {% endif %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Last Checked</span>
                        <span class="status-detail-value">{{ timestamp }}</span>
                    </div>
                    {% if python_error %}
                    <div class="status-error">{{ python_error }}</div>
                    {% endif %}
                </div>
            </div>
            
            <div class="status-card">
                <div class="status-header">
                    <h3 class="status-title">🍃 MongoDB</h3>
                    <span class="status-badge {{ mongodb_status_class }}">{{ mongodb_status }}</span>
                </div>
                <div class="status-details">
                    {% if mongodb_connected %}
                    {% if mongodb_version %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Version</span>
                        <span class="status-detail-value">{{ mongodb_version }}</span>
                    </div>
                    {% endif %}
                    {% if mongodb_database %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Database</span>
                        <span class="status-detail-value">{{ mongodb_database }}</span>
                    </div>
                    {% endif %}
                    {% if mongodb_collections %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Collections</span>
                        <span class="status-detail-value">{{ mongodb_collections }}</span>
                    </div>
                    {% endif %}
                    {% if mongodb_data_size %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Data Size</span>
                        <span class="status-detail-value">{{ mongodb_data_size }} MB</span>
                    </div>
                    {% endif %}
                    {% endif %}
                    <div class="status-detail-item">
                        <span class="status-detail-label">Last Checked</span>
                        <span class="status-detail-value">{{ timestamp }}</span>
                    </div>
                    {% if mongodb_error %}
                    <div class="status-error">{{ mongodb_error }}</div>
                    {% endif %}
                </div>
            </div>
        </div>
        
        <div class="refresh-info">
            Page auto-refreshes every 30 seconds | Last updated: {{ timestamp }}
        </div>
        
        <div class="footer">
            <p>&copy; 2024 Recall AI. All systems monitored.</p>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(function() {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
"""


def register_status_routes(app: Flask):
    """Register status page routes"""
    
    @app.route("/status.recallai", methods=["GET"])
    def status_page():
        """Professional status page showing all system components"""
        try:
            # Check all systems
            mongodb_status = check_mongodb()
            python_status = check_python_backend()
            node_status = check_node_backend()
            
            # Determine overall status
            all_healthy = (
                mongodb_status.get("status") == "healthy" and
                python_status.get("status") == "healthy" and
                node_status.get("status") == "healthy"
            )
            
            overall_status = "All Systems Operational" if all_healthy else "Some Systems Down"
            overall_status_class = "healthy" if all_healthy else "unhealthy"
            
            # Prepare template variables
            template_vars = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
                "overall_status": overall_status,
                "overall_status_class": overall_status_class,
                
                # Web status (assume healthy if we can render this page)
                "web_status": "Healthy",
                "web_status_class": "healthy",
                
                # Python backend
                "python_status": python_status.get("status", "unknown").title(),
                "python_status_class": python_status.get("status", "error"),
                "python_uptime": python_status.get("uptime"),
                "python_port": python_status.get("port"),
                "python_error": python_status.get("error"),
                
                # MongoDB
                "mongodb_status": mongodb_status.get("status", "unknown").title(),
                "mongodb_status_class": mongodb_status.get("status", "error"),
                "mongodb_connected": mongodb_status.get("connected", False),
                "mongodb_version": mongodb_status.get("server_version"),
                "mongodb_database": mongodb_status.get("database"),
                "mongodb_collections": mongodb_status.get("collections"),
                "mongodb_data_size": mongodb_status.get("data_size_mb"),
                "mongodb_error": mongodb_status.get("error"),
            }
            
            return render_template_string(STATUS_PAGE_HTML, **template_vars)
            
        except Exception as e:
            logger.exception("Status page generation failed")
            return f"<h1>Status Page Error</h1><p>{str(e)}</p>", 500
    
    @app.route("/api/status", methods=["GET"])
    def status_api():
        """JSON API endpoint for status checks"""
        try:
            mongodb_status = check_mongodb()
            python_status = check_python_backend()
            node_status = check_node_backend()
            
            all_healthy = (
                mongodb_status.get("status") == "healthy" and
                python_status.get("status") == "healthy" and
                node_status.get("status") == "healthy"
            )
            
            # Get real uptime data from historical records
            python_status["uptime_percentage"] = StatusHistory.calculate_uptime_percentage("python_backend", days=30)
            python_status["uptime_history"] = StatusHistory.get_uptime_bars("python_backend", days=30)
            python_status["component_count"] = 5  # Python backend components
            
            node_status["uptime_percentage"] = StatusHistory.calculate_uptime_percentage("node_backend", days=30)
            node_status["uptime_history"] = StatusHistory.get_uptime_bars("node_backend", days=30)
            node_status["component_count"] = 4  # Node.js backend components
            
            mongodb_status["uptime_percentage"] = StatusHistory.calculate_uptime_percentage("mongodb", days=30)
            mongodb_status["uptime_history"] = StatusHistory.get_uptime_bars("mongodb", days=30)
            mongodb_status["component_count"] = 2  # MongoDB components
            
            # Web frontend - record as healthy if we can serve this page
            try:
                StatusHistory.record_status_check("web", "healthy", {"note": "Status page accessible"})
            except:
                pass
            
            web_status = {
                "status": "healthy",
                "note": "Status page is accessible",
                "uptime_percentage": StatusHistory.calculate_uptime_percentage("web", days=30),
                "uptime_history": StatusHistory.get_uptime_bars("web", days=30),
                "component_count": 3  # Web frontend components
            }
            
            return jsonify({
                "status": "healthy" if all_healthy else "degraded",
                "timestamp": datetime.now().isoformat(),
                "uptime_seconds": get_uptime_seconds(),
                "uptime_formatted": format_uptime(get_uptime_seconds()),
                "services": {
                    "web": web_status,
                    "python_backend": python_status,
                    "node_backend": node_status,
                    "mongodb": mongodb_status,
                }
            }), 200
            
        except Exception as e:
            logger.exception("Status API failed")
            return jsonify({
                "status": "error",
                "error": str(e)
            }), 500


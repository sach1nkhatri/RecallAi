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
            background: #ffffff;
            color: #000000;
            padding: 0;
        }
        
        .status-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 24px;
        }
        
        /* Header */
        .status-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .status-logo h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            color: #000000;
        }
        
        /* Overall Status Box */
        .overall-status-box {
            background: #10b981;
            color: #ffffff;
            border-radius: 8px;
            padding: 24px 32px;
            margin-bottom: 40px;
        }
        
        .overall-status-box.degraded {
            background: #f59e0b;
        }
        
        .status-text h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 4px 0;
        }
        
        .status-text p {
            font-size: 14px;
            margin: 0;
            opacity: 0.9;
        }
        
        /* System Status Section */
        .system-status-section {
            margin-bottom: 40px;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        
        .section-header h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            color: #000000;
        }
        
        .date-range {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: #6b7280;
        }
        
        .date-nav {
            background: none;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            color: #6b7280;
            font-size: 14px;
        }
        
        .date-nav:hover {
            background: #f9fafb;
        }
        
        /* Service Cards */
        .service-cards {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .service-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            background: #ffffff;
        }
        
        .service-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .service-name {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 16px;
            font-weight: 500;
            color: #000000;
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
        
        .component-count {
            font-size: 14px;
            color: #6b7280;
        }
        
        .service-uptime {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .uptime-bars {
            display: flex;
            gap: 2px;
            flex: 1;
            height: 24px;
            align-items: center;
        }
        
        .uptime-bar {
            flex: 1;
            height: 8px;
            border-radius: 2px;
            min-width: 3px;
        }
        
        .uptime-bar.green {
            background: #10b981;
        }
        
        .uptime-bar.yellow {
            background: #f59e0b;
        }
        
        .uptime-bar.red {
            background: #ef4444;
        }
        
        .uptime-percentage {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
            white-space: nowrap;
            min-width: 100px;
            text-align: right;
        }
        
        /* Footer */
        .status-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        
        .refresh-btn {
            background: none;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 14px;
            color: #000000;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .refresh-btn:hover {
            background: #f9fafb;
        }
        
        @media (max-width: 768px) {
            .status-container {
                padding: 24px 16px;
            }
            
            .status-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 16px;
            }
            
            .section-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            
            .service-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .service-uptime {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .uptime-percentage {
                text-align: left;
            }
            
            .status-footer {
                flex-direction: column;
                gap: 12px;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body>
    <div class="status-container">
        <!-- Header -->
        <div class="status-header">
            <div class="status-logo">
                <h1>Recall AI</h1>
            </div>
        </div>

        <!-- Overall Status Box -->
        <div class="overall-status-box {{ overall_status_class }}">
            <div class="status-text">
                <h2>{{ overall_status }}</h2>
                <p>We're not aware of any issues affecting our systems.</p>
            </div>
        </div>

        <!-- System Status Section -->
        <div class="system-status-section">
            <div class="section-header">
                <h3>System status</h3>
                <div class="date-range">
                    <button class="date-nav">‹</button>
                    <span>Oct 2025 - Jan 2026</span>
                    <button class="date-nav">›</button>
                </div>
            </div>

            <!-- Service Cards -->
            <div class="service-cards">
                <!-- Web Frontend -->
                <div class="service-card">
                    <div class="service-header">
                        <div class="service-name">
                            <span>Web Frontend</span>
                        </div>
                        <div class="service-meta">
                            <span class="component-count">{{ web_component_count }} components</span>
                        </div>
                    </div>
                    <div class="service-uptime">
                        <div class="uptime-bars">
                            {% for color in web_uptime_history %}
                            <div class="uptime-bar {{ color }}"></div>
                            {% endfor %}
                        </div>
                        <span class="uptime-percentage">
                            {{ "%.2f"|format(web_uptime_percentage) }}% uptime
                        </span>
                    </div>
                </div>

                <!-- Python Backend -->
                <div class="service-card">
                    <div class="service-header">
                        <div class="service-name">
                            <span>Python Backend</span>
                        </div>
                        <div class="service-meta">
                            <span class="component-count">{{ python_component_count }} components</span>
                        </div>
                    </div>
                    <div class="service-uptime">
                        <div class="uptime-bars">
                            {% for color in python_uptime_history %}
                            <div class="uptime-bar {{ color }}"></div>
                            {% endfor %}
                        </div>
                        <span class="uptime-percentage">
                            {{ "%.2f"|format(python_uptime_percentage) }}% uptime
                        </span>
                    </div>
                </div>

                <!-- Node.js Backend -->
                <div class="service-card">
                    <div class="service-header">
                        <div class="service-name">
                            <span>Node.js Backend</span>
                        </div>
                        <div class="service-meta">
                            <span class="component-count">{{ node_component_count }} components</span>
                        </div>
                    </div>
                    <div class="service-uptime">
                        <div class="uptime-bars">
                            {% for color in node_uptime_history %}
                            <div class="uptime-bar {{ color }}"></div>
                            {% endfor %}
                        </div>
                        <span class="uptime-percentage">
                            {{ "%.2f"|format(node_uptime_percentage) }}% uptime
                        </span>
                    </div>
                </div>

                <!-- MongoDB -->
                <div class="service-card">
                    <div class="service-header">
                        <div class="service-name">
                            <span>MongoDB</span>
                        </div>
                        <div class="service-meta">
                            <span class="component-count">{{ mongodb_component_count }} components</span>
                        </div>
                    </div>
                    <div class="service-uptime">
                        <div class="uptime-bars">
                            {% for color in mongodb_uptime_history %}
                            <div class="uptime-bar {{ color }}"></div>
                            {% endfor %}
                        </div>
                        <span class="uptime-percentage">
                            {{ "%.2f"|format(mongodb_uptime_percentage) }}% uptime
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="status-footer">
            <p>Last updated: {{ timestamp }}</p>
            <button onclick="location.reload()" class="refresh-btn">Refresh</button>
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
            
            overall_status = "We're fully operational" if all_healthy else "Some systems are experiencing issues"
            overall_status_class = "operational" if all_healthy else "degraded"
            
            # Get real uptime data from historical records
            python_status["uptime_percentage"] = StatusHistory.calculate_uptime_percentage("python_backend", days=30)
            python_status["uptime_history"] = StatusHistory.get_uptime_bars("python_backend", days=30)
            python_status["component_count"] = 5
            
            node_status["uptime_percentage"] = StatusHistory.calculate_uptime_percentage("node_backend", days=30)
            node_status["uptime_history"] = StatusHistory.get_uptime_bars("node_backend", days=30)
            node_status["component_count"] = 4
            
            mongodb_status["uptime_percentage"] = StatusHistory.calculate_uptime_percentage("mongodb", days=30)
            mongodb_status["uptime_history"] = StatusHistory.get_uptime_bars("mongodb", days=30)
            mongodb_status["component_count"] = 2
            
            # Web frontend - record as healthy if we can serve this page
            try:
                StatusHistory.record_status_check("web", "healthy", {"note": "Status page accessible"})
            except:
                pass
            
            web_uptime_percentage = StatusHistory.calculate_uptime_percentage("web", days=30)
            web_uptime_history = StatusHistory.get_uptime_bars("web", days=30)
            
            # Prepare template variables
            template_vars = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
                "overall_status": overall_status,
                "overall_status_class": overall_status_class,
                
                # Web status
                "web_uptime_percentage": web_uptime_percentage,
                "web_uptime_history": web_uptime_history,
                "web_component_count": 3,
                
                # Python backend
                "python_uptime_percentage": python_status.get("uptime_percentage", 100.0),
                "python_uptime_history": python_status.get("uptime_history", []),
                "python_component_count": python_status.get("component_count", 5),
                
                # Node backend
                "node_uptime_percentage": node_status.get("uptime_percentage", 100.0),
                "node_uptime_history": node_status.get("uptime_history", []),
                "node_component_count": node_status.get("component_count", 4),
                
                # MongoDB
                "mongodb_uptime_percentage": mongodb_status.get("uptime_percentage", 100.0),
                "mongodb_uptime_history": mongodb_status.get("uptime_history", []),
                "mongodb_component_count": mongodb_status.get("component_count", 2),
            }
            
            return render_template_string(STATUS_PAGE_HTML, **template_vars)
            
        except Exception as e:
            logger.exception("Status page generation failed")
            return f"<h1>Status Page Error</h1><p>{str(e)}</p>", 500
    
    @app.route("/api/status", methods=["GET"])
    def status_api():
        """JSON API endpoint for status checks"""
        try:
            # Cleanup old records periodically (keep last 90 days)
            # Only do this occasionally to avoid overhead
            import random as rand_module
            if rand_module.random() < 0.01:  # 1% chance on each request
                try:
                    StatusHistory.cleanup_old_records(days_to_keep=90)
                except:
                    pass
            
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

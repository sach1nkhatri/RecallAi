"""User settings and account management API routes"""

import json
import logging
from pathlib import Path
from datetime import datetime, date

from flask import jsonify, request

from src.config.settings import settings

logger = logging.getLogger(__name__)

# User data storage (in production, use a database)
USER_DATA_DIR = Path(settings.BASE_DIR) / "data" / "users"
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_user_file(user_id: str = "default") -> Path:
    """Get user data file path"""
    return USER_DATA_DIR / f"{user_id}.json"


def load_user_data(user_id: str = "default") -> dict:
    """Load user data from storage"""
    user_file = get_user_file(user_id)
    if user_file.exists():
        try:
            with open(user_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load user data: {e}")
            return {}
    return {
        "id": user_id,
        "name": "",
        "email": "",
        "plan": "free",
        "createdAt": datetime.now().isoformat(),
        "usage": {
            "bots": {"current": 0, "limit": 1},
            "chats": {"today": 0, "limit": 10, "lastReset": date.today().isoformat()},
            "codeToDoc": {"used": 0, "limit": 2},
            "tokens": {"used": 0, "limit": 5000},
        },
    }


def save_user_data(user_id: str, data: dict) -> None:
    """Save user data to storage"""
    user_file = get_user_file(user_id)
    try:
        with open(user_file, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save user data: {e}")
        raise


def reset_daily_usage(user_data: dict) -> dict:
    """Reset daily usage counters if needed"""
    last_reset = user_data.get("usage", {}).get("chats", {}).get("lastReset", "")
    today = date.today().isoformat()
    
    if last_reset != today:
        user_data.setdefault("usage", {})
        user_data["usage"].setdefault("chats", {})
        user_data["usage"]["chats"]["today"] = 0
        user_data["usage"]["chats"]["lastReset"] = today
    
    return user_data


def register_user_routes(app):
    """Register user-related routes"""
    logger.info("Registering user routes...")
    
    @app.route("/api/user/profile", methods=["GET"])
    def get_user_profile():
        """Get user profile"""
        try:
            # In production, get user_id from auth token
            user_id = request.headers.get("X-User-ID", "default")
            user_data = load_user_data(user_id)
            user_data = reset_daily_usage(user_data)
            
            return jsonify({
                "user": {
                    "id": user_data.get("id"),
                    "name": user_data.get("name"),
                    "email": user_data.get("email"),
                    "plan": user_data.get("plan", "free"),
                }
            }), 200
        except Exception as e:
            logger.exception("Failed to get user profile")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/user/profile", methods=["PUT"])
    def update_user_profile():
        """Update user profile"""
        try:
            user_id = request.headers.get("X-User-ID", "default")
            data = request.get_json() or {}
            
            user_data = load_user_data(user_id)
            user_data["name"] = data.get("name", user_data.get("name", ""))
            user_data["email"] = data.get("email", user_data.get("email", ""))
            
            save_user_data(user_id, user_data)
            
            return jsonify({
                "user": {
                    "id": user_data.get("id"),
                    "name": user_data.get("name"),
                    "email": user_data.get("email"),
                    "plan": user_data.get("plan", "free"),
                }
            }), 200
        except Exception as e:
            logger.exception("Failed to update user profile")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/user/usage", methods=["GET"])
    def get_user_usage():
        """Get user usage statistics"""
        try:
            user_id = request.headers.get("X-User-ID", "default")
            user_data = load_user_data(user_id)
            user_data = reset_daily_usage(user_data)
            
            # Count actual bots
            bots_file = Path(settings.BASE_DIR) / "data" / "bots" / "bots.json"
            bot_count = 0
            if bots_file.exists():
                try:
                    with open(bots_file, "r") as f:
                        bots = json.load(f)
                        bot_count = len(bots)
                except Exception:
                    pass
            
            usage = user_data.get("usage", {})
            usage["bots"]["current"] = bot_count
            
            return jsonify(usage), 200
        except Exception as e:
            logger.exception("Failed to get user usage")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/user/bots", methods=["DELETE"])
    def delete_all_bots():
        """Delete all user bots"""
        try:
            user_id = request.headers.get("X-User-ID", "default")
            bots_file = Path(settings.BASE_DIR) / "data" / "bots" / "bots.json"
            
            if bots_file.exists():
                bots_file.unlink()
            
            # Delete all RAG indices
            rag_indices_dir = Path(settings.BASE_DIR) / "data" / "rag_indices"
            if rag_indices_dir.exists():
                for index_file in rag_indices_dir.glob("*.index"):
                    index_file.unlink()
                for meta_file in rag_indices_dir.glob("*.metadata.json"):
                    meta_file.unlink()
            
            # Delete bot upload directories
            bot_upload_base = settings.UPLOAD_PATH / "bots"
            if bot_upload_base.exists():
                import shutil
                for bot_dir in bot_upload_base.iterdir():
                    if bot_dir.is_dir():
                        shutil.rmtree(bot_dir)
            
            return jsonify({"success": True}), 200
        except Exception as e:
            logger.exception("Failed to delete all bots")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/user/code-to-doc/history", methods=["DELETE"])
    def delete_code_to_doc_history():
        """Delete all code to doc history"""
        try:
            user_id = request.headers.get("X-User-ID", "default")
            
            # Clear localStorage on frontend handles this, but we can also clear backend storage
            # In a real app, you'd have a database table for generations
            
            return jsonify({"success": True}), 200
        except Exception as e:
            logger.exception("Failed to delete code to doc history")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/user/account", methods=["DELETE"])
    def delete_user_account():
        """Delete user account and all associated data"""
        try:
            user_id = request.headers.get("X-User-ID", "default")
            
            # Delete user data file
            user_file = get_user_file(user_id)
            if user_file.exists():
                user_file.unlink()
            
            # Delete all bots
            bots_file = Path(settings.BASE_DIR) / "data" / "bots" / "bots.json"
            if bots_file.exists():
                bots_file.unlink()
            
            # Delete all RAG indices
            rag_indices_dir = Path(settings.BASE_DIR) / "data" / "rag_indices"
            if rag_indices_dir.exists():
                for index_file in rag_indices_dir.glob("*.index"):
                    index_file.unlink()
                for meta_file in rag_indices_dir.glob("*.metadata.json"):
                    meta_file.unlink()
            
            # Delete bot upload directories
            bot_upload_base = settings.UPLOAD_PATH / "bots"
            if bot_upload_base.exists():
                import shutil
                for bot_dir in bot_upload_base.iterdir():
                    if bot_dir.is_dir():
                        shutil.rmtree(bot_dir)
            
            return jsonify({"success": True}), 200
        except Exception as e:
            logger.exception("Failed to delete account")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/user/usage/increment", methods=["POST"])
    def increment_usage():
        """Increment usage counter"""
        logger.info(f"Increment usage called: {request.get_json()}")
        try:
            user_id = request.headers.get("X-User-ID", "default")
            data = request.get_json() or {}
            usage_type = data.get("type")
            amount = data.get("amount", 1)
            
            if not usage_type:
                return jsonify({"error": "Usage type is required"}), 400
            
            user_data = load_user_data(user_id)
            user_data = reset_daily_usage(user_data)
            
            usage = user_data.setdefault("usage", {})
            
            if usage_type == "bots":
                usage.setdefault("bots", {})["current"] = usage["bots"].get("current", 0) + amount
            elif usage_type == "chats":
                usage.setdefault("chats", {})["today"] = usage["chats"].get("today", 0) + amount
            elif usage_type == "codeToDoc":
                usage.setdefault("codeToDoc", {})["used"] = usage["codeToDoc"].get("used", 0) + amount
            elif usage_type == "tokens":
                usage.setdefault("tokens", {})["used"] = usage["tokens"].get("used", 0) + amount
            
            save_user_data(user_id, user_data)
            
            return jsonify({"success": True, "usage": usage}), 200
        except Exception as e:
            logger.exception("Failed to increment usage")
            return jsonify({"error": str(e)}), 500


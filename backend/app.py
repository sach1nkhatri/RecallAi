"""Application entry point"""

from dotenv import load_dotenv
import os
import logging
from pathlib import Path

# Configure logging BEFORE importing app modules
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Set specific loggers to DEBUG for more verbose output
logging.getLogger('src.application.services').setLevel(logging.DEBUG)
logging.getLogger('src.infrastructure.external').setLevel(logging.DEBUG)

# Load .env file - check both backend/ and project root
backend_dir = Path(__file__).parent
root_dir = backend_dir.parent

# Try backend/.env first, then root/.env
env_paths = [
    backend_dir / '.env',  # backend/.env
    root_dir / '.env',     # root/.env (project root)
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break
else:
    # If no .env found, try default behavior (current directory)
    load_dotenv()

from src.infrastructure.api import create_app
from src.config.settings import settings

app = create_app()

if __name__ == "__main__":
    app.run(host=settings.API_HOST, port=settings.API_PORT, debug=settings.DEBUG)

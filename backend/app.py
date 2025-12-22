"""Application entry point"""

from src.infrastructure.api import create_app
from src.config.settings import settings

app = create_app()

if __name__ == "__main__":
    app.run(host=settings.API_HOST, port=settings.API_PORT, debug=settings.DEBUG)

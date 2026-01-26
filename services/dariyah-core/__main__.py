import uvicorn
from services.dariyah_core.app import app, PORT

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)

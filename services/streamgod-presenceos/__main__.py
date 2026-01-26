import os
import uvicorn
from services.streamgod_presenceos.app import app

PORT = int(os.getenv("PRESENCEOS_PORT", "8002"))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)

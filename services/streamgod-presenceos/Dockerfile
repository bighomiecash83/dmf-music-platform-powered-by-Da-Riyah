FROM python:3.12-slim

WORKDIR /app

COPY libs/security /app/libs/security
COPY services/streamgod-presenceos /app/services/streamgod-presenceos

RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy psycopg[binary] pydantic

ENV PYTHONPATH=/app

EXPOSE 8002
CMD ["python", "-m", "services.streamgod-presenceos.app"]
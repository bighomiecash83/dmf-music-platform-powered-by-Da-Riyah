FROM python:3.12-slim

WORKDIR /app

COPY libs/security /app/libs/security
COPY services/dariyah-core /app/services/dariyah-core

RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy psycopg[binary] pydantic

ENV PYTHONPATH=/app

EXPOSE 8001
CMD ["python", "-m", "services.dariyah-core.app"]
FROM python:3.12-slim

WORKDIR /app

COPY libs/security /app/libs/security
COPY services/streamgod-presenceos /app/services/streamgod-presenceos

RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir fastapi uvicorn sqlalchemy psycopg[binary] pydantic

ENV PYTHONPATH=/app

EXPOSE 8002
CMD ["uvicorn", "services.streamgod-presenceos.app:app", "--host", "0.0.0.0", "--port", "8002"]
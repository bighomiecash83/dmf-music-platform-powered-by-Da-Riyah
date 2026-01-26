FROM python:3.12-slim

WORKDIR /app

COPY libs/security /app/libs/security
COPY services/dariyah-core /app/services/dariyah-core

RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir fastapi uvicorn sqlalchemy psycopg[binary] pydantic

ENV PYTHONPATH=/app

EXPOSE 8001
CMD ["uvicorn", "services.dariyah-core.app:app", "--host", "0.0.0.0", "--port", "8001"]
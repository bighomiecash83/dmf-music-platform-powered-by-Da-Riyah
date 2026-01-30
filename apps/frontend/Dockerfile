FROM python:3.11-slim

WORKDIR /app

COPY index.html .

EXPOSE 3000

# WARNING: python -m http.server is for development only. Replace for production use.
CMD ["python", "-m", "http.server", "3000"]

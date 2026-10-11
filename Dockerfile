# Build the React app (frontend/) into storage/compiled/app.
FROM node:22-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend /build/storage/compiled/app storage/compiled/app

EXPOSE 8000
CMD ["sh", "-c", "gunicorn --workers ${WEB_CONCURRENCY:-3} --timeout 120 --bind 0.0.0.0:${PORT:-8000} wsgi:application"]

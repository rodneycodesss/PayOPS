#!/bin/sh
set -e
echo "Starting Rodstar PayOps..."
if [ -d "backend" ]; then
    echo "Switching to backend directory..."
    cd backend
fi
echo "Running database migrations..."
alembic upgrade head
echo "Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

#!/bin/sh
set -e

# Locate python executable
PYTHON_CMD="python"
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
fi

echo "Running database migrations..."
$PYTHON_CMD -m alembic upgrade head

PORT="${PORT:-3000}"
echo "Starting FastAPI server on port ${PORT}..."
exec $PYTHON_CMD -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"

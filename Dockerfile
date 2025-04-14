# Python backend
FROM python:3.10-slim

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and change to the app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install uv 
RUN pip install uv

# Use uv to install dependencies in a virtual environment
RUN uv venv .venv
# Install dependencies without forcing source builds
RUN . .venv/bin/activate && uv pip install -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create an empty static directory for serving static files if it doesn't exist
RUN mkdir -p ./static

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"

# Run the web service on container startup with the activated venv
CMD ["hypercorn", "main:app", "--bind", "0.0.0.0:8000"]
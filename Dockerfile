FROM python:3.11-slim

WORKDIR /app

# Install Node.js for frontend build
RUN apt-get update && \
    apt-get install -y --no-install-recommends nodejs npm curl && \
    rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . .

# Install npm dependencies
RUN npm install --production

# Build validation
RUN npm run build

# Create necessary directories
RUN mkdir -p data logs backups && \
    chmod 755 data logs backups

# Set Python to run in unbuffered mode
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 5173

# Environment defaults (override with .env or docker-compose)
ENV ENVIRONMENT=production
ENV HOST=0.0.0.0
ENV PORT=5173
ENV DEBUG=false

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5173/api/health || exit 1

# Initialize database and start server
CMD ["python3", "-m", "backend.server"]

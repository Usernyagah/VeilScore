# Multi-stage Dockerfile for VeilScore (Backend + Frontend)
# Production-ready deployment configuration

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# Copy package files first for better layer caching
COPY client/package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci || npm install

# Copy source code
COPY client/ ./

# Build arguments for environment variables (Vite requires these at build time)
ARG VITE_API_URL=http://localhost:8000
ARG VITE_VERIFIER_ADDRESS=0x703e92f670d4D1b7e86f7a5bC9980C5fef07B4dD
ARG VITE_PRIVATE_CREDIT_LENDING_ADDRESS=0xfc61d92FABc2344385362400b2f7C53BEd4837Dc
ARG VITE_NETWORK_CHAIN_ID=5003
ARG VITE_EXPLORER_URL=https://explorer.sepolia.mantle.xyz
ARG VITE_WALLETCONNECT_PROJECT_ID=

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_VERIFIER_ADDRESS=$VITE_VERIFIER_ADDRESS
ENV VITE_PRIVATE_CREDIT_LENDING_ADDRESS=$VITE_PRIVATE_CREDIT_LENDING_ADDRESS
ENV VITE_NETWORK_CHAIN_ID=$VITE_NETWORK_CHAIN_ID
ENV VITE_EXPLORER_URL=$VITE_EXPLORER_URL
ENV VITE_WALLETCONNECT_PROJECT_ID=$VITE_WALLETCONNECT_PROJECT_ID

# Build the frontend
RUN npm run build

# Stage 2: Final image with Backend + Frontend
FROM python:3.12-slim

# Metadata labels
LABEL maintainer="VeilScore Team"
LABEL description="VeilScore - Private credit scoring with zero-knowledge proofs"
LABEL version="1.0.0"

WORKDIR /app

# Install system dependencies (nginx, curl for health checks)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy backend requirements and install Python dependencies
COPY zkml/requirements.txt ./zkml/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r zkml/requirements.txt

# Copy backend application code
COPY zkml/ ./zkml/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/client/dist /var/www/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create necessary directories
RUN mkdir -p zkml/models/ezkl \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/supervisor

# Ensure models directory exists (will be mounted or copied)
# Models should be provided via volume mount or COPY command
RUN if [ ! -d "zkml/models" ]; then mkdir -p zkml/models; fi

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/zkml
ENV PORT=8000

# Expose port (nginx will serve on 80, backend on 8000 internally)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Use supervisor to manage both nginx and backend
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]


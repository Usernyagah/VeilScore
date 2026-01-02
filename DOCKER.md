# Docker Setup for VeilScore

This document explains how to build and run VeilScore using Docker.

## Quick Start

### Production Build

Build and run all services:

```bash
docker-compose up --build
```

This will:
- Build backend API server (port 8000)
- Build frontend application (port 8080)
- Start both services with proper networking

Access:
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- Health Check: http://localhost:8000/health

### Development Build (with hot-reload)

For development with hot-reload:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

This mounts source code as volumes for live reloading.

## Individual Services

### Build Backend Only

```bash
cd zkml
docker build -t veilscore-backend .
docker run -p 8000:8000 veilscore-backend
```

### Build Frontend Only

```bash
cd client
docker build -t veilscore-frontend .
docker run -p 8080:80 veilscore-frontend
```

## Environment Variables

### Backend

The backend doesn't require environment variables by default, but you can set:

- `PYTHONUNBUFFERED=1` - For better logging (already set in docker-compose)
- Custom model paths (if needed)

### Frontend

Create a `.env` file in the project root or set environment variables:

```env
VITE_API_URL=http://localhost:8000
VITE_VERIFIER_ADDRESS=0x...
VITE_PRIVATE_CREDIT_LENDING_ADDRESS=0x...
VITE_NETWORK_CHAIN_ID=5003
VITE_EXPLORER_URL=https://explorer.sepolia.mantle.xyz
```

**Note:** For production builds, environment variables must be set at build time (not runtime) for Vite. You may need to modify the Dockerfile or use build args.

## Docker Compose Commands

### Start services
```bash
docker-compose up
```

### Start in background
```bash
docker-compose up -d
```

### View logs
```bash
docker-compose logs -f
```

### Stop services
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### Clean rebuild (remove volumes)
```bash
docker-compose down -v
docker-compose up --build
```

## Production Deployment

For production deployment:

1. **Build images:**
   ```bash
   docker-compose build
   ```

2. **Set environment variables:**
   - Create `.env` file or use environment variables
   - Ensure contract addresses are set

3. **Run with restart policy:**
   ```bash
   docker-compose up -d
   ```

4. **Use reverse proxy (recommended):**
   - Set up Nginx/Traefik in front of Docker containers
   - Configure SSL/TLS certificates
   - Set up proper domain routing

## Troubleshooting

### Port Already in Use

If ports 8000 or 8080 are already in use, modify `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8001:8000"  # Change host port
  frontend:
    ports:
      - "8081:80"  # Change host port
```

### Backend Can't Load Models

Ensure models directory exists and is mounted:

```yaml
volumes:
  - ./zkml/models:/app/models
```

### Frontend Can't Connect to Backend

In development, use `http://localhost:8000` (host network).
In Docker, use `http://backend:8000` (internal network).

For production builds, the frontend needs to be built with the correct API URL using build args.

### Build Fails

1. Check Docker version: `docker --version` (should be 20.10+)
2. Check disk space: `docker system df`
3. Clean build cache: `docker builder prune`
4. Check logs: `docker-compose logs [service-name]`

### Container Won't Start

1. Check logs: `docker-compose logs [service-name]`
2. Check health: `docker-compose ps`
3. Test individually: `docker run [image-name]`

## Multi-stage Build

The frontend uses a multi-stage build:
- Stage 1: Build React application with Node.js
- Stage 2: Serve static files with Nginx

This results in a smaller final image.

## Volume Mounts

### Development
- Source code mounted for hot-reload
- Models directory mounted for persistence
- Node modules excluded (kept in container)

### Production
- Only models directory mounted (optional)
- Source code baked into image

## Health Checks

The backend includes a health check endpoint:
- Endpoint: `/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Start period: 40 seconds (allows model loading)

## Notes

- **Models**: The models directory should contain trained models before building/running
- **EZKL**: EZKL artifacts may need to be generated separately (requires Rust/Cargo)
- **Contracts**: Contract addresses need to be set after deployment
- **Environment Variables**: Vite requires env vars at build time, not runtime


# Frontend Dockerfile - React Application
# Multi-stage build for optimization

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables (Vite requires these at build time)
ARG VITE_API_URL=http://localhost:8000
ARG VITE_VERIFIER_ADDRESS=
ARG VITE_PRIVATE_CREDIT_LENDING_ADDRESS=
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

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional, for SPA routing)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


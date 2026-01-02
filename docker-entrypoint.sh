#!/bin/bash
set -e

# Create supervisor log directory
mkdir -p /var/log/supervisor

# Create nginx log directory
mkdir -p /var/log/nginx

# Ensure nginx configuration is correct
ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Execute the main command (supervisord)
exec "$@"


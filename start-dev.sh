#!/bin/bash
# Concurrent development server startup script
# Starts both the React client and FastAPI backend simultaneously

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLIENT_DIR="$SCRIPT_DIR/client"
ZKML_DIR="$SCRIPT_DIR/zkml"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Client & Model Concurrently${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 not found${NC}"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node not found${NC}"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm not found${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $CLIENT_PID $API_PID 2>/dev/null || true
    wait $CLIENT_PID $API_PID 2>/dev/null || true
    echo -e "${GREEN}Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Start FastAPI backend
echo -e "${BLUE}[1/2] Starting FastAPI backend on port 8000...${NC}"
cd "$ZKML_DIR"
python3 -m api.main &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Check if API started successfully
if ! kill -0 $API_PID 2>/dev/null; then
    echo -e "${RED}Error: Failed to start API server${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API server started (PID: $API_PID)${NC}"
echo ""

# Start React client
echo -e "${BLUE}[2/2] Starting React client on port 8080...${NC}"
cd "$CLIENT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing client dependencies...${NC}"
    npm install
fi

npm run dev &
CLIENT_PID=$!

# Wait a moment for client to start
sleep 2

# Check if client started successfully
if ! kill -0 $CLIENT_PID 2>/dev/null; then
    echo -e "${RED}Error: Failed to start client server${NC}"
    kill $API_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ Client server started (PID: $CLIENT_PID)${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Both servers are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:8080"
echo -e "${BLUE}Backend API:${NC} http://localhost:8000"
echo -e "${BLUE}API Health:${NC} http://localhost:8000/health"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $CLIENT_PID $API_PID


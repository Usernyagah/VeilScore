#!/bin/bash
# End-to-End Test Runner Script
# Runs all E2E tests with proper setup and teardown

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VeilScore End-to-End Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if services are running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running"
        return 1
    fi
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Python found"

# Check pytest
if ! python3 -m pytest --version &> /dev/null; then
    echo -e "${YELLOW}Warning: pytest not found. Installing...${NC}"
    pip install pytest requests
fi
echo -e "${GREEN}✓${NC} pytest available"

# Check services
echo ""
echo -e "${BLUE}Checking services...${NC}"
API_AVAILABLE=false
FRONTEND_AVAILABLE=false

if check_service "http://localhost:8000/health" "Backend API"; then
    API_AVAILABLE=true
fi

if check_service "http://localhost:8080" "Frontend"; then
    FRONTEND_AVAILABLE=true
fi

echo ""

# Warn if services not available
if [ "$API_AVAILABLE" = false ] || [ "$FRONTEND_AVAILABLE" = false ]; then
    echo -e "${YELLOW}Warning: Some services are not running${NC}"
    echo "Start services with:"
    echo "  docker compose up -d"
    echo "  or"
    echo "  ./start-dev.sh"
    echo ""
    echo "Tests will skip if services are unavailable"
    echo ""
fi

# Run tests
echo -e "${BLUE}Running E2E tests...${NC}"
echo ""

cd "$PROJECT_ROOT"

# Run pytest with appropriate markers
python3 -m pytest tests/e2e/ \
    -v \
    --tb=short \
    --color=yes \
    -m "e2e" \
    "$@"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All E2E tests passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some tests failed${NC}"
    echo -e "${RED}========================================${NC}"
fi

exit $EXIT_CODE


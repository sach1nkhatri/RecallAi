#!/bin/bash

# Test runner script for Recall AI
# Runs all tests across Python backend, Node backend, and React frontend

echo "🧪 Running Recall AI Test Suite"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PYTHON_PASSED=false
NODE_PASSED=false
REACT_PASSED=false

# 1. Python Backend Tests
echo -e "\n${YELLOW}1. Running Python Backend Tests...${NC}"
cd backend
if python -m pytest tests/ -v --tb=short; then
    echo -e "${GREEN}✅ Python backend tests passed${NC}"
    PYTHON_PASSED=true
else
    echo -e "${RED}❌ Python backend tests failed${NC}"
fi
cd ..

# 2. Node.js Backend Tests
echo -e "\n${YELLOW}2. Running Node.js Backend Tests...${NC}"
cd node_backend
if npm test -- --passWithNoTests; then
    echo -e "${GREEN}✅ Node.js backend tests passed${NC}"
    NODE_PASSED=true
else
    echo -e "${RED}❌ Node.js backend tests failed${NC}"
fi
cd ..

# 3. React Frontend Tests
echo -e "\n${YELLOW}3. Running React Frontend Tests...${NC}"
if npm test -- --watchAll=false --passWithNoTests; then
    echo -e "${GREEN}✅ React frontend tests passed${NC}"
    REACT_PASSED=true
else
    echo -e "${RED}❌ React frontend tests failed${NC}"
fi

# Summary
echo -e "\n${YELLOW}================================"
echo "Test Summary"
echo "================================"
echo -e "${NC}Python Backend: $([ "$PYTHON_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo -e "Node.js Backend: $([ "$NODE_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo -e "React Frontend: $([ "$REACT_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"

if [ "$PYTHON_PASSED" = true ] && [ "$NODE_PASSED" = true ] && [ "$REACT_PASSED" = true ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed${NC}"
    exit 1
fi


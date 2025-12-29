# Testing Guide for Recall AI

This document describes the testing setup and how to run tests for all components of the Recall AI application.

## Test Structure

```
backend/
├── tests/
│   ├── unit/              # Unit tests
│   │   ├── test_bot_service.py
│   │   ├── test_embedder.py
│   │   └── ...
│   ├── integration/       # Integration tests
│   │   ├── test_bot_routes.py
│   │   ├── test_repo_routes.py
│   │   └── ...
│   └── conftest.py        # Pytest fixtures

node_backend/
├── tests/
│   ├── unit/              # Unit tests
│   │   └── auth.test.js
│   └── integration/       # Integration tests
│       ├── auth.test.js
│       ├── user.test.js
│       ├── payment.test.js
│       └── admin.test.js

src/
├── __tests__/
│   ├── components/        # Component tests
│   ├── features/          # Feature tests
│   └── integration/       # Integration tests
```

## Running Tests

### Python Backend Tests

```bash
cd backend

# Install test dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/unit/test_bot_service.py

# Run with markers
pytest -m unit
pytest -m integration
```

### Node.js Backend Tests

```bash
cd node_backend

# Install dependencies (includes test deps)
npm install

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm test -- --coverage
```

### React Frontend Tests

```bash
# From project root
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- Button.test.jsx
```

## Test Coverage

### Backend (Python)
- ✅ Bot Service (CRUD operations)
- ✅ Embedder (auto-detection, embedding)
- ✅ RAG Engine (chunking, indexing, search)
- ✅ API Routes (bot, repo, upload)

### Node.js Backend
- ✅ Authentication (login, register, JWT)
- ✅ User Management (usage, plans)
- ✅ Payment Processing
- ✅ Admin Functions
- ✅ Middleware (auth, admin)

### Frontend (React)
- ✅ Components (Button, Input, Card)
- ✅ Authentication Flow
- ✅ Code to Doc Hook
- ✅ Integration Tests

## Writing New Tests

### Python Backend

```python
# tests/unit/test_new_feature.py
import pytest
from src.application.services.new_service import NewService

class TestNewService:
    def test_feature(self):
        service = NewService()
        result = service.do_something()
        assert result == expected
```

### Node.js Backend

```javascript
// tests/unit/newFeature.test.js
describe('New Feature', () => {
  test('should do something', () => {
    const result = doSomething();
    expect(result).toBe(expected);
  });
});
```

### React Frontend

```jsx
// src/__tests__/components/NewComponent.test.jsx
import { render, screen } from '@testing-library/react';
import NewComponent from '../../components/NewComponent';

test('renders component', () => {
  render(<NewComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Continuous Integration

Tests should be run in CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Python tests
  run: |
    cd backend
    pytest --cov

- name: Run Node tests
  run: |
    cd node_backend
    npm test

- name: Run React tests
  run: npm test -- --coverage --watchAll=false
```

## Test Data

- Use fixtures for consistent test data
- Clean up test data after each test
- Use test database for integration tests
- Mock external services (LM Studio, MongoDB)

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Mocking**: Mock external dependencies
4. **Coverage**: Aim for >80% code coverage
5. **Naming**: Use descriptive test names
6. **AAA Pattern**: Arrange, Act, Assert


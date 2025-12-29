# PowerShell test runner script for Recall AI
# Runs all tests across Python backend, Node backend, and React frontend

Write-Host "🧪 Running Recall AI Test Suite" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$pythonPassed = $false
$nodePassed = $false
$reactPassed = $false

# 1. Python Backend Tests
Write-Host "`n1. Running Python Backend Tests..." -ForegroundColor Yellow
Set-Location backend
try {
    python -m pytest tests/ -v --tb=short
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Python backend tests passed" -ForegroundColor Green
        $pythonPassed = $true
    } else {
        Write-Host "❌ Python backend tests failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Python backend tests failed: $_" -ForegroundColor Red
}
Set-Location ..

# 2. Node.js Backend Tests
Write-Host "`n2. Running Node.js Backend Tests..." -ForegroundColor Yellow
Set-Location node_backend
try {
    npm test -- --passWithNoTests
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js backend tests passed" -ForegroundColor Green
        $nodePassed = $true
    } else {
        Write-Host "❌ Node.js backend tests failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Node.js backend tests failed: $_" -ForegroundColor Red
}
Set-Location ..

# 3. React Frontend Tests
Write-Host "`n3. Running React Frontend Tests..." -ForegroundColor Yellow
try {
    npm test -- --watchAll=false --passWithNoTests
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ React frontend tests passed" -ForegroundColor Green
        $reactPassed = $true
    } else {
        Write-Host "❌ React frontend tests failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ React frontend tests failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n================================" -ForegroundColor Yellow
Write-Host "Test Summary" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
if ($pythonPassed) {
    Write-Host "Python Backend: ✅ PASSED" -ForegroundColor Green
} else {
    Write-Host "Python Backend: ❌ FAILED" -ForegroundColor Red
}
if ($nodePassed) {
    Write-Host "Node.js Backend: ✅ PASSED" -ForegroundColor Green
} else {
    Write-Host "Node.js Backend: ❌ FAILED" -ForegroundColor Red
}
if ($reactPassed) {
    Write-Host "React Frontend: ✅ PASSED" -ForegroundColor Green
} else {
    Write-Host "React Frontend: ❌ FAILED" -ForegroundColor Red
}

if ($pythonPassed -and $nodePassed -and $reactPassed) {
    Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some tests failed" -ForegroundColor Red
    exit 1
}


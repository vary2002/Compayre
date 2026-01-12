# Start both backend and frontend servers for development
# Run from the Compayre root directory

Write-Host ""
Write-Host "===================================="
Write-Host "  Compayre Development Server Starter"
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "ERROR: backend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the Compayre root directory"
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-Host "ERROR: frontend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the Compayre root directory"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Write-Host "========================="
Write-Host ""

# Start backend in new PowerShell window
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd 'backend'; python manage.py runserver"

# Wait for backend to start
Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Write-Host "========================="
Write-Host ""

# Start frontend in new PowerShell window
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev"

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Servers Starting..." 
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin Panel: http://localhost:3000/admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "Both servers are now running in separate windows"
Write-Host ""

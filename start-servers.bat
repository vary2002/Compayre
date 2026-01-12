@echo off
REM Start both backend and frontend servers for development

echo.
echo ====================================
echo  Compayre Development Server Starter
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: backend folder not found!
    echo Please run this script from the Compayre root directory
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: frontend folder not found!
    echo Please run this script from the Compayre root directory
    pause
    exit /b 1
)

echo Starting Backend Server...
echo ========================
cd backend
start cmd /k "python manage.py runserver"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

echo.
echo Starting Frontend Server...
echo ========================
cd ..\frontend
start cmd /k "npm run dev"

echo.
echo ====================================
echo Servers Starting...
echo ====================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Admin Panel: http://localhost:3000/admin
echo.
echo Press any key to close this window
echo (Backend and Frontend will continue running)
echo.
pause

# Compayre - Local Development Setup

This guide covers setting up the project for **local development without Docker**.

## Prerequisites

- **Python 3.11** (Required for Django 4.2.7)
- **Node.js 18+** and npm
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Compayre
```

### 2. Backend Setup (Django)

```bash
# Create Python 3.11 virtual environment
py -3.11 -m venv env

# Activate virtual environment
.\env\Scripts\Activate.ps1

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Navigate to backend folder
cd backend

# Run migrations
python manage.py migrate

# Create superuser (for admin access)
python manage.py createsuperuser

# Start Django development server
python manage.py runserver
```

Backend will run at: **http://localhost:8000**

Admin panel: **http://localhost:8000/admin**

### 3. Frontend Setup (Next.js)

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Frontend will run at: **http://localhost:3000**

## Environment Configuration

### Backend (.env)

The backend uses SQLite for local development. Configuration in `backend/.env`:

```env
DB_ENGINE=django.db.backends.sqlite3
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend (.env)

Frontend configuration in `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NODE_ENV=development
```

## Project Structure

```
Compayre/
├── backend/           # Django REST API
│   ├── api/          # Main API app
│   ├── config/       # Django settings
│   ├── manage.py     # Django management script
│   └── db.sqlite3    # SQLite database (local dev)
├── frontend/         # Next.js frontend
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── package.json  # Node dependencies
├── env/              # Python virtual environment
├── docker-compose.yml # Docker config (production only)
└── requirements.txt  # Python dependencies
```

## Development Workflow

1. **Start Backend**: Activate venv, run `python manage.py runserver` from `backend/`
2. **Start Frontend**: Run `npm run dev` from `frontend/`
3. **Access App**: Open http://localhost:3000
4. **Admin Panel**: Access http://localhost:8000/admin

## Common Commands

### Backend

```bash
# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test
```

### Frontend

```bash
# Install new packages
npm install <package-name>

# Build for production
npm run build

# Lint code
npm run lint
```

## Troubleshooting

### Python Version Issues

Ensure you're using Python 3.11:
```bash
python --version  # Should show Python 3.11.x
```

If wrong version, recreate virtual environment:
```bash
Remove-Item -Recurse -Force env
py -3.11 -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

### API Connection Issues

- Verify backend is running at http://localhost:8000
- Check `frontend/.env` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
- Restart both servers after .env changes

### CORS Errors

Ensure backend `.env` includes:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Docker (Production Only)

Docker configuration is available for production deployment:

```bash
docker-compose up
```

**Note**: For local development, always run backend and frontend separately as described above.

## Tech Stack

- **Backend**: Django 4.2.7, Django REST Framework, SQLite (dev)
- **Frontend**: Next.js, React, TailwindCSS
- **Authentication**: JWT (djangorestframework-simplejwt)

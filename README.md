# Boekeninventarisatie Systeem

Een full-stack webapplicatie voor het digitaliseren van fysieke boekeninventaris met behulp van Google Gemini OCR.

## Features

- **Web-based Interface**: Upload foto's van boekenstapels via een moderne React frontend
- **AI-powered OCR**: Gebruikt Google Gemini API voor het herkennen van boektitels en auteurs
- **Database Storage**: SQLite database voor het opslaan van inventarisgegevens
- **Railway Deployment**: Volledig geconfigureerd voor deployment op Railway

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Python + FastAPI
- **Database**: SQLite
- **AI**: Google Gemini API
- **Deployment**: Railway

## Project Structuur

```
/
├── frontend/          # React applicatie
├── backend/           # FastAPI applicatie
├── database.db        # SQLite database
├── requirements.txt   # Python dependencies
├── package.json       # Node.js dependencies
└── railway.json       # Railway deployment config
```

## Setup

### Snelle Start (Automatisch)

```bash
# Setup alles automatisch
python setup_dev.py
```

### Handmatige Setup

1. **Backend Setup**:
   ```bash
   pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Environment Variables**:
   - `GOOGLE_API_KEY`: Je Google Gemini API key

### Railway Deployment

1. **Voorbereiding**:
   ```bash
   python deploy.py
   ```

2. **Deploy naar Railway**:
   - Push naar GitHub
   - Connect repository aan Railway
   - Set de `GOOGLE_API_KEY` environment variable
   - Deploy automatisch!

3. **Environment Variables op Railway**:
   - `GOOGLE_API_KEY`: Je Google Gemini API key

## API Endpoints

- `POST /api/process-stack`: Verwerk een foto van een boekenstapel
- `GET /api/books`: Haal alle boeken op uit de database

## Database Schema

```sql
CREATE TABLE books (
    id INTEGER PRIMARY KEY,
    titel TEXT,
    auteur TEXT,
    rij INTEGER,
    kolom TEXT,
    locatie TEXT,
    stapel TEXT,
    positie_op_stapel INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
``` 
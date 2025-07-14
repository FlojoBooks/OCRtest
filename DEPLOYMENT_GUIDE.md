# 🚀 Deployment Guide - Boekeninventarisatie Systeem

## Overzicht

Je hebt nu een volledige full-stack webapplicatie die je lokale Python scripts vervangt! De applicatie bestaat uit:

- **Backend**: FastAPI met Google Gemini OCR
- **Frontend**: React met moderne UI
- **Database**: SQLite voor persistentie
- **Deployment**: Railway-ready configuratie

## 📋 Project Structuur

```
OCRtest/
├── backend/
│   └── main.py              # FastAPI applicatie
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # React hoofdcomponent
│   │   ├── App.css          # Styling
│   │   ├── index.css        # Global styles
│   │   └── main.jsx         # React entry point
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.js       # Vite configuratie
│   └── index.html           # HTML template
├── requirements.txt          # Python dependencies
├── railway.json             # Railway deployment config
├── Procfile                 # Railway start command
├── setup_dev.py             # Lokale setup script
├── deploy.py                # Deployment script
├── test_app.py              # Test script
└── README.md                # Project documentatie
```

## 🛠️ Lokale Ontwikkeling

### 1. Snelle Setup
```bash
# Setup alles automatisch
python setup_dev.py
```

### 2. Handmatige Setup
```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Start Applicatie
```bash
# Terminal 1: Start backend
python -m uvicorn backend.main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 4. Test Applicatie
```bash
# Test API endpoints
python test_app.py

# Open browser
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
```

## 🌐 Railway Deployment

### 1. Voorbereiding
```bash
# Build frontend en bereid deployment voor
python deploy.py
```

### 2. GitHub Setup
```bash
# Initialiseer git repository
git init
git add .
git commit -m "Initial commit: Boekeninventarisatie webapp"

# Push naar GitHub
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### 3. Railway Setup
1. Ga naar [Railway.app](https://railway.app)
2. Log in met je GitHub account
3. Klik "New Project" → "Deploy from GitHub repo"
4. Selecteer je repository
5. Railway detecteert automatisch de Python configuratie

### 4. Environment Variables
In Railway dashboard:
1. Ga naar je project
2. Klik op "Variables" tab
3. Voeg toe: `GOOGLE_API_KEY` = `jouw_gemini_api_key`

### 5. Deploy
Railway deployt automatisch bij elke push naar GitHub!

## 🔧 API Endpoints

### POST /api/process-stack
Verwerk een foto van een boekenstapel.

**Request:**
- `image`: UploadFile (afbeelding)
- `rij`: int (1-10)
- `kolom`: str (A-Z)
- `stapel`: str ("voor" of "achter")

**Response:**
```json
{
  "success": true,
  "message": "5 boeken succesvol toegevoegd",
  "books": [...]
}
```

### GET /api/books
Haal alle boeken op uit de database.

**Response:**
```json
[
  {
    "id": 1,
    "titel": "De Feel Good Factor",
    "auteur": "Esther Sluijs",
    "rij": 1,
    "kolom": "A",
    "locatie": "1A",
    "stapel": "voor",
    "positie_op_stapel": 1,
    "timestamp": "2024-01-15T10:30:00"
  }
]
```

## 🗄️ Database Schema

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

## 🔍 Troubleshooting

### Backend Start Problemen
```bash
# Check Python dependencies
pip install -r requirements.txt

# Check GOOGLE_API_KEY
echo $GOOGLE_API_KEY

# Start met debug info
python -m uvicorn backend.main:app --reload --log-level debug
```

### Frontend Build Problemen
```bash
# Clean install
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Railway Deployment Problemen
1. Check Railway logs in dashboard
2. Verify environment variables
3. Ensure all files are committed to GitHub
4. Check `railway.json` and `Procfile` syntax

## 🎯 Volgende Stappen

1. **Test de applicatie** met echte foto's
2. **Customize de UI** naar jouw voorkeuren
3. **Voeg features toe** zoals:
   - Export naar CSV/Excel
   - Zoekfunctionaliteit
   - Boekdetails pagina
   - Bulk upload
4. **Monitor gebruik** via Railway analytics
5. **Backup database** regelmatig

## 📞 Support

Voor vragen of problemen:
1. Check de Railway logs
2. Test lokaal eerst
3. Review de API responses
4. Check de browser console voor frontend errors

---

**🎉 Gefeliciteerd! Je hebt succesvol je lokale scripts omgezet naar een professionele webapplicatie!** 
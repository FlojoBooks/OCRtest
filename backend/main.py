import os
import sqlite3
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import google.generativeai as genai
from PIL import Image
import io
import os

# Configureer de Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI(title="Boekeninventarisatie API", version="1.0.0")

# CORS middleware voor frontend communicatie
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In productie, specificeer je frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY,
            titel TEXT,
            auteur TEXT,
            rij INTEGER,
            kolom TEXT,
            locatie TEXT,
            stapel TEXT,
            positie_op_stapel INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Pydantic models
class Book(BaseModel):
    id: Optional[int] = None
    titel: str
    auteur: str
    rij: int
    kolom: str
    locatie: str
    stapel: str
    positie_op_stapel: int
    timestamp: Optional[str] = None

class ProcessStackResponse(BaseModel):
    success: bool
    message: str
    books: List[Book]

@app.on_event("startup")
async def startup_event():
    init_db()
    
    # Mount static files als ze bestaan
    static_dir = "static"
    if os.path.exists(static_dir):
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

@app.get("/")
async def root():
    # Serve de React app als static files bestaan, anders API info
    static_dir = "static"
    if os.path.exists(static_dir) and os.path.exists(os.path.join(static_dir, "index.html")):
        return FileResponse(os.path.join(static_dir, "index.html"))
    else:
        return {"message": "Boekeninventarisatie API is actief"}

@app.post("/api/process-stack", response_model=ProcessStackResponse)
async def process_stack(
    image: UploadFile = File(...),
    rij: int = Form(...),
    kolom: str = Form(...),
    stapel: str = Form(...)
):
    """
    Verwerk een foto van een boekenstapel en voeg de herkende boeken toe aan de database.
    """
    try:
        # Valideer input
        if stapel not in ["voor", "achter"]:
            raise HTTPException(status_code=400, detail="Stapel moet 'voor' of 'achter' zijn")
        
        if not (1 <= rij <= 10):
            raise HTTPException(status_code=400, detail="Rij moet tussen 1 en 10 zijn")
        
        if not kolom.isalpha() or len(kolom) > 2:
            raise HTTPException(status_code=400, detail="Kolom moet 1-2 letters zijn")

        # Lees de afbeelding
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data))
        
        # Gemini prompt
        prompt = """
        Analyseer de bijgevoegde afbeelding van een stapel boeken. 
        Identificeer ALLE boeken die je kunt lezen, van boven naar beneden. 
        Retourneer elk boek als een aparte regel met dit formaat: "Titel";"Auteur". 
        Gebruik "N/A" als een veld onbekend is. 
        Geef alleen deze regels terug.
        """
        
        # Stuur naar Gemini API
        response = model.generate_content([prompt, img])
        raw_data = response.text.strip()
        
        if not raw_data:
            return ProcessStackResponse(
                success=False,
                message="Geen boeken herkend in de afbeelding",
                books=[]
            )
        
        # Parse de response
        books = []
        lines = [line.strip() for line in raw_data.split('\n') if line.strip()]
        
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        for position, line in enumerate(lines, 1):
            try:
                # Parse CSV-formaat: "Titel";"Auteur"
                parts = line.split(';')
                if len(parts) >= 2:
                    titel = parts[0].strip().replace('"', '')
                    auteur = parts[1].strip().replace('"', '')
                else:
                    titel = line.strip().replace('"', '')
                    auteur = "N/A"
                
                # Voeg toe aan database
                cursor.execute('''
                    INSERT INTO books (titel, auteur, rij, kolom, locatie, stapel, positie_op_stapel)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (titel, auteur, rij, kolom, f"{rij}{kolom}", stapel, position))
                
                # Haal het nieuwe record op
                cursor.execute('SELECT * FROM books WHERE id = last_insert_rowid()')
                book_data = cursor.fetchone()
                
                books.append(Book(
                    id=book_data[0],
                    titel=book_data[1],
                    auteur=book_data[2],
                    rij=book_data[3],
                    kolom=book_data[4],
                    locatie=book_data[5],
                    stapel=book_data[6],
                    positie_op_stapel=book_data[7],
                    timestamp=book_data[8]
                ))
                
            except Exception as e:
                print(f"Fout bij verwerken van regel {position}: {e}")
                continue
        
        conn.commit()
        conn.close()
        
        return ProcessStackResponse(
            success=True,
            message=f"{len(books)} boeken succesvol toegevoegd aan de database",
            books=books
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fout bij verwerken: {str(e)}")

@app.get("/api/books", response_model=List[Book])
async def get_books():
    """
    Haal alle boeken op uit de database.
    """
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM books ORDER BY rij, kolom, stapel, positie_op_stapel')
        rows = cursor.fetchall()
        conn.close()
        
        books = []
        for row in rows:
            books.append(Book(
                id=row[0],
                titel=row[1],
                auteur=row[2],
                rij=row[3],
                kolom=row[4],
                locatie=row[5],
                stapel=row[6],
                positie_op_stapel=row[7],
                timestamp=row[8]
            ))
        
        return books
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fout bij ophalen boeken: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
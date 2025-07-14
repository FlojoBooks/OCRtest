import os
import google.generativeai as genai
from PIL import Image
import time
import csv # Importeer de csv module

# --- CONFIGURATIE ---
GOOGLE_API_KEY = "AIzaSyBfdqUl4zurX9eaj7NrqZiw0ACT9_0aH4k"
if not GOOGLE_API_KEY:
    raise ValueError("Fout: De GOOGLE_API_KEY omgevingsvariabele is niet ingesteld.")

FOTO_MAP = 'boeken_fotos'
OUTPUT_CSV_FILE = 'boeken_database.csv'

PROMPT_TEMPLATE = """
Analyseer de bijgevoegde afbeelding van boekenruggen. 

Voor elk herkenbaar boek, extraheer de volgende informatie:
- Titel
- Auteur(s)
- Uitgever

Retourneer de informatie als een enkele tekst in CSV-formaat.
Gebruik voor elk boek een aparte regel, waarbij de velden worden gescheiden door een puntkomma (`;`).
Gebruik het volgende formaat:
"Titel";"Auteur(s)";"Uitgever"
Als een veld niet herkenbaar is, vul dan "N/A" in.
Maak de CSV-tekst zo compact en leesbaar mogelijk.  Geef alleen de CSV data terug, zonder extra uitleg.
"""
# --- EINDE CONFIGURATIE ---

# Configureer de Gemini API
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Open het CSV-bestand om te schrijven
with open(OUTPUT_CSV_FILE, 'w', newline='', encoding='utf-8') as f:  # Gebruik newline='' voor consistentie
    writer = csv.writer(f, delimiter=';') # Maak een CSV writer object
    writer.writerow(["Titel", "Auteur", "Uitgever", "Bronbestand"]) # Schrijf de header-rij

    print(f"Start verwerking van foto's in map: '{FOTO_MAP}'...")

    # Loop door alle bestanden in de opgegeven map
    for filename in os.listdir(FOTO_MAP):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            filepath = os.path.join(FOTO_MAP, filename)
            print(f"  - Verwerken: {filename}...")

            try:
                img = Image.open(filepath)
                response = model.generate_content([PROMPT_TEMPLATE, img])
                ruwe_data = response.text.strip()

                # Soms retourneert Gemini helemaal geen output. Dit voorkomt fouten.
                if not ruwe_data:
                    print(f"    - Geen data terug van Gemini.")
                    writer.writerow(["N/A", "N/A", "N/A", filename])
                    continue

                # Splits de ruwe data in regels, en filter lege regels
                csv_regels = [regel.strip() for regel in ruwe_data.split('\n') if regel.strip()]

                # Schrijf de CSV-regels weg
                for regel in csv_regels:
                    try:
                        # Probeert de regel als CSV te parsen
                        row = [veld.strip().replace('"', '') for veld in regel.split(';')] # Verwijder aanhalingstekens

                        # Zorg dat er altijd 4 kolommen zijn (Titel, Auteur, Uitgever, Bronbestand)
                        while len(row) < 3:
                            row.append("N/A")
                        row.append(filename) # voeg bestandsnaam toe
                        writer.writerow(row)

                    except Exception as csv_e:
                        print(f"    - Fout bij het parsen van CSV-regel: '{regel}'. Fout: {csv_e}")
                        writer.writerow(["CSV_ERROR", "CSV_ERROR", "CSV_ERROR", filename]) # registreer fouten

                time.sleep(1)

            except Exception as e:
                print(f"    - Fout bij verwerken van {filename}: {e}")
                writer.writerow(["ERROR", "ERROR", "ERROR", filename]) # registreer fouten

print(f"\nKlaar! De database is opgeslagen in: '{OUTPUT_CSV_FILE}'")
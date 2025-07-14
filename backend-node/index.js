import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import csvParser from 'csv-parser';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');

// CORS
app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure sessions dir exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR);
}

// Helper: make session CSV path
function getSessionCsvPath(sessionId) {
  return path.join(SESSIONS_DIR, `session-${sessionId}.csv`);
}

// Helper: ensure CSV file exists with header
function ensureSessionCsv(sessionId) {
  const csvPath = getSessionCsvPath(sessionId);
  if (!fs.existsSync(csvPath)) {
    const header = 'titel;auteur;rij;kolom;locatie;stapel;positie_op_stapel;timestamp\n';
    fs.writeFileSync(csvPath, header, 'utf8');
  }
}

// List all sessions
app.get('/api/sessions', (req, res) => {
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.csv'));
  const sessions = files.map(f => {
    const sessionId = f.replace(/^session-|\.csv$/g, '');
    const stats = fs.statSync(path.join(SESSIONS_DIR, f));
    return { sessionId, filename: f, created: stats.birthtime };
  });
  res.json(sessions);
});

// Create a new session
app.post('/api/sessions', (req, res) => {
  let { name } = req.body;
  if (!name) {
    // Default: timestamp
    name = new Date().toISOString().replace(/[:.]/g, '-');
  }
  // Make unique
  let sessionId = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  let i = 1;
  while (fs.existsSync(getSessionCsvPath(sessionId))) {
    sessionId = `${sessionId}_${i++}`;
  }
  ensureSessionCsv(sessionId);
  res.json({ sessionId });
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Boekeninventarisatie Node.js API actief (sessies)' });
});

// POST /api/process-stack (now requires sessionId)
app.post('/api/process-stack', upload.single('image'), async (req, res) => {
  try {
    const { rij, kolom, stapel, sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'Geen sessie opgegeven.' });
    ensureSessionCsv(sessionId);
    if (!req.file) return res.status(400).json({ success: false, message: 'Geen afbeelding geüpload.' });
    if (!rij || !kolom || !stapel) return res.status(400).json({ success: false, message: 'Ontbrekende locatiegegevens.' });
    if (!['voor', 'achter'].includes(stapel)) return res.status(400).json({ success: false, message: 'Stapel moet "voor" of "achter" zijn.' });

    // Lees afbeelding als buffer
    const imageBuffer = fs.readFileSync(req.file.path);

    // Gemini API call (REST, multipart)
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: 'GOOGLE_API_KEY niet ingesteld.' });

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
    const prompt = `Analyseer de bijgevoegde afbeelding van een stapel boeken.\nIdentificeer ALLE boeken die je kunt lezen, van boven naar beneden.\nRetourneer elk boek als een aparte regel met dit formaat: "Titel";"Auteur". Gebruik "N/A" als een veld onbekend is. Geef alleen deze regels terug.`;

    const imageBase64 = imageBuffer.toString('base64');
    const geminiRequest = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: imageBase64
              }
            }
          ]
        }
      ]
    };

    // Call Gemini API
    let geminiResponse;
    try {
      const geminiRes = await axios.post(geminiUrl, geminiRequest);
      geminiResponse = geminiRes.data;
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Fout bij Gemini API', error: err.response?.data || err.message });
    }

    // Parse Gemini response
    const text = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      fs.unlinkSync(req.file.path);
      return res.json({ success: false, message: 'Geen boeken herkend in de afbeelding', books: [] });
    }
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const books = [];
    const now = new Date().toISOString();
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(';');
      const titel = parts[0]?.replace(/"/g, '').trim() || 'N/A';
      const auteur = parts[1]?.replace(/"/g, '').trim() || 'N/A';
      const locatie = `${rij}${kolom}`;
      const positie_op_stapel = i + 1;
      books.push({
        titel,
        auteur,
        rij: Number(rij),
        kolom,
        locatie,
        stapel,
        positie_op_stapel,
        timestamp: now
      });
    }

    // Append to session CSV
    const csvWriter = createObjectCsvWriter({
      path: getSessionCsvPath(sessionId),
      header: [
        { id: 'titel', title: 'titel' },
        { id: 'auteur', title: 'auteur' },
        { id: 'rij', title: 'rij' },
        { id: 'kolom', title: 'kolom' },
        { id: 'locatie', title: 'locatie' },
        { id: 'stapel', title: 'stapel' },
        { id: 'positie_op_stapel', title: 'positie_op_stapel' },
        { id: 'timestamp', title: 'timestamp' }
      ],
      append: true,
      fieldDelimiter: ';'
    });
    await csvWriter.writeRecords(books);

    // Verwijder tijdelijke upload
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: `${books.length} boeken succesvol toegevoegd aan sessie`, books });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fout bij verwerken', error: err.message });
  }
});

// GET /api/books?sessionId=...
app.get('/api/books', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, message: 'Geen sessie opgegeven.' });
  ensureSessionCsv(sessionId);
  const csvPath = getSessionCsvPath(sessionId);
  const results = [];
  fs.createReadStream(csvPath)
    .pipe(csvParser({ separator: ';' }))
    .on('data', (data) => {
      data.rij = Number(data.rij);
      data.positie_op_stapel = Number(data.positie_op_stapel);
      results.push(data);
    })
    .on('end', () => {
      const filtered = results.filter(row => row.titel && row.titel !== 'titel');
      res.json(filtered);
    })
    .on('error', (err) => {
      res.status(500).json({ success: false, message: 'Fout bij lezen van CSV', error: err.message });
    });
});

// Download CSV endpoint per sessie
app.get('/api/download-csv', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, message: 'Geen sessie opgegeven.' });
  ensureSessionCsv(sessionId);
  res.download(getSessionCsvPath(sessionId), `boeken_${sessionId}.csv`);
});

// Serve static files from the frontend build
const FRONTEND_BUILD = path.join(process.cwd(), 'build');
app.use(express.static(FRONTEND_BUILD));

// Catch-all: serve index.html for React Router (after API routes)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_BUILD, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Boekeninventarisatie Node.js backend draait op http://localhost:${PORT} (sessies)`);
  console.log("[DEBUG] Starting server. PORT:", process.env.PORT, "GOOGLE_API_KEY set:", !!process.env.GOOGLE_API_KEY);
}); 
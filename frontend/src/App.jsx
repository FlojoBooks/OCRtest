import React, { useRef, useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function getColumnLetters(start, count) {
  // Returns array like ['A', 'B', ...] for count columns
  return Array.from({ length: count }, (_, i) => String.fromCharCode('A'.charCodeAt(0) + i));
}

function App() {
  // Session state
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [newSessionName, setNewSessionName] = useState('')
  
  const [formData, setFormData] = useState({
    rij: '',
    kolom: '',
    stapel: 'voor',
    image: null
  })
  
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [message, setMessage] = useState('')
  const [processedBooks, setProcessedBooks] = useState([])
  const [allBooks, setAllBooks] = useState([])

  // Bulk upload state
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkRows, setBulkRows] = useState(6)
  const [bulkCols, setBulkCols] = useState(7)
  const [bulkColLetters, setBulkColLetters] = useState('A,B,C,D,E,F,G')
  const [bulkOrder, setBulkOrder] = useState(['voor', 'achter'])
  const [bulkLocations, setBulkLocations] = useState([])
  const [bulkIndex, setBulkIndex] = useState(0)

  // Add state for custom location prefix
  const [customPrefix, setCustomPrefix] = useState('')

  // Fetch sessions on mount
  useEffect(() => { fetchSessions() }, [])
  useEffect(() => { if (sessionId) fetchAllBooks() }, [sessionId])

  // Gebruik useEffect alleen om image preview te tonen, niet meer voor auto-upload
  useEffect(() => {
    // geen automatische upload meer
  }, [formData.image]);

  const fetchSessions = async () => {
    const res = await axios.get('/api/sessions')
    setSessions(res.data)
    if (!sessionId && res.data.length > 0) setSessionId(res.data[0].sessionId)
  }

  const createSession = async () => {
    const res = await axios.post('/api/sessions', { name: newSessionName })
    setSessionId(res.data.sessionId)
    setNewSessionName('')
    fetchSessions()
  }

  // Generate locations for bulk mode
  const generateBulkLocations = () => {
    const cols = bulkColLetters.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const locs = []
    for (let rij = 1; rij <= bulkRows; rij++) {
      for (let k = 0; k < cols.length; k++) {
        for (let stapel of bulkOrder) {
          locs.push({ rij, kolom: cols[k], stapel, prefix: customPrefix })
        }
      }
    }
    return locs
  }

  const startBulk = () => {
    const locs = generateBulkLocations()
    setBulkLocations(locs)
    setBulkIndex(0)
    setBulkMode(true)
    setFormData({ rij: locs[0].rij, kolom: locs[0].kolom, stapel: locs[0].stapel, image: null })
    setStatus('idle')
    setMessage('')
    setProcessedBooks([])
  }

  const nextBulk = () => {
    if (bulkIndex + 1 < bulkLocations.length) {
      const next = bulkLocations[bulkIndex + 1]
      setBulkIndex(bulkIndex + 1)
      setFormData({ rij: next.rij, kolom: next.kolom, stapel: next.stapel, image: null })
      setStatus('idle')
      setMessage('')
      setProcessedBooks([])
    } else {
      setBulkMode(false)
      setBulkLocations([])
      setBulkIndex(0)
      setFormData({ rij: '', kolom: '', stapel: 'voor', image: null })
      setStatus('success')
      setMessage('Bulk upload voltooid!')
    }
  }

  // Ga naar vorige locatie in bulkmodus
  const prevBulk = () => {
    if (bulkIndex > 0) {
      const prev = bulkLocations[bulkIndex - 1];
      setBulkIndex(bulkIndex - 1);
      setFormData({ rij: prev.rij, kolom: prev.kolom, stapel: prev.stapel, image: null });
      setStatus('idle');
      setMessage('');
      setProcessedBooks([]);
    }
  };

  const fetchAllBooks = async () => {
    if (!sessionId) return
    try {
      const response = await axios.get('/api/books', { params: { sessionId } })
      setAllBooks(response.data)
    } catch (error) {
      setAllBooks([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value, files } = e.target
    
    if (name === 'image') {
      setFormData(prev => ({
        ...prev,
        image: files[0]
      }))
    } else if (name === 'customPrefix') {
      setCustomPrefix(value)
      setFormData(prev => ({ ...prev, customPrefix: value }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleBulkInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'bulkRows') setBulkRows(Number(value))
    if (name === 'bulkCols') setBulkCols(Number(value))
    if (name === 'bulkColLetters') setBulkColLetters(value)
  }

  const handleBulkOrderChange = (e) => {
    const { value, checked } = e.target
    if (checked) {
      setBulkOrder(prev => [...prev, value])
    } else {
      setBulkOrder(prev => prev.filter(v => v !== value))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.image) {
      setStatus('error')
      setMessage('Selecteer eerst een afbeelding')
      return
    }

    if (!formData.rij || !formData.kolom) {
      setStatus('error')
      setMessage('Vul alle velden in')
      return
    }

    setStatus('loading')
    setMessage('Bezig met verwerken...')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('image', formData.image)
      formDataToSend.append('rij', formData.rij)
      formDataToSend.append('kolom', formData.kolom)
      formDataToSend.append('stapel', formData.stapel)
      formDataToSend.append('sessionId', sessionId)
      if (customPrefix) formDataToSend.append('customPrefix', customPrefix)

      const response = await axios.post('/api/process-stack', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        setStatus('success')
        setMessage(response.data.message)
        setProcessedBooks(response.data.books)
        
        // Reset form
        if (bulkMode) {
          setTimeout(() => nextBulk(), 800)
        } else {
          setFormData({
            rij: '',
            kolom: '',
            stapel: 'voor',
            image: null,
            customPrefix: ''
          })
        }
        
        // Refresh alle boeken
        fetchAllBooks()
      } else {
        setStatus('error')
        setMessage(response.data.message)
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.response?.data?.detail || 'Er is een fout opgetreden')
      console.error('Fout bij verwerken:', error)
    }
  }

  // Nieuwe functie voor auto-upload zonder submit event
  const handleSubmitAuto = async () => {
    if (!formData.image) return;
    if (!formData.rij || !formData.kolom) return;
    setStatus('loading');
    setMessage('Bezig met verwerken...');
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', formData.image);
      formDataToSend.append('rij', formData.rij);
      formDataToSend.append('kolom', formData.kolom);
      formDataToSend.append('stapel', formData.stapel);
      formDataToSend.append('sessionId', sessionId);
      if (customPrefix) formDataToSend.append('customPrefix', customPrefix);
      const response = await axios.post('/api/process-stack', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setProcessedBooks(response.data.books);
        fetchAllBooks();
        // geen automatische doorschakeling meer
      } else {
        setStatus('error');
        setMessage(response.data.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Er is een fout opgetreden');
      console.error('Fout bij verwerken:', error);
    }
  };

  const handleDownloadCSV = () => {
    if (!sessionId) return
    window.open(`/api/download-csv?sessionId=${sessionId}`, '_blank')
  }

  // Helper om boeken te groeperen per locatie+stapel
  function groupBooksByLocation(books) {
    const groups = {};
    for (const book of books) {
      const key = `${book.locatie}||${book.stapel}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(book);
    }
    return groups;
  }

  // Apple-like UI styles (inline for demo, move to App.css for real use)
  const appleCard = {
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '24px',
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
    padding: '2rem',
    maxWidth: 600,
    margin: '2rem auto',
    fontFamily: 'San Francisco, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
    color: '#222',
  }
  const appleButton = {
    background: 'linear-gradient(90deg,#f5f6fa,#e9ecef)',
    border: 'none',
    borderRadius: '12px',
    padding: '0.8rem 2rem',
    fontWeight: 600,
    fontSize: '1.1rem',
    color: '#222',
    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)',
    margin: '0.5rem 0',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
  const appleInput = {
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    padding: '0.7rem',
    fontSize: '1rem',
    marginBottom: '1rem',
    width: '100%',
    background: '#f8f9fa',
    color: '#111', // zwart
    '::placeholder': { color: '#222' },
  }

  // Add refs for file and camera inputs
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Camera open helper
  const openCamera = () => {
    cameraInputRef.current && cameraInputRef.current.click()
  }
  const openFilePicker = () => {
    fileInputRef.current && fileInputRef.current.click()
  }
  const clearImage = () => {
    setFormData(prev => ({ ...prev, image: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  return (
    <div style={{ background: 'linear-gradient(120deg,#f8fafc 0%,#e9ecef 100%)', minHeight: '100vh', padding: 0 }}>
      <div style={appleCard}>
        <h1 style={{ fontWeight: 700, fontSize: '2.2rem', marginBottom: '1.5rem', letterSpacing: '-1px' }}>📚 Boekeninventarisatie</h1>
        {/* Sessie management */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select style={appleInput} value={sessionId} onChange={e => setSessionId(e.target.value)}>
            {sessions.map(s => <option key={s.sessionId} value={s.sessionId}>Sessie: {s.sessionId}</option>)}
          </select>
          <input style={appleInput} placeholder="Nieuwe sessie naam" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} />
          <button style={appleButton} onClick={createSession}>Nieuwe sessie</button>
          <button style={appleButton} onClick={handleDownloadCSV}>Download CSV</button>
        </div>
        {/* Sessie overzicht */}
        <div style={{ marginBottom: '2rem', fontSize: '1rem', color: '#888' }}>
          <b>Sessies:</b> {sessions.map(s => s.sessionId).join(', ')}
        </div>
        {/* Bulkmodus toggle */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ fontWeight: 500 }}>
            <input type="checkbox" checked={bulkMode} onChange={e => setBulkMode(e.target.checked)} /> Bulkmodus
          </label>
        </div>
        {bulkMode ? (
          <div className="bulk-form">
            <div className="form-group">
              <label>Aantal rijen:</label>
              <input style={appleInput} type="number" name="bulkRows" min="1" max="20" value={bulkRows} onChange={handleBulkInputChange} />
            </div>
            <div className="form-group">
              <label>Aantal kolommen:</label>
              <input style={appleInput} type="number" name="bulkCols" min="1" max="26" value={bulkCols} onChange={handleBulkInputChange} />
            </div>
            <div className="form-group">
              <label>Kolomletters (gescheiden door komma):</label>
              <input style={appleInput} type="text" name="bulkColLetters" value={bulkColLetters} onChange={handleBulkInputChange} />
            </div>
            <div className="form-group">
              <label>Stapel volgorde:</label>
              <label><input type="checkbox" value="voor" checked={bulkOrder.includes('voor')} onChange={handleBulkOrderChange} /> Voor</label>
              <label><input type="checkbox" value="achter" checked={bulkOrder.includes('achter')} onChange={handleBulkOrderChange} /> Achter</label>
            </div>
            <button style={appleButton} onClick={startBulk} disabled={bulkLocations.length > 0}>Start bulk-upload</button>
            {bulkLocations.length > 0 && (
              <div style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span>
                  Upload voor locatie: {bulkLocations[bulkIndex]?.rij}{bulkLocations[bulkIndex]?.kolom}-{bulkLocations[bulkIndex]?.stapel.toUpperCase()}<br />
                  ({bulkIndex + 1} van {bulkLocations.length})
                </span>
                <button
                  type="button"
                  style={{ ...appleButton, background: '#e0f2f7', color: '#007bff', padding: '0.5rem 1.2rem', fontSize: '1rem', margin: 0 }}
                  onClick={prevBulk}
                  disabled={bulkIndex === 0}
                >
                  ⬅️ Vorige locatie
                </button>
              </div>
            )}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} style={{ marginTop: bulkMode ? '2rem' : 0 }}>
          <div className="form-group">
            <label htmlFor="rij">Rij (1-10):</label>
            <input
              style={appleInput}
              type="number"
              id="rij"
              name="rij"
              min="1"
              max="10"
              value={formData.rij}
              onChange={handleInputChange}
              required
              // niet disabled in bulkMode, zodat auto-upload werkt
            />
          </div>

        <div className="form-group">
          <label htmlFor="kolom">Kolom (A-Z):</label>
          <input
            style={appleInput}
            type="text"
            id="kolom"
            name="kolom"
            value={formData.kolom}
            onChange={handleInputChange}
            placeholder="bijv. A, B, C..."
            required
            // niet disabled in bulkMode, zodat auto-upload werkt
          />
        </div>

        <div className="form-group">
          <label>Stapel:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="stapel"
                value="voor"
                checked={formData.stapel === 'voor'}
                onChange={handleInputChange}
                // niet disabled in bulkMode
              />
              Voor
            </label>
            <label>
              <input
                type="radio"
                name="stapel"
                value="achter"
                checked={formData.stapel === 'achter'}
                onChange={handleInputChange}
                // niet disabled in bulkMode
              />
              Achter
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="customPrefix">Locatie-prefix (optioneel):</label>
          <input
            style={appleInput}
            type="text"
            id="customPrefix"
            name="customPrefix"
            value={customPrefix}
            onChange={handleInputChange}
            placeholder="Bijv. Hendrik, 4-1A, 1-2A, ..."
          />
          <small style={{ color: '#888' }}>Voeg een prefix toe voor speciale locaties, bijvoorbeeld 'Hendrik', '4-1A', etc.</small>
        </div>

        <div className="form-group">
          <label htmlFor="image">Foto van boekenstapel:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* File picker */}
            <input
              style={{ ...appleInput, display: 'none' }}
              type="file"
              ref={fileInputRef}
              name="image"
              accept="image/*"
              onChange={handleInputChange}
              required={!formData.image}
            />
            <button type="button" style={appleButton} onClick={openFilePicker}>
              📁 Bladeren
            </button>
            {/* Camera capture */}
            <input
              style={{ ...appleInput, display: 'none' }}
              type="file"
              ref={cameraInputRef}
              name="image"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              required={!formData.image}
            />
            <button type="button" style={appleButton} onClick={openCamera}>
              📷 Camera
            </button>
            {/* Remove/clear/retake button */}
            {formData.image && (
              <button type="button" style={{ ...appleButton, background: '#ffe5e5', color: '#c00' }} onClick={clearImage}>
                ❌ Verwijder
              </button>
            )}
          </div>
          {/* Preview selected image */}
          {formData.image && (
            <div style={{ marginTop: '0.5rem' }}>
              <img src={URL.createObjectURL(formData.image)} alt="Preview" style={{ maxWidth: 180, maxHeight: 120, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
            </div>
          )}
          <div style={{ marginTop: '0.5rem', color: '#555', fontWeight: 500 }}>
            {customPrefix ? `${customPrefix}-` : ''}{formData.rij}{formData.kolom}-{formData.stapel.toUpperCase()}
          </div>
        </div>

        <button 
          type="submit" 
          style={appleButton}
          disabled={status === 'loading' || (bulkMode && bulkLocations.length === 0) || !sessionId}
        >
          {bulkMode && bulkLocations.length > 0
            ? `Upload (${bulkIndex + 1}/${bulkLocations.length})`
            : status === 'loading' ? (
              <>
                <span className="loading"></span>
                Verwerken...
              </>
            ) : (
              'Verwerk Stapel'
            )}
        </button>
      </form>

      {/* Status berichten */}
      {status === 'success' && (
        <div className="alert alert-success">{message}</div>
      )}

      {status === 'error' && (
        <div className="alert alert-error">{message}</div>
      )}

      {/* Toon verwerkte boeken */}
      {processedBooks.length > 0 && (
        <div className="books-list">
          <h3>Zojuist toegevoegde boeken:</h3>
          {processedBooks.map((book, i) => (
            <div key={i} className="book-item">
              <div className="book-title">{book.titel}</div>
              <div className="book-author">{book.auteur}</div>
              <div className="book-location">
                Locatie: {book.locatie} - {book.stapel} (positie {book.positie_op_stapel})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toon alle boeken */}
      {allBooks.length > 0 && (
        <div className="books-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
          <h3 style={{ flexBasis: '100%' }}>Alle boeken in deze sessie ({allBooks.length}):</h3>
          {Object.entries(groupBooksByLocation(allBooks)).map(([key, books]) => {
            const [locatie, stapel] = key.split('||');
            return (
              <div key={key} style={{
                background: 'linear-gradient(120deg,#f8fafc 0%,#e9ecef 100%)',
                borderRadius: 20,
                boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
                padding: '1.5rem 2rem',
                minWidth: 320,
                maxWidth: 400,
                margin: '1rem 0',
                transition: 'box-shadow 0.2s',
                position: 'relative',
                border: '1.5px solid #e0e0e0',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                animation: 'fadeIn 0.5s',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 8, letterSpacing: '-0.5px', color: '#222' }}>
                  📍 {locatie} - {stapel.toUpperCase()}
                </div>
                <div style={{ marginBottom: 12, color: '#888', fontSize: '0.95rem' }}>
                  {books.length} boek(en) op deze locatie
                </div>
                <div style={{ width: '100%' }}>
                  {books.map((book, i) => (
                    <div key={i} style={{
                      background: '#fff',
                      borderRadius: 12,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      padding: '0.7rem 1rem',
                      marginBottom: 8,
                      transition: 'box-shadow 0.2s',
                    }}>
                      <div className="book-title" style={{ fontWeight: 600 }}>{book.titel}</div>
                      <div className="book-author" style={{ color: '#6c757d', fontSize: '0.95rem' }}>{book.auteur}</div>
                      <div className="book-location" style={{ fontSize: '0.85rem', color: '#495057' }}>
                        Positie: {book.positie_op_stapel} | Tijd: {new Date(book.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  style={{
                    background: 'linear-gradient(90deg,#ffe5e5,#ffd6d6)',
                    color: '#c00',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.6rem 1.5rem',
                    fontWeight: 600,
                    fontSize: '1rem',
                    marginTop: 10,
                    alignSelf: 'flex-end',
                    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={async () => {
                    if (!window.confirm(`Weet je zeker dat je ALLE boeken van locatie ${locatie} - ${stapel} wilt verwijderen?`)) return;
                    setStatus('loading');
                    setMessage('Bezig met verwijderen...');
                    try {
                      await axios.post('/api/books/delete-by-location', {
                        sessionId,
                        locatie,
                        stapel
                      });
                      setStatus('success');
                      setMessage('Boeken verwijderd voor deze locatie.');
                      fetchAllBooks();
                    } catch (err) {
                      setStatus('error');
                      setMessage('Fout bij verwijderen.');
                    }
                  }}
                >
                  🗑️ Verwijder boeken van deze locatie
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
  )
}

export default App 
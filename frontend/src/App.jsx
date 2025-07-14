import React, { useState, useEffect } from 'react'
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

  // Fetch sessions on mount
  useEffect(() => { fetchSessions() }, [])
  useEffect(() => { if (sessionId) fetchAllBooks() }, [sessionId])

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
          locs.push({ rij, kolom: cols[k], stapel })
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
            image: null
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

  const handleDownloadCSV = () => {
    if (!sessionId) return
    window.open(`/api/download-csv?sessionId=${sessionId}`, '_blank')
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
              <div style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                Upload voor locatie: {bulkLocations[bulkIndex]?.rij}{bulkLocations[bulkIndex]?.kolom}-{bulkLocations[bulkIndex]?.stapel.toUpperCase()}<br />
                ({bulkIndex + 1} van {bulkLocations.length})
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
              disabled={bulkMode}
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
            disabled={bulkMode}
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
                disabled={bulkMode}
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
                disabled={bulkMode}
              />
              Achter
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="image">Foto van boekenstapel:</label>
          <input
            style={appleInput}
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleInputChange}
            required
          />
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
        <div className="books-list">
          <h3>Alle boeken in deze sessie ({allBooks.length}):</h3>
          {allBooks.map((book, i) => (
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
    </div>
  </div>
  )
}

export default App 
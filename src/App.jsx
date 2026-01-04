import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.MODE === 'production' ? '' : 'http://localhost:8000'

function App() {
  const [projectName, setProjectName] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [activeTab, setActiveTab] = useState('record')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
      setRecordedBlob(null)
      setError(null)
      setActiveTab('upload')
    } else {
      setError('Please select a valid audio file')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
      setRecordedBlob(null)
      setError(null)
      setActiveTab('upload')
    } else {
      setError('Please drop a valid audio file')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' })
        setAudioFile(file)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setError(null)
      setActiveTab('record')

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      setError('Microphone access denied. Check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!projectName || !audioFile) {
      setError('Add a project name and audio source')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    const formData = new FormData()
    formData.append('project', projectName)
    formData.append('audio', audioFile)

    try {
      const response = await axios.post(`${API_URL}/api/voice_to_sfx`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process audio.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="site">
      <nav className="nav">
        <div className="brand">
          <span className="logo">🔊</span>
          <span className="brand-text">Voice to SFX</span>
        </div>
        <div className="nav-actions">
          <a className="nav-link" href="/api/docs" target="_blank" rel="noreferrer">API Docs</a>
        </div>
      </nav>

      <header className="hero">
        <h1 className="hero-title">Turn your voice into cinematic SFX</h1>
        <p className="hero-sub">Record a quick vocal sketch or upload audio — we’ll analyze it and generate polished sound effects with AI.</p>
        <div className="hero-hint">No plugins. No DAW. Just magic.</div>
      </header>

      <section className="panel">
        <form onSubmit={handleSubmit}>
          <div className="panel-top">
            <div className="tabs">
              <button type="button" className={`tab ${activeTab === 'record' ? 'active' : ''}`} onClick={() => setActiveTab('record')}>Record</button>
              <button type="button" className={`tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>Upload</button>
            </div>

            <div className="project-input">
              <label htmlFor="project">Project name</label>
              <input id="project" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="laser_shot_v1" />
            </div>
          </div>

          {activeTab === 'record' ? (
            <div className="record-card">
              <div className="record-ui">
                {!isRecording ? (
                  <button type="button" className="btn record" onClick={startRecording}><span className="dot"/> Start recording</button>
                ) : (
                  <button type="button" className="btn stop" onClick={stopRecording}><span className="square"/> Stop</button>
                )}
                <div className="timer">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</div>
              </div>
              {recordedBlob && !isRecording && (
                <div className="toast success">Saved recording ({recordingTime}s)</div>
              )}
            </div>
          ) : (
            <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
              <input className="file" type="file" accept="audio/*" onChange={handleFileChange} />
              <div className="drop-content">
                <div className="drop-icon">📁</div>
                <div className="drop-text">Drag and drop audio here or browse</div>
                {audioFile && (
                  <div className="toast success">{audioFile.name}</div>
                )}
              </div>
            </div>
          )}

          <button type="submit" className="btn primary" disabled={loading || !projectName || !audioFile}>
            {loading ? <span className="spinner"/> : <span className="bolt">⚡</span>}
            {loading ? 'Generating SFX…' : 'Generate SFX'}
          </button>
        </form>
      </section>

      {loading && (
        <section className="status">
          <div className="progress">
            <span style={{'--d': '0s'}}></span>
            <span style={{'--d': '.1s'}}></span>
            <span style={{'--d': '.2s'}}></span>
            <span style={{'--d': '.3s'}}></span>
          </div>
          <p>Analyzing your audio and crafting variations…</p>
        </section>
      )}

      {error && (
        <section className="status error">
          <p>{error}</p>
        </section>
      )}

      {results && (
        <section className="results">
          <div className="card interp">
            <div className="card-header">
              <h3>Interpretation</h3>
            </div>
            <div className="interp-name">{results.interpretation?.suggested_name}</div>
            <div className="interp-prompt">{results.interpretation?.prompt}</div>
          </div>

          <div className="grid">
            {results.assets && results.assets.length > 0 ? (
              results.assets.map((url, i) => (
                <div key={i} className="card audio">
                  <div className="card-header">
                    <span className="pill">VAR {i + 1}</span>
                  </div>
                  <audio controls src={url} />
                </div>
              ))
            ) : (
              <div className="card">
                <div className="card-body">No variations generated. Try another take.</div>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="foot-text">Made with AI · Voice → SFX</div>
      </footer>
    </div>
  )
}

export default App

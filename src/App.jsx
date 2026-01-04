import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

// In production, we use an empty string so the browser assumes the current domain
// In development (localhost), we point to port 8000
const API_URL = import.meta.env.MODE === 'production' 
  ? '' 
  : 'http://localhost:8000';

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
  
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
      setError(null)
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

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      setError('Could not access microphone. Please check permissions.')
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
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!projectName || !audioFile) {
      setError('Please provide both project name and audio file')
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process audio. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="waveform-icon">🎙️</div>
        <h1>VOICE TO SFX</h1>
        <p>AI-Powered Sound Effect Generation</p>
      </header>

      <form onSubmit={handleSubmit}>
        <div 
          className={`upload-section ${dragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Project Name */}
          <div className="input-group">
            <label htmlFor="project">PROJECT NAME</label>
            <input
              type="text"
              id="project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="laser_shot_v1"
            />
          </div>

          <div className="divider"></div>

          {/* Recording Section */}
          <div className="input-group">
            <label>RECORD YOUR VOICE</label>
            <div className="record-controls">
              {!isRecording ? (
                <button 
                  type="button" 
                  className="record-button"
                  onClick={startRecording}
                >
                  <span className="icon">⬤</span>
                  <span>START RECORDING</span>
                </button>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="record-button recording"
                    onClick={stopRecording}
                  >
                    <span className="icon">⬛</span>
                    <span>STOP</span>
                  </button>
                  <div className="recording-time">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                </>
              )}
            </div>
            
            {recordedBlob && !isRecording && (
              <div className="success-msg">
                ✓ Recording saved ({recordingTime}s)
              </div>
            )}
          </div>

          <div className="or-divider">OR</div>

          {/* Upload Section */}
          <div className="input-group">
            <label>UPLOAD AUDIO FILE</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
              />
              <button type="button" className="file-button">
                <span className="icon">📁</span>
                <span>{audioFile && !recordedBlob ? 'CHANGE FILE' : 'BROWSE FILES'}</span>
              </button>
            </div>
            
            {audioFile && !recordedBlob && (
              <div className="success-msg">
                ✓ {audioFile.name}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading || !projectName || !audioFile}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                <span>PROCESSING</span>
              </>
            ) : (
              <>
                <span className="icon">⚡</span>
                <span>GENERATE SFX</span>
              </>
            )}
          </button>
        </div>
      </form>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing audio and generating professional sound effects...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <strong>ERROR:</strong> {error}
        </div>
      )}

      {results && (
        <div className="results-section">
          <div className="interpretation">
            <h3>AI INTERPRETATION</h3>
            <div className="name">{results.interpretation.suggested_name}</div>
            <div className="prompt">{results.interpretation.prompt}</div>
          </div>

          <div className="variations">
            <h3>GENERATED VARIATIONS</h3>
            {results.assets && results.assets.length > 0 ? (
              results.assets.map((url, index) => (
                <div key={index} className="audio-player">
                  <div className="variation-label">VAR {index + 1}</div>
                  <audio controls src={url}>
                    Your browser does not support audio.
                  </audio>
                </div>
              ))
            ) : (
              <div className="no-results">
                No variations generated. Please try again.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App

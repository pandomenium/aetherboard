import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Feedback() {
  const [user, setUser] = useState(null)
  const [message, setMessage] = useState('')
  const [type, setType] = useState('General')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    loadUser()
  }, [])

  const submitFeedback = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!message.trim()) {
      setError('Feedback message is required.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('feedback').insert([
      {
        user_id: user?.id ?? null,
        type,
        message
      }
    ])

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Thank you! Your feedback has been sent.')
      setMessage('')
      setType('General')
    }

    setLoading(false)
  }

  return (
    <div className="page-wrapper">
      <div className="feedback-container">
        <header className="feedback-header">
          <h2>✉️ Feedback</h2>
          <p className="muted">Help us improve Aetherboard</p>
        </header>

        <form onSubmit={submitFeedback} className="card feedback-card">
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option>General</option>
              <option>Bug</option>
              <option>Feature Request</option>
              <option>UI / UX</option>
            </select>
          </div>

          <div className="form-group">
            <label>Your feedback</label>
            <textarea
              rows="5"
              placeholder="Tell us what you think…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <button className="primary-btn" disabled={loading}>
            {loading ? 'Sending…' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  )
}

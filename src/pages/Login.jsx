import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>
          Log in to your AetherBoard workspace
        </p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p style={styles.footer}>
          Don’t have an account?{' '}
          <Link to="/signup" style={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f9fafb, #eef2f7)',
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  title: {
    margin: 0,
    marginBottom: '0.25rem',
    fontSize: '1.5rem',
  },
  subtitle: {
    margin: 0,
    marginBottom: '1.5rem',
    color: '#555',
    fontSize: '0.95rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.85rem',
    marginBottom: '0.25rem',
    color: '#444',
  },
  input: {
    padding: '0.6rem 0.7rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '0.95rem',
  },
  button: {
    marginTop: '0.5rem',
    padding: '0.7rem',
    borderRadius: '8px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '0.6rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  footer: {
    marginTop: '1.5rem',
    fontSize: '0.85rem',
    textAlign: 'center',
    color: '#555',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: 500,
  },
}

import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      alert('✅ Account created! You can now log in.')
      navigate('/login')
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create your AetherBoard account</h2>
        <p style={styles.subtitle}>
          Manage payroll, HR, and work in one place
        </p>

        <form onSubmit={handleSignup} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={styles.input}
            />
          </div>

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
              minLength={6}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.select}
            >
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
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
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Log in
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
    maxWidth: '420px',
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
  select: {
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

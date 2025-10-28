import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee') // Default role
  const [error, setError] = useState(null)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      // 1️⃣ Create account in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role } }, // store role in user_metadata
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // 2️⃣ Wait for user creation, then call the Edge Function
      if (data?.user) {
        const response = await fetch(
          'https://ophwncotptfhnrdxgwmw.supabase.co/functions/v1/create-profile', // 👈 replace with your own
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.user.id,
              email,
              role,
            }),
          }
        )

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create profile')
        }

        console.log('✅ Profile created successfully')
      }

      alert('✅ Sign-up successful! Check your email for a confirmation link.')
      navigate('/login')
    } catch (err) {
      console.error('❌ Signup error:', err)
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📝 Sign Up</h2>
      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br /><br />

        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br /><br />

        {/* 👇 Role selection dropdown */}
        <label>
          Role:{' '}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="employee">Employee</option>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <br /><br />

        <button type="submit">Sign Up</button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>

      <p style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </div>
  )
}

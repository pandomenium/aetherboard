import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'

export default function ManagerTimesheetPage() {
  const [user, setUser] = useState(null)
  const [submittedSheets, setSubmittedSheets] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ✅ Fetch manager account and verify role
  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        if (!currentUser) return

        const { data: profile, error: roleErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single()

        if (roleErr) {
          console.error(roleErr)
          setErrorMsg('Error loading profile data.')
          return
        }

        if (profile?.role !== 'manager') {
          window.location.href = '/timesheet'
          return
        }

        setUser(currentUser)
      } catch (err) {
        console.error('Error fetching manager data:', err)
      }
    }

    fetchManagerData()
  }, [])

  // ✅ Fetch all submitted timesheets per week
  useEffect(() => {
    if (user) {
      fetchSubmittedTimesheets()
    }
  }, [user, weekStart])

  const fetchSubmittedTimesheets = async () => {
    try {
      setLoading(true)
      setErrorMsg('')

      const { data: timesheets, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('status', 'submitted')
        .eq('week_start', format(weekStart, 'yyyy-MM-dd'))

      if (error) {
        console.error('Error fetching timesheets:', error)
        setErrorMsg('Could not load submitted timesheets.')
        setSubmittedSheets([])
        setLoading(false)
        return
      }

      // Fetch employee names manually
      const userIds = timesheets.map((t) => t.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const merged = timesheets.map((t) => ({
        ...t,
        full_name: profiles?.find((p) => p.id === t.user_id)?.full_name || 'Unknown Employee',
      }))

      setSubmittedSheets(merged)
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setErrorMsg('Unexpected error while loading timesheets.')
      setLoading(false)
    }
  }

  const handleApproval = async (id, status) => {
    await supabase.from('timesheets').update({ status }).eq('id', id)
    fetchSubmittedTimesheets()
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>👨‍💼 Manager Timesheet Review</h2>

      {/* Week navigation + mini date selector */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}>⬅ Previous Week</button>
        <span style={{ margin: '0 1rem' }}>Week of {format(weekStart, 'MMM d, yyyy')}</span>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Next Week ➡</button>

        <input
          type="date"
          value={format(weekStart, 'yyyy-MM-dd')}
          onChange={(e) =>
            setWeekStart(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))
          }
          style={{
            marginLeft: '1rem',
            padding: '0.3rem',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        />
      </div>

      {errorMsg && (
        <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>
      )}

      {/* Loading / Empty / Data Display */}
      {loading ? (
        <p>Loading timesheets...</p>
      ) : submittedSheets.length === 0 ? (
        <p>No submitted timesheets for this week.</p>
      ) : (
        submittedSheets.map((sheet) => (
          <div
            key={sheet.id}
            style={{
              border: '1px solid #ccc',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: '#fafafa',
            }}
          >
            <h4>{sheet.full_name}</h4>
            <p><strong>Total Hours:</strong> {sheet.total_hours || 0}</p>
            <p><strong>Status:</strong> {sheet.status}</p>

            <table
              border="1"
              cellPadding="6"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '0.5rem',
              }}
            >
              <thead style={{ backgroundColor: '#f0f0f0' }}>
                <tr>
                  <th>Day</th>
                  <th>Task</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {sheet.data && typeof sheet.data === 'object' ? (
                  Object.entries(sheet.data).map(([day, val]) => (
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{val?.task || '-'}</td>
                      <td>{val?.hours || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center' }}>No daily details available</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ marginTop: '0.5rem' }}>
              <button
                onClick={() => handleApproval(sheet.id, 'approved')}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '0.3rem 0.8rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ✅ Approve
              </button>
              <button
                onClick={() => handleApproval(sheet.id, 'rejected')}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  padding: '0.3rem 0.8rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: '0.5rem',
                }}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

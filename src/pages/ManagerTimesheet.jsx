import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { format, startOfWeek, addWeeks, subWeeks, endOfWeek, addDays } from 'date-fns'

export default function ManagerTimesheetPage() {
  const [user, setUser] = useState(null)
  const [submittedSheets, setSubmittedSheets] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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

        if (profile?.role !== 'admin') {
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
    if (user) fetchSubmittedTimesheets()
  }, [user, weekStart])

  const fetchSubmittedTimesheets = async () => {
    try {
      setLoading(true)
      setErrorMsg('')

      const start = format(weekStart, 'yyyy-MM-dd')
      const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')

      // Fetch weekly timesheets
      const { data: weeklySheets, error } = await supabase
        .from('timesheets_new')
        .select('*')
        .gte('week_start', start)
        .lte('week_start', end)
        .eq('status', 'submitted')

      if (error) throw error
      if (!weeklySheets || weeklySheets.length === 0) {
        setSubmittedSheets([])
        setLoading(false)
        return
      }

      // Fetch employee names
      const userIds = weeklySheets.map(sheet => sheet.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      // Fetch daily entries for all timesheets
      const sheetIds = weeklySheets.map(sheet => sheet.id)
      const { data: entries } = await supabase
        .from('timesheet_entries')
        .select('*')
        .in('timesheet_id', sheetIds)

      // Merge daily entries into weekly sheets
      const mergedSheets = weeklySheets.map(sheet => {
        const sheetEntries = entries.filter(e => e.timesheet_id === sheet.id)
        const dailyData = {}
        sheetEntries.forEach(e => {
          const dayIndex = Math.floor(
            (new Date(e.work_date) - new Date(sheet.week_start)) / (1000 * 60 * 60 * 24)
          )
          const dayName = weekdays[dayIndex] || `Day ${dayIndex + 1}`
          dailyData[dayName] = {
            task: e.task,
            hours: e.hours,
            description: e.description || ''
          }
        })
        return {
          ...sheet,
          full_name: profiles?.find(p => p.id === sheet.user_id)?.full_name || 'Unknown Employee',
          dailyData
        }
      })

      setSubmittedSheets(mergedSheets)
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setErrorMsg('Failed to load submitted timesheets.')
      setLoading(false)
    }
  }

  // ✅ Approve / Reject timesheet
  const handleApproval = async (id, status) => {
    try {
      const { error } = await supabase
        .from('timesheets_new')
        .update({ status })
        .eq('id', id)

      if (error) {
        alert('Failed to update timesheet: ' + error.message)
        return
      }

      // Update UI instantly
      setSubmittedSheets(prev =>
        prev.map(sheet =>
          sheet.id === id ? { ...sheet, status } : sheet
        )
      )
    } catch (err) {
      console.error('Approval error:', err)
      alert('Unexpected error while updating timesheet.')
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h2>👨‍💼 Manager Timesheet Review</h2>

      {/* Week navigation + mini date picker */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}>⬅ Previous Week</button>
        <span style={{ margin: '0 1rem' }}>Week of {format(weekStart, 'MMM d, yyyy')}</span>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Next Week ➡</button>

        <input
          type="date"
          value={format(weekStart, 'yyyy-MM-dd')}
          onChange={e => setWeekStart(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))}
          style={{ marginLeft: '1rem', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
      </div>

      {errorMsg && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>}

      {loading ? (
        <p>Loading timesheets...</p>
      ) : submittedSheets.length === 0 ? (
        <p>No submitted timesheets for this week.</p>
      ) : (
        submittedSheets.map(sheet => (
          <div
            key={sheet.id}
            style={{
              border: '1px solid #ccc',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background:
                sheet.status === 'approved'
                  ? '#d4edda'
                  : sheet.status === 'rejected'
                  ? '#f8d7da'
                  : '#fafafa',
            }}
          >
            <h4>{sheet.full_name}</h4>
            <p><strong>Status:</strong> {sheet.status}</p>

            <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead style={{ backgroundColor: '#f0f0f0' }}>
                <tr>
                  <th>Day</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {weekdays.map(day => {
                  const entry = sheet.dailyData?.[day]
                  return (
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{entry?.task || '-'}</td>
                      <td>{entry?.hours || 0}</td>
                      <td>{entry?.description || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '0.5rem' }}>
              <button
                onClick={() => handleApproval(sheet.id, 'approved')}
                disabled={sheet.status !== 'submitted'}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '0.3rem 0.8rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: sheet.status === 'submitted' ? 'pointer' : 'not-allowed',
                  opacity: sheet.status === 'submitted' ? 1 : 0.6,
                }}
              >
                ✅ Approve
              </button>
              <button
                onClick={() => handleApproval(sheet.id, 'rejected')}
                disabled={sheet.status !== 'submitted'}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  padding: '0.3rem 0.8rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: sheet.status === 'submitted' ? 'pointer' : 'not-allowed',
                  opacity: sheet.status === 'submitted' ? 1 : 0.6,
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

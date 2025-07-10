import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function TimesheetPage() {
  const [user, setUser] = useState(null)
  const [timesheet, setTimesheet] = useState(null)
  const [task, setTask] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      fetchTodayTimesheet(session?.user?.id)
    }
    getUser()
  }, [])

  const fetchTodayTimesheet = async (userId) => {
    if (!userId) return
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (data) setTimesheet(data)
  }

  const handleClockIn = async () => {
    setLoading(true)
    const { error } = await supabase.from('timesheets').insert({
      user_id: user.id,
      clock_in: new Date().toISOString(),
      task,
    })
    if (!error) fetchTodayTimesheet(user.id)
    setLoading(false)
  }

  const handleClockOut = async () => {
    if (!timesheet) return
    setLoading(true)
    const { error } = await supabase
      .from('timesheets')
      .update({ clock_out: new Date().toISOString(), task })
      .eq('id', timesheet.id)

    if (!error) fetchTodayTimesheet(user.id)
    setLoading(false)
  }

  const formatHours = (hours) => (hours ? `${hours.toFixed(2)} hrs` : '0 hrs')

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🕒 Timesheet</h2>
      {!user ? (
        <p>Loading user...</p>
      ) : (
        <>
          <p>Date: {new Date().toDateString()}</p>

          <textarea
            rows="3"
            placeholder="What did you work on today?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem' }}
          />

          {!timesheet?.clock_in ? (
            <button onClick={handleClockIn} disabled={loading}>
              ⏰ Clock In
            </button>
          ) : !timesheet?.clock_out ? (
            <button onClick={handleClockOut} disabled={loading}>
              ✅ Clock Out
            </button>
          ) : (
            <div>
              <p>Clock In: {new Date(timesheet.clock_in).toLocaleTimeString()}</p>
              <p>Clock Out: {new Date(timesheet.clock_out).toLocaleTimeString()}</p>
              <p>Total Hours: {formatHours(timesheet.total_hours)}</p>
              <p>Overtime: {formatHours(timesheet.overtime_hours)}</p>
              <p>Overtime Status: {timesheet.overtime_status}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

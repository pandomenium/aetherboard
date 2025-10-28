import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  format,
} from 'date-fns'

export default function TimesheetPage() {
  const [user, setUser] = useState(null)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [timesheetData, setTimesheetData] = useState({})
  const [loading, setLoading] = useState(false)
  const [totalHours, setTotalHours] = useState(0)

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const taskOptions = ['IT Management', 'Development', 'Testing', 'Vacation Leave', 'Sick Leave']

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single()
          
        setUser(currentUser)
        fetchTimesheet(currentUser.id)
      }
    }
    fetchUser()
  }, [weekStart])

  const fetchTimesheet = async (userId) => {
    const { data } = await supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
      .single()

    if (data) {
      setTimesheetData(data.data || {})
      setTotalHours(data.total_hours || 0)
    } else {
      const emptyData = weekdays.reduce((acc, day) => ({ ...acc, [day]: { task: '', hours: '' } }), {})
      setTimesheetData(emptyData)
      setTotalHours(0)
    }
  }

  const handleTaskChange = (day, value) => {
    setTimesheetData(prev => ({ ...prev, [day]: { ...prev[day], task: value } }))
  }

  const handleHourChange = (day, value) => {
    const numeric = parseFloat(value) || 0
    const updated = { ...timesheetData, [day]: { ...timesheetData[day], hours: numeric } }
    setTimesheetData(updated)
    setTotalHours(Object.values(updated).reduce((acc, d) => acc + (parseFloat(d.hours) || 0), 0))
  }

  const handleSubmitTimesheet = async () => {
    if (totalHours < 40) {
      alert('You must have at least 40 total hours before submitting.')
      return
    }

    setLoading(true)
    const { data: existing } = await supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
      .maybeSingle()

    if (existing) {
      await supabase
        .from('timesheets')
        .update({
          data: timesheetData,
          total_hours: totalHours,
          status: 'submitted',
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('timesheets').insert([
        {
          user_id: user.id,
          week_start: format(weekStart, 'yyyy-MM-dd'),
          data: timesheetData,
          total_hours: totalHours,
          status: 'submitted',
        },
      ])
    }

    setLoading(false)
    alert('Timesheet submitted successfully!')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🕒 Employee Timesheet</h2>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}>⬅ Previous Week</button>
        <span style={{ margin: '0 1rem' }}>
          Week of {format(weekStart, 'MMM d, yyyy')}
        </span>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Next Week ➡</button>

        {/* 🗓 Mini Date Selector */}
        <input
          type="date"
          value={format(weekStart, 'yyyy-MM-dd')}
          onChange={(e) =>
            setWeekStart(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))
          }
          style={{ marginLeft: '1rem' }}
        />
      </div>

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>Day</th>
            <th>Task</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {weekdays.map((day) => (
            <tr key={day}>
              <td>{day}</td>
              <td>
                <select
                  value={timesheetData[day]?.task || ''}
                  onChange={(e) => handleTaskChange(day, e.target.value)}
                >
                  <option value="">-- Select Task --</option>
                  {taskOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="8"
                  step="0.5"
                  value={timesheetData[day]?.hours || ''}
                  onChange={(e) => handleHourChange(day, e.target.value)}
                  style={{ width: '80px' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: '1rem' }}>🧮 Total Hours: <strong>{totalHours}</strong></p>

      <button onClick={handleSubmitTimesheet} disabled={loading}>
        📤 Submit Timesheet
      </button>
    </div>
  )
}

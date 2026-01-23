import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { startOfWeek, addWeeks, subWeeks, format, addDays } from 'date-fns'

export default function TimesheetPage() {
  const [user, setUser] = useState(null)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [timesheetData, setTimesheetData] = useState({})
  const [loading, setLoading] = useState(false)
  const [totalHours, setTotalHours] = useState(0)

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const taskOptions = ['IT Management', 'Best Choice - iMall', 'Development', 'Testing', 'Vacation Leave', 'Sick Leave', 'Rest Day']

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      if (!currentUser) return
      setUser(currentUser)
      fetchTimesheet(currentUser.id)
    }
    fetchUser()
  }, [weekStart])

  const fetchTimesheet = async (userId) => {
    const emptyData = weekdays.reduce((acc, day) => ({
      ...acc,
      [day]: { task: '', hours: '', description: '' }
    }), {})
    setTimesheetData(emptyData)
    setTotalHours(0)

    const { data: weeklySheet } = await supabase
      .from('timesheets_new')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
      .maybeSingle()

    if (!weeklySheet) return

    const { data: entries } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('timesheet_id', weeklySheet.id)

    if (entries) {
      const updated = {}
      entries.forEach(entry => {
        const dayIndex = new Date(entry.work_date).getDay() - 1
        const dayName = weekdays[dayIndex >= 0 ? dayIndex : 0]
        if (dayName) {
          updated[dayName] = { task: entry.task, hours: entry.hours, description: entry.description }
        }
      })
      setTimesheetData(updated)
      setTotalHours(entries.reduce((sum, e) => sum + parseFloat(e.hours || 0), 0))
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

  const handleDescriptionChange = (day, value) => {
    setTimesheetData(prev => ({ ...prev, [day]: { ...prev[day], description: value } }))
  }

  const handleSubmitTimesheet = async () => {
    if (!user) return
    setLoading(true)

    const { data: weeklySheet } = await supabase
      .from('timesheets_new')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
      .maybeSingle()

    let timesheetId
    if (weeklySheet) {
      timesheetId = weeklySheet.id
      await supabase
        .from('timesheets_new')
        .update({ status: 'submitted' })
        .eq('id', timesheetId)
    } else {
      const { data: newSheet } = await supabase
        .from('timesheets_new')
        .insert([{ user_id: user.id, week_start: format(weekStart, 'yyyy-MM-dd'), status: 'submitted' }])
        .select()
      timesheetId = newSheet[0].id
    }

    for (let i = 0; i < weekdays.length; i++) {
      const day = weekdays[i]
      const entry = timesheetData[day]
      if (!entry || entry.task === '') continue
      const workDate = format(addDays(weekStart, i), 'yyyy-MM-dd')

      const { data: existing } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('timesheet_id', timesheetId)
        .eq('work_date', workDate)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('timesheet_entries')
          .update({ task: entry.task, hours: entry.hours, description: entry.description, status: 'submitted' })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('timesheet_entries')
          .insert([{ timesheet_id: timesheetId, user_id: user.id, work_date: workDate, task: entry.task, hours: entry.hours, description: entry.description, status: 'submitted' }])
      }
    }

    setLoading(false)
    alert('Timesheet submitted successfully!')
  }

  const th = { textAlign: 'left', padding: '10px', fontWeight: 600, fontSize: '13px', color: '#555' }
  const td = { padding: '8px' }
  const input = { width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }

  // Week range
  const weekEnd = addDays(weekStart, 6)
  const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8', padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>🕒 Employee Timesheet</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}>⬅</button>
            <strong>{weekRange}</strong>
            <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}>➡</button>
            <input
              type="date"
              value={format(weekStart, 'yyyy-MM-dd')}
              onChange={(e) => setWeekStart(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))}
              style={{ marginLeft: '0.5rem', padding: '0.4rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f0f2f5', zIndex: 1 }}>
              <tr>
                <th style={th}>Day</th>
                <th style={th}>Task</th>
                <th style={th}>Hours</th>
                <th style={th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {weekdays.map((day, i) => {
                const entry = timesheetData[day] || {}
                const isRestDay = entry.task === 'Rest Day'
                const dayDate = format(addDays(weekStart, i), 'MMM d')

                return (
                  <tr key={day} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}><strong>{day}</strong><br /><small>{dayDate}</small></td>

                    <td style={td}>
                      <select value={entry.task || ''} onChange={(e) => handleTaskChange(day, e.target.value)} style={input}>
                        <option value="">Select task</option>
                        {taskOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td style={td}>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        step="0.5"
                        disabled={isRestDay}
                        value={entry.hours || ''}
                        onChange={(e) => handleHourChange(day, e.target.value)}
                        style={{
                          ...input,
                          width: '80px',
                          background: isRestDay ? '#e0e0e0' : '#fff',
                          color: isRestDay ? '#888' : '#000',
                          cursor: isRestDay ? 'not-allowed' : 'text'
                        }}
                      />
                    </td>

                    <td style={td}>
                      <input
                        type="text"
                        disabled={isRestDay}
                        value={entry.description || ''}
                        onChange={(e) => handleDescriptionChange(day, e.target.value)}
                        placeholder={isRestDay ? 'Rest day' : 'What did you work on?'}
                        style={{
                          ...input,
                          background: isRestDay ? '#e0e0e0' : '#fff',
                          color: isRestDay ? '#888' : '#000',
                          cursor: isRestDay ? 'not-allowed' : 'text'
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>🧮 Total Hours: <strong>{totalHours}</strong></div>
          <button onClick={handleSubmitTimesheet} disabled={loading} style={{
            padding: '0.6rem 1.4rem',
            background: loading ? '#ccc' : '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}>
            📤 Submit Timesheet
          </button>
        </div>

      </div>
    </div>
  )
}

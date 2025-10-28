import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function OvertimeApprovals() {
  const [requests, setRequests] = useState([])

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from('timesheets')
      .select('id, user_id, task, date, total_hours, overtime_hours, overtime_status')
      .eq('overtime_status', 'pending')

    if (!error) {
      setRequests(data)
    }
  }

  const handleDecision = async (id, status) => {
    const { error } = await supabase
      .from('timesheets')
      .update({ overtime_status: status })
      .eq('id', id)

    if (!error) {
      fetchPendingRequests()
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🔍 Overtime Approval Requests</h2>
      {requests.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <ul>
          {requests.map((req) => (
            <li key={req.id} style={{ marginBottom: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
              <p><strong>User ID:</strong> {req.user_id}</p>
              <p><strong>Date:</strong> {req.date}</p>
              <p><strong>Task:</strong> {req.task}</p>
              <p><strong>Total Hours:</strong> {req.total_hours.toFixed(2)}</p>
              <p><strong>OT Hours:</strong> {req.overtime_hours.toFixed(2)}</p>
              <div>
                <button onClick={() => handleDecision(req.id, 'approved')}>✅ Approve</button>
                <button onClick={() => handleDecision(req.id, 'rejected')} style={{ marginLeft: '1rem' }}>❌ Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

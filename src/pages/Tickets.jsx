import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function TicketsPage() {
  const [user, setUser] = useState(null)
  const [myTickets, setMyTickets] = useState([])
  const [assignedTickets, setAssignedTickets] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState({})
  const [newComments, setNewComments] = useState({})

  // 🔹 Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) fetchTickets(currentUser.id)
    }
    getUser()
  }, [])

  // 🔹 Fetch tickets
  const fetchTickets = async (uid) => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching tickets:', error.message)
      return
    }

    if (data) {
      const myT = data.filter(t => t.user_id === uid)
      const assignedT = data.filter(t => t.assignee_id === uid)
      setMyTickets(myT)
      setAssignedTickets(assignedT)

      const ids = data.map(t => t.id)
      if (ids.length > 0) fetchComments(ids)
    }
  }

  // 🔹 Fetch comments
  const fetchComments = async (ticketIds) => {
    const { data, error } = await supabase
      .from('ticket_comments')
      .select('*')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching comments:', error.message)
      return
    }

    const grouped = data.reduce((acc, c) => {
      if (!acc[c.ticket_id]) acc[c.ticket_id] = []
      acc[c.ticket_id].push(c)
      return acc
    }, {})

    setComments(grouped)
  }

  // 🔹 Submit new ticket
  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
        title,
        description,
        priority,
        status: 'open',
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('❌ Error creating ticket:', error.message)
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      fetchTickets(user.id)
    }

    setLoading(false)
  }

  // 🔹 Add comment
  const handleAddComment = async (ticketId) => {
    const content = newComments[ticketId]
    if (!content?.trim()) return

    const { data, error } = await supabase
      .from('ticket_comments')
      .insert([
        {
          ticket_id: ticketId,
          user_id: user.id,
          comment: content,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error('❌ Error adding comment:', error.message)
    } else {
      setNewComments(prev => ({ ...prev, [ticketId]: '' }))
      fetchComments([ticketId])
    }
  }

  const formatDateTime = (dt) =>
    new Date(dt).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🐛 IT Support Tickets</h2>

      {/* Create Ticket */}
      <div style={{ marginBottom: '2rem' }}>
        <input
          placeholder="Issue Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <textarea
          placeholder="Describe your issue..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ marginBottom: '0.5rem' }}
        >
          <option value="low">🟢 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🟠 High</option>
          <option value="critical">🔴 Critical</option>
        </select>
        <br />
        <button onClick={handleSubmit} disabled={loading}>
          📤 Submit Ticket
        </button>
      </div>

      {/* Your Tickets */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>🎫 Your Submitted Tickets</h3>
        <ul>
          {myTickets.map((t) => (
            <li
              key={t.id}
              style={{
                marginBottom: '1rem',
                borderBottom: '1px solid #ccc',
                paddingBottom: '1rem',
              }}
            >
              <strong>{t.title}</strong> <br />
              <em>{t.description}</em> <br />
              <small>Priority: <strong>{t.priority?.toUpperCase()}</strong></small><br />
              <small>Status: <strong>{t.status}</strong></small><br />
              <small>Created: {formatDateTime(t.created_at)}</small>

              {/* Comments */}
              <div style={{ marginTop: '1rem' }}>
                <h5>💬 Comments</h5>
                <ul>
                  {(comments[t.id] || []).map(c => (
                    <li key={c.id}>
                      <small>
                        <strong>{c.user_id === user.id ? 'You' : c.user_id}</strong>: {c.comment}
                      </small>
                    </li>
                  ))}
                </ul>
                <input
                  placeholder="Add a comment..."
                  value={newComments[t.id] || ''}
                  onChange={(e) =>
                    setNewComments((prev) => ({ ...prev, [t.id]: e.target.value }))
                  }
                  style={{ width: '80%', marginRight: '0.5rem' }}
                />
                <button onClick={() => handleAddComment(t.id)}>Send</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Assigned Tickets */}
      <div>
        <h3>🧑‍💻 Tickets Assigned to You</h3>
        <ul>
          {assignedTickets.map((t) => (
            <li
              key={t.id}
              style={{
                marginBottom: '1rem',
                borderBottom: '1px solid #ccc',
                paddingBottom: '1rem',
              }}
            >
              <strong>{t.title}</strong> <br />
              <em>{t.description}</em> <br />
              <small>Priority: <strong>{t.priority?.toUpperCase()}</strong></small><br />
              <small>Status: <strong>{t.status}</strong></small><br />
              <small>Created: {formatDateTime(t.created_at)}</small>

              {/* Comments */}
              <div style={{ marginTop: '1rem' }}>
                <h5>💬 Comments</h5>
                <ul>
                  {(comments[t.id] || []).map(c => (
                    <li key={c.id}>
                      <small>
                        <strong>{c.user_id === user.id ? 'You' : c.user_id}</strong>: {c.comment}
                      </small>
                    </li>
                  ))}
                </ul>
                <input
                  placeholder="Add a comment..."
                  value={newComments[t.id] || ''}
                  onChange={(e) =>
                    setNewComments((prev) => ({ ...prev, [t.id]: e.target.value }))
                  }
                  style={{ width: '80%', marginRight: '0.5rem' }}
                />
                <button onClick={() => handleAddComment(t.id)}>Send</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

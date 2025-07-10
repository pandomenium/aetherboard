import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function MessagesPage() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const messageEndRef = useRef(null)

  // Get current user + contacts
  useEffect(() => {
    const fetchSessionAndUsers = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      setUser(session.user)

      const { data: userList } = await supabase
        .from('profiles')
        .select('id, email')
      const filtered = userList.filter((u) => u.id !== session.user.id)
      setUsers(filtered)
    }

    fetchSessionAndUsers()
  }, [])

  // Fetch messages when contact changes
  useEffect(() => {
    if (!user || !selectedUser) return
    fetchMessages()
  }, [selectedUser])

  // Real-time subscription to new messages
  useEffect(() => {
    if (!user || !selectedUser) return

    const channel = supabase
      .channel('realtime:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new
          const isRelevant =
            (newMsg.sender_id === user.id && newMsg.receiver_id === selectedUser.id) ||
            (newMsg.sender_id === selectedUser.id && newMsg.receiver_id === user.id)

          if (isRelevant) {
            setMessages((prev) => [...prev, newMsg])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, selectedUser])

  // Scroll to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch chat messages from Supabase
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (!error) {
      const filtered = data.filter(
        (msg) =>
          (msg.sender_id === user.id && msg.receiver_id === selectedUser.id) ||
          (msg.sender_id === selectedUser.id && msg.receiver_id === user.id)
      )
      setMessages(filtered)
    }
  }

  // Send a message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: user.id,
        receiver_id: selectedUser.id,
        content: newMessage,
      },
    ])

    if (!error) {
      setNewMessage('')
      // fetchMessages() not needed here because realtime subscription will add message
    } else {
      console.error('Message send error:', error.message)
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>💬 Messenger</h2>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Left: Contact List */}
        <div>
          <h4>Contacts</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {users.map((u) => (
              <li key={u.id} style={{ marginBottom: '0.5rem' }}>
                <button
                  onClick={() => setSelectedUser(u)}
                  style={{
                    background: selectedUser?.id === u.id ? '#0084FF' : '#eee',
                    color: selectedUser?.id === u.id ? '#fff' : '#000',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {u.email}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Chat Box */}
        <div style={{ flex: 1 }}>
          {selectedUser && (
            <>
              <h4>Chat with {selectedUser.email}</h4>
              <div
                style={{
                  border: '1px solid #ccc',
                  height: '300px',
                  overflowY: 'auto',
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent:
                        msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor:
                          msg.sender_id === user.id ? '#0084FF' : '#E4E6EB',
                        color:
                          msg.sender_id === user.id ? 'white' : 'black',
                        padding: '0.5rem 1rem',
                        borderRadius: '18px',
                        maxWidth: '75%',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    borderRadius: '18px',
                    border: '1px solid #ccc',
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '18px',
                    background: '#0084FF',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

export default function PandoChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'pando', text: 'Hi! I’m Pando. How can I help you today?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = { from: 'user', text: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const aiResponse = await getPandoResponse(input)
    setMessages((prev) => [...prev, aiResponse])
    setLoading(false)
  }

  // 🔁 Simulated now – GPT-4 API coming later
  const getPandoResponse = async (text) => {
    const lower = text.toLowerCase()

    if (lower.includes('clock in')) {
      return { from: 'pando', text: '✅ Clocking you in... (simulated)' }
    } else if (lower.includes('overtime')) {
      return { from: 'pando', text: '🕒 You worked 1.5 hours OT today. ₱225 earned!' }
    } else if (lower.includes('remind')) {
      return { from: 'pando', text: '📌 Okay! I’ll remind you later (not really 😉)' }
    }

    return { from: 'pando', text: '🤖 I’m learning! Soon I’ll be powered by real AI.' }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          backgroundColor: '#0084FF', // Messenger blue
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}
      >
        💬
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '6rem',
            right: '1rem',
            width: '320px',
            maxHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              background: '#e5e5ea',
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent:
                    msg.from === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  style={{
                    backgroundColor:
                      msg.from === 'user' ? '#0084FF' : '#F1F0F0',
                    color: msg.from === 'user' ? 'white' : 'black',
                    padding: '0.5rem 1rem',
                    borderRadius: '18px',
                    maxWidth: '75%',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ textAlign: 'center', fontStyle: 'italic' }}>
                Typing...
              </div>
            )}
          </div>

          <div style={{ padding: '0.75rem', background: '#fff' }}>
            <input
              type="text"
              placeholder="Type a message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '12px',
                border: '1px solid #ccc',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [boardTitle, setBoardTitle] = useState('')
  const [boards, setBoards] = useState([])

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        navigate('/login')
      } else {
        setUser(session.user)
        fetchBoards(session.user.id)
      }
    }

    getUser()
  }, [navigate])

  const fetchBoards = async (userId) => {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error) {
      setBoards(data)
    }
  }

const handleCreateBoard = async () => {
  if (!boardTitle.trim()) return

  const { data, error } = await supabase.from('boards').insert([
    {
      title: boardTitle,
      user_id: user.id,
    },
  ])

  if (error) {
    console.error('Insert error:', error.message)
  } else {
    console.log('Board inserted:', data)
    setBoardTitle('')
    fetchBoards(user.id)
  }
}


  return (
    <div style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      {user ? (
        <>
          <p>Welcome, {user.email}!</p>
          <div style={{ marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="New board title"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
            />
            <button onClick={handleCreateBoard}>Create Board</button>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3>Your Boards</h3>
          <ul>
            {boards.map((board) => (
              <li key={board.id}>
                <Link to={`/board/${board.id}`}>{board.title}</Link>
              </li>
            ))}
          </ul>
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  )
}

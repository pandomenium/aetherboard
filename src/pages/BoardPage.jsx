import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [board, setBoard] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')

  const [editingTask, setEditingTask] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    const fetchUserAndBoard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      console.log('Current user:', session.user)

      if (!session) {
        navigate('/login')
        return
      }

      setUser(session.user)

      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', id)
        .single()

      if (boardError || boardData.user_id !== session.user.id) {
        alert('Board not found or access denied')
        navigate('/dashboard')
      } else {
        setBoard(boardData)
        fetchTasks(boardData.id)
      }
    }

    fetchUserAndBoard()
  }, [id, navigate])

  const fetchTasks = async (boardId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })

    if (!error) {
      setTasks(data)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.trim()) return

    const { error } = await supabase.from('tasks').insert([
      {
        board_id: board.id,
        user_id: user.id,
        title: newTask,
        completed: false,
      },
    ])

    if (!error) {
      setNewTask('')
      fetchTasks(board.id)
    } else {
      console.error('Insert error:', error.message)
    }
  }

  const handleDeleteTask = async (taskId) => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
   if (error) {
     console.error('Delete error:', error)
     alert(`Delete failed: ${error.message}`)
   } else {
     fetchTasks(board.id)
   }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setEditTitle(task.title)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return

    console.log('Updating task:', editingTask.id, 'to', editTitle)

    const { error } = await supabase
        .from('tasks')
        .update({ title: editTitle })
        .eq('id', editingTask.id)

    if (error) {
        console.error('Edit error:', error)
        alert(`Edit failed: ${error.message}`)
    } else {
        setEditingTask(null)
        setEditTitle('')
        fetchTasks(board.id)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      {board ? (
        <>
          <h2>{board.title}</h2>

          <div style={{ marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="New task"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button onClick={handleAddTask}>Add Task</button>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3>Tasks</h3>
            <ul>
              {tasks.map((task) => (
                <li key={task.id}>
                  {task.title}{' '}
                  <button onClick={() => handleEditTask(task)}>✏️</button>
                  <button onClick={() => handleDeleteTask(task.id)}>🗑️</button>
                </li>
              ))}
            </ul>
          </div>

          {editingTask && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Editing Task</h4>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <button onClick={handleSaveEdit}>Save</button>
              <button onClick={() => setEditingTask(null)}>Cancel</button>
            </div>
          )}
        </>
      ) : (
        <p>Loading board...</p>
      )}
    </div>
    
  )
  
}

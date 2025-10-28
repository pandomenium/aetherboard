// src/pages/BoardPage.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [boardTitle, setBoardTitle] = useState('')
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskDuration, setNewTaskDuration] = useState('')
  const [loading, setLoading] = useState(false)

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    loadUser()
  }, [])

  // Fetch board + tasks
  useEffect(() => {
    fetchBoardAndTasks()
  }, [id])

  // Real-time auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('realtime-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.new?.board_id === id) {
            fetchBoardAndTasks()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  async function fetchBoardAndTasks() {
    try {
      const { data: boardData } = await supabase
        .from('boards')
        .select('title')
        .eq('id', id)
        .single()

      setBoardTitle(boardData?.title ?? 'Board')

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', id)
        .order('created_at', { ascending: true })

      if (tasksData) {
        const now = new Date()
        const updatedTasks = await Promise.all(
          tasksData.map(async (task) => {
            if (task.duration && !task.completed) {
              const created = new Date(task.created_at)
              let durationMs = 0

              if (task.duration.includes('h')) {
                durationMs = parseInt(task.duration) * 60 * 60 * 1000
              } else if (task.duration.includes('m')) {
                durationMs = parseInt(task.duration) * 60 * 1000
              }

              if (durationMs > 0 && created.getTime() + durationMs < now.getTime()) {
                if (!task.backlog) {
                  await supabase
                    .from('tasks')
                    .update({ backlog: true })
                    .eq('id', task.id)
                }
                return { ...task, backlog: true }
              }
            }
            return task
          })
        )

        setTasks(updatedTasks)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    if (!user?.id) {
      alert('You must be logged in to add tasks.')
      return
    }

    setLoading(true)

    const payload = {
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      duration: newTaskDuration.trim(),
      backlog: false,
      completed: false,
      completed_at: null,
      board_id: id,
      user_id: user.id,
    }

    const { error } = await supabase.from('tasks').insert([payload])

    if (!error) {
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskDuration('')
      await fetchBoardAndTasks()
    }

    setLoading(false)
  }

  const handleDeleteTask = async (taskId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this task?')
    if (!confirmDelete) return

    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setTasks(tasks.filter((t) => t.id !== taskId))
    }
  }

  const handleMarkDone = async (task) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        completed: true,
        backlog: false,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (!error) {
      await fetchBoardAndTasks()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const activeTasks = tasks.filter((t) => !t.backlog && !t.completed)
  const backlogTasks = tasks.filter((t) => t.backlog && !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)
  const completionPercent = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.4rem 0.8rem',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#1877f2',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          ← Dashboard
        </button>

        <h2 style={{ margin: 0, flex: 1, textAlign: 'center' }}>{boardTitle}</h2>

        <button
          onClick={handleLogout}
          style={{
            padding: '0.4rem 0.8rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#333',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Logout
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
          Completed: {completedTasks.length}/{tasks.length} ({completionPercent}%)
        </div>
        <div
          style={{
            height: '20px',
            width: '100%',
            maxWidth: '700px',
            margin: '0 auto',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#e5e7eb',
          }}
        >
          <div
            style={{
              width: `${completionPercent}%`,
              height: '100%',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #42b72a, #16a34a, #42b72a)',
              backgroundSize: '200% 100%',
              animation: 'gradientMove 3s ease infinite',
              transition: 'width 0.5s ease',
            }}
          ></div>
        </div>
        <style>{`
          @keyframes gradientMove {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 0%; }
            100% { background-position: 0% 0%; }
          }
        `}</style>
      </div>

      {/* Task Form */}
      <form
        onSubmit={handleAddTask}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <input
          type="text"
          placeholder="Task title"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '600px',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            background: '#fff',
          }}
        />
        <textarea
          placeholder="Task description..."
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
          rows="3"
          style={{
            width: '100%',
            maxWidth: '600px',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            background: '#fff',
          }}
        />
        <input
          type="text"
          placeholder="Task duration (e.g. 2h, 30m)"
          value={newTaskDuration}
          onChange={(e) => setNewTaskDuration(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '600px',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            background: '#fff',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#42b72a',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Add Task
        </button>
      </form>

      {/* Three Columns */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          justifyContent: 'center',
          alignItems: 'flex-start',
          marginTop: '2rem',
        }}
      >
        <TaskColumn title="Tasks" tasks={activeTasks} onDone={handleMarkDone} onDelete={handleDeleteTask} />
        <TaskColumn title="Backlog" tasks={backlogTasks} onDone={handleMarkDone} onDelete={handleDeleteTask} backlog />
        <TaskColumn title="Completed" tasks={completedTasks} onDelete={handleDeleteTask} completed />
      </div>
    </div>
  )
}

/* Task Column */
function TaskColumn({ title, tasks, onDone, onDelete, backlog = false, completed = false }) {
  return (
    <div style={{ flex: 1, maxWidth: '33%', maxHeight: '500px', overflowY: 'auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>{title}</h3>
      {tasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              backlog={backlog}
              completed={completed}
              onDone={onDone}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <p style={{ color: '#555', textAlign: 'center' }}>No {title.toLowerCase()} tasks</p>
      )}
    </div>
  )
}

/* Task Card */
function TaskCard({ task, backlog = false, completed = false, onDone, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)

  const saveEdit = async () => {
    await supabase.from('tasks').update({ title, description }).eq('id', task.id)
  }

  return (
    <div
      style={{
        background: backlog ? '#fff5f5' : completed ? '#f0fdf4' : '#fff',
        border: `1px solid ${backlog ? '#fca5a5' : completed ? '#86efac' : '#e6e6e6'}`,
        borderRadius: '10px',
        padding: '1rem',
        width: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        textAlign: 'left',
      }}
    >
      {/* Title */}
      {editingTitle ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            setEditingTitle(false)
            saveEdit()
          }}
          style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600 }}
        />
      ) : (
        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }} onClick={() => setEditingTitle(true)}>
          {task.title}
        </p>
      )}

      {/* Description */}
      {editingDesc ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            setEditingDesc(false)
            saveEdit()
          }}
          rows="2"
          style={{ width: '100%', margin: '0.5rem 0' }}
        />
      ) : (
        task.description && (
          <p style={{ margin: '0.5rem 0', color: '#555' }} onClick={() => setEditingDesc(true)}>
            {task.description}
          </p>
        )
      )}

      {task.duration && (
        <p style={{ margin: '0.25rem 0', color: '#333' }}>
          <strong>Duration:</strong> {task.duration}
        </p>
      )}
      {backlog && <p style={{ margin: '0.25rem 0', color: '#b91c1c', fontWeight: 600 }}>⚠️ Backlog (unfinished)</p>}
      {completed && (
        <>
          <p style={{ margin: '0.25rem 0', color: '#15803d', fontWeight: 600 }}>✅ Completed</p>
          {task.completed_at && (
            <small style={{ color: '#15803d' }}>Done: {new Date(task.completed_at).toLocaleString()}</small>
          )}
        </>
      )}
      <small style={{ color: '#888' }}>Created: {new Date(task.created_at).toLocaleString()}</small>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        {!completed && (
          <button
            onClick={() => onDone(task)}
            style={{
              padding: '0.4rem 0.8rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#16a34a',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Done
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          style={{
            padding: '0.4rem 0.8rem',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#dc2626',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

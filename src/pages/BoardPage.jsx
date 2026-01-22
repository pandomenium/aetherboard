// src/pages/BoardPage.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [boardTitle, setBoardTitle] = useState('')
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('tasks')
  const [viewMode, setViewMode] = useState('kanban')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskDuration, setNewTaskDuration] = useState('')
  const [newTaskStatus, setNewTaskStatus] = useState('New')
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Add Task modal extra states
  const [newTaskPriority, setNewTaskPriority] = useState('Low')
  const [newTaskAssignees, setNewTaskAssignees] = useState([])
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [allUsers, setAllUsers] = useState([])

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    loadUser()
  }, [])

  // Load all users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, name, avatarUrl')
      setAllUsers(data || [])
    }
    fetchUsers()
  }, [])

  // Fetch board & tasks
  useEffect(() => {
    fetchBoardAndTasks()
  }, [id])

  // Dark mode
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
  }, [darkMode])

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

      setTasks(tasksData || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleAddTask = async () => {
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
      status: newTaskStatus,
      completed: newTaskStatus === 'Completed',
      completed_at: newTaskStatus === 'Completed' ? new Date().toISOString() : null,
      board_id: id,
      user_id: user.id,
      priority: newTaskPriority,
      due_date: newTaskDueDate,
      assignees: newTaskAssignees,
      backlog: false,
    }

    const { error } = await supabase.from('tasks').insert([payload])
    if (!error) {
      setShowAddModal(false)
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskDuration('')
      setNewTaskStatus('New')
      setNewTaskPriority('Low')
      setNewTaskAssignees([])
      setNewTaskDueDate('')
      await fetchBoardAndTasks()
    } else console.error(error)

    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: '200px',
        background: darkMode ? '#1e1e1e' : '#f5f5f5',
        padding: '1rem',
        borderRight: '1px solid',
        borderColor: darkMode ? '#333' : '#ddd',
        color: darkMode ? '#e5e5e5' : '#222'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>{boardTitle}</h3>
        <SidebarButton label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} darkMode={darkMode} />
        <SidebarButton label="Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} darkMode={darkMode} />
        <SidebarButton label="Notes" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} darkMode={darkMode} />
        <SidebarButton label="Members" active={activeTab === 'members'} onClick={() => setActiveTab('members')} darkMode={darkMode} />
        <SidebarButton label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} darkMode={darkMode} />
        <button
          onClick={handleLogout}
          style={{
            marginTop: '2rem',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#dc2626',
            color: 'white',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto',
        background: darkMode ? '#121212' : 'white',
        color: darkMode ? '#e5e5e5' : '#222'
      }}>
        {activeTab === 'tasks' && (
          <>
            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <button
                  onClick={() => setViewMode('kanban')}
                  style={{
                    padding: '0.5rem 1rem',
                    marginRight: '0.5rem',
                    borderRadius: '6px',
                    border: viewMode === 'kanban' ? '2px solid #1877f2' : '1px solid #ccc',
                    background: darkMode ? '#333' : 'white',
                    color: darkMode ? '#e5e5e5' : 'black',
                    cursor: 'pointer',
                  }}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: viewMode === 'table' ? '2px solid #1877f2' : '1px solid #ccc',
                    background: darkMode ? '#333' : 'white',
                    color: darkMode ? '#e5e5e5' : 'black',
                    cursor: 'pointer',
                  }}
                >
                  Table
                </button>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: darkMode ? '#f3f3f3' : '#333',
                    color: darkMode ? '#333' : 'white',
                    cursor: 'pointer',
                    marginLeft: '0.5rem'
                  }}
                >
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#42b72a',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                + Add Task
              </button>
            </div>

            {viewMode === 'kanban' ? (
              <KanbanView tasks={tasks} darkMode={darkMode} fetchBoardAndTasks={fetchBoardAndTasks} />
            ) : (
              <TableView tasks={tasks} fetchBoardAndTasks={fetchBoardAndTasks} darkMode={darkMode} />
            )}
          </>
        )}

        {activeTab !== 'tasks' && <Placeholder title={activeTab} darkMode={darkMode} />}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          darkMode={darkMode}
          newTaskTitle={newTaskTitle}
          setNewTaskTitle={setNewTaskTitle}
          newTaskDesc={newTaskDesc}
          setNewTaskDesc={setNewTaskDesc}
          newTaskDuration={newTaskDuration}
          setNewTaskDuration={setNewTaskDuration}
          newTaskStatus={newTaskStatus}
          setNewTaskStatus={setNewTaskStatus}
          newTaskPriority={newTaskPriority}
          setNewTaskPriority={setNewTaskPriority}
          newTaskAssignees={newTaskAssignees}
          setNewTaskAssignees={setNewTaskAssignees}
          newTaskDueDate={newTaskDueDate}
          setNewTaskDueDate={setNewTaskDueDate}
          allUsers={allUsers}
          loading={loading}
          handleAddTask={handleAddTask}
          setShowAddModal={setShowAddModal}
        />
      )}
    </div>
  )
}

/* ---------------- Components ---------------- */

function SidebarButton({ label, active, onClick, darkMode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '0.5rem 1rem',
        marginBottom: '0.5rem',
        borderRadius: '6px',
        border: 'none',
        background: active ? '#1877f2' : darkMode ? '#2a2a2a' : 'white',
        color: active ? 'white' : darkMode ? '#e5e5e5' : '#333',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function Placeholder({ title, darkMode }) {
  return (
    <div style={{
      padding: '2rem',
      border: '2px dashed',
      borderColor: darkMode ? '#333' : '#ccc',
      borderRadius: '10px',
      textAlign: 'center',
      color: darkMode ? '#888' : '#888',
    }}>
      {title} content placeholder
    </div>
  )
}

/* Kanban view */
function KanbanView({ tasks, darkMode, fetchBoardAndTasks }) {
  const statusGroups = ['New', 'Scheduled', 'In Progress', 'Completed']
  const grouped = {}
  statusGroups.forEach(s => grouped[s] = tasks.filter(t => t.status === s))

  const onDragEnd = async (result) => {
    if (!result.destination) return
    const taskId = result.draggableId
    const newStatus = result.destination.droppableId
    try {
      await supabase.from('tasks').update({ status: newStatus, completed: newStatus === 'Completed' }).eq('id', taskId)
      fetchBoardAndTasks()
    } catch (err) { console.error(err) }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
        {statusGroups.map(status => (
          <Droppable droppableId={status} key={status}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  flex: '0 0 250px',
                  background: darkMode ? '#1e1e1e' : '#f9f9f9',
                  borderRadius: '10px',
                  padding: '1rem',
                  minHeight: '300px',
                }}
              >
                <h4 style={{ textAlign: 'center', marginBottom: '1rem' }}>{status}</h4>
                {grouped[status].map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          background: darkMode ? '#2a2a2a' : 'white',
                          border: `1px solid ${darkMode ? '#333' : '#ddd'}`,
                          borderRadius: '8px',
                          padding: '0.5rem',
                          marginBottom: '0.5rem',
                          ...provided.draggableProps.style
                        }}
                      >
                        <strong>{task.title}</strong>
                        <p style={{ fontSize: '0.85rem', color: darkMode ? '#ccc' : '#555' }}>{task.description}</p>
                        {task.duration && <p style={{ fontSize: '0.8rem', color: darkMode ? '#e5e5e5' : '#333' }}>Duration: {task.duration}</p>}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
}

/* Table view */
function TableView({ tasks, fetchBoardAndTasks, darkMode }) {
  const statusOptions = ['New', 'Scheduled', 'In Progress', 'Completed']

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await supabase.from('tasks').update({
        status: newStatus,
        completed: newStatus === 'Completed',
        completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
      }).eq('id', taskId)
      fetchBoardAndTasks()
    } catch (err) { console.error(err) }
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
      <thead>
        <tr style={{ background: darkMode ? '#1e1e1e' : '#f3f3f3' }}>
          <th style={thStyle}>Title</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Description</th>
          <th style={thStyle}>Duration</th>
        </tr>
      </thead>
      <tbody>
        {tasks.length > 0 ? tasks.map(task => (
          <tr key={task.id} style={{ borderBottom: '1px solid', borderColor: darkMode ? '#333' : '#eee' }}>
            <td style={tdStyle}>{task.title}</td>
            <td style={tdStyle}>
              <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)}
                style={{
                  padding: '0.25rem',
                  borderRadius: '6px',
                  border: `1px solid ${darkMode ? '#333' : '#ccc'}`,
                  background: darkMode ? '#2a2a2a' : 'white',
                  color: darkMode ? '#e5e5e5' : '#222',
                  cursor: 'pointer'
                }}
              >
                {statusOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </td>
            <td style={tdStyle}>{task.description}</td>
            <td style={tdStyle}>{task.duration}</td>
          </tr>
        )) : <tr><td colSpan="4" style={{ padding: '1rem', color: '#888' }}>No tasks</td></tr>}
      </tbody>
    </table>
  )
}

const thStyle = { padding: '0.5rem', borderBottom: '1px solid #ddd' }
const tdStyle = { padding: '0.5rem' }

/* Add Task Modal */
function AddTaskModal({ darkMode, newTaskTitle, setNewTaskTitle, newTaskDesc, setNewTaskDesc, newTaskDuration, setNewTaskDuration, newTaskStatus, setNewTaskStatus, newTaskPriority, setNewTaskPriority, newTaskAssignees, setNewTaskAssignees, newTaskDueDate, setNewTaskDueDate, allUsers, loading, handleAddTask, setShowAddModal }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={() => setShowAddModal(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? '#1e1e1e' : 'white',
          color: darkMode ? '#e5e5e5' : '#222',
          padding: '2rem',
          borderRadius: '10px',
          width: '400px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ marginBottom: '1rem' }}>Add New Task</h3>
        <input type="text" placeholder="Title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }} />
        <textarea placeholder="Description" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} rows="3"
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }} />
        <input type="text" placeholder="Duration" value={newTaskDuration} onChange={(e) => setNewTaskDuration(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }} />
        <select value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option>New</option><option>Scheduled</option><option>In Progress</option><option>Completed</option>
        </select>
        <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
        <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => setShowAddModal(false)}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleAddTask} disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', backgroundColor: '#42b72a', color: 'white', cursor: 'pointer' }}>Add</button>
        </div>
      </div>
    </div>
  )
}

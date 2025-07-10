import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard' 
import BoardPage from './pages/BoardPage' 
import MessagesPage from './pages/MessagesPage'
import TimesheetPage from './pages/TimesheetPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import PandoChat from './components/PandoChat'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/board/:id" element={<BoardPage />} />
        <Route
          path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
        />
        <Route
        path="/timesheet"
          element={
            <ProtectedRoute>
              <TimesheetPage />
            </ProtectedRoute>
            }
        />
      </Routes>
      
      <PandoChat />
    </Router>
  )
}

export default App

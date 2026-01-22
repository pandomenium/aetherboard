import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'

import Payroll from './pages/Payroll'
import Tickets from './pages/Tickets'
import Messages from './pages/Messages'
import Timesheet from './pages/Timesheet'
import ManagerTimesheet from './pages/ManagerTimesheet'

import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard' 
import BoardPage from './pages/BoardPage' 
import OvertimeApprovals from './pages/OvertimeApprovals'
import PayrollReview from './pages/PayrollReview'
import SmartFilterHR from './pages/SmartFilterHR'
import DocumentEditor from './pages/DocumentEditor'
import Documents from './pages/Documents'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import JuliaChat from './components/JuliaChat'


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>}/>
        <Route path="/timesheet"element={<ProtectedRoute><Timesheet /></ProtectedRoute>}/>
        <Route path="/manager-timesheet" element={<ProtectedRoute><ManagerTimesheet /></ProtectedRoute>} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/board/:id" element={<BoardPage />} />
        <Route path="/approvals" element={<OvertimeApprovals />} />
        <Route path="/payroll-review" element={<PayrollReview />} />
        <Route path="/smartfilter" element={<SmartFilterHR />} />
        <Route path="/document-editor" element={<DocumentEditor />} />
        <Route path="/document-editor/:id" element={<DocumentEditor />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />

      </Routes>
      <JuliaChat />
    </Router>
  )
}

export default App

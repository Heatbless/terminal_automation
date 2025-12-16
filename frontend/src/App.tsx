import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Register from './pages/Register'
import Scanner from './pages/Scanner'
import Admin from './pages/Admin'
import LocalhostOnly from './components/LocalhostOnly'
import './App.css'

// Component to handle pump ID setting and redirect
function PumpIdSetter() {
  const { pumpId } = useParams<{ pumpId: string }>()
  
  // Clear any existing pumpId first
  sessionStorage.removeItem('pumpId')
  
  // Validate and store pumpId
  if (pumpId === '1' || pumpId === '2') {
    sessionStorage.setItem('pumpId', pumpId)
    return <Navigate to="/register" replace />
  }
  
  // Invalid pump ID
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Invalid Pump ID</h1>
      <p>Please use pump 1 or pump 2.</p>
    </div>
  )
}

// Component to clear pumpId on other routes
function ClearPumpId() {
  sessionStorage.removeItem('pumpId')
  return null
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register/:pumpId" element={<PumpIdSetter />} />
        <Route path="/register" element={<Register />} />
        <Route path="/scanner" element={
          <>
            <ClearPumpId />
            <LocalhostOnly>
              <Scanner />
            </LocalhostOnly>
          </>
        } />
        <Route path="/admin" element={
          <>
            <ClearPumpId />
            <LocalhostOnly>
              <Admin />
            </LocalhostOnly>
          </>
        } />
        <Route path="/" element={
          <>
            <ClearPumpId />
            <Navigate to="/register/1" replace />
          </>
        } />
      </Routes>
    </Router>
  )
}

export default App

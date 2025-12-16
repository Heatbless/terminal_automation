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

// 404 Not Found component
function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: '72px', margin: '0' }}>404</h1>
      <h2 style={{ fontSize: '24px', margin: '20px 0' }}>Page Not Found</h2>
      <p style={{ fontSize: '16px', color: '#666' }}>The page you are looking for does not exist.</p>
    </div>
  )
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
            <NotFound />
          </>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App

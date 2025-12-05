import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Register from './pages/Register'
import Scanner from './pages/Scanner'
import Admin from './pages/Admin'
import LocalhostOnly from './components/LocalhostOnly'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/scanner" element={
          <LocalhostOnly>
            <Scanner />
          </LocalhostOnly>
        } />
        <Route path="/admin" element={
          <LocalhostOnly>
            <Admin />
          </LocalhostOnly>
        } />
      </Routes>
    </Router>
  )
}

export default App

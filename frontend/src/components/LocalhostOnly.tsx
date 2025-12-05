import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

interface LocalhostOnlyProps {
  children: React.ReactNode
}

function LocalhostOnly({ children }: LocalhostOnlyProps) {
  const [isLocalhost, setIsLocalhost] = useState<boolean | null>(null)

  useEffect(() => {
    const hostname = window.location.hostname
    const isLocal = 
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      !!hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    
    setIsLocalhost(isLocal)
  }, [])

  if (isLocalhost === null) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    )
  }

  if (!isLocalhost) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default LocalhostOnly

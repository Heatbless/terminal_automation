import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import axios from 'axios'
import mqtt from 'mqtt'
import './Scanner.css'

function Scanner() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mqttConnected, setMqttConnected] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [cameras, setCameras] = useState<any[]>([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const isProcessingRef = useRef(false)
  const mqttClientRef = useRef<any>(null)
  const connectionTimeoutRef = useRef<any>(null)
  const heartbeatIntervalRef = useRef<any>(null)
  const currentUrlIndexRef = useRef(0)
  
  // MQTT configuration - use relative paths that nginx will proxy
  const mqttTopic = '/esp32/pump-switch'
  const mqttUrls = [
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/mqtt/`,
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/mqtt-backup/`
  ]
  
  // Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices)
        setSelectedCamera(devices[0].id)
      }
    }).catch(err => {
      console.error('Error getting cameras:', err)
    })

    // Connect to MQTT broker via WebSocket with retry logic
    const connectToMQTT = () => {
      const currentUrl = mqttUrls[currentUrlIndexRef.current]
      console.log('Attempting to connect to:', currentUrl)
      
      // Clear any existing client
      if (mqttClientRef.current) {
        mqttClientRef.current.end(true)
      }
      
      const client = mqtt.connect(currentUrl, {
        reconnectPeriod: 0,
        connectTimeout: 5000,
        keepalive: 30  // Send keepalive ping every 30 seconds
      })
      
      // Set 5 second timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (!client.connected) {
          console.log('Connection timeout, trying next URL')
          client.end(true)
          // Switch to next URL
          currentUrlIndexRef.current = (currentUrlIndexRef.current + 1) % mqttUrls.length
          connectToMQTT()
        }
      }, 5000)
      
      client.on('connect', () => {
        console.log('Connected to MQTT:', currentUrl)
        setMqttConnected(true)
        setError('')
        // Clear timeout on successful connection
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
        }
        
        // Start heartbeat interval - publish to heartbeat topic every 20 seconds
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (client.connected) {
            client.publish('/heartbeat', JSON.stringify({ 
              timestamp: Date.now(),
              source: 'scanner-app'
            }), { qos: 0 })
            console.log('Heartbeat sent')
          }
        }, 20000) // 20 seconds
      })
      
      client.on('error', (err) => {
        console.error('MQTT connection error:', err)
        setMqttConnected(false)
      })
      
      client.on('close', () => {
        console.log('MQTT connection closed')
        setMqttConnected(false)
        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        // Only try to reconnect if connection was lost (not manually closed)
        if (mqttClientRef.current === client) {
          setTimeout(() => {
            currentUrlIndexRef.current = (currentUrlIndexRef.current + 1) % mqttUrls.length
            connectToMQTT()
          }, 5000)
        }
      })
      
      mqttClientRef.current = client
    }
    
    connectToMQTT()

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop()
      }
      if (mqttClientRef.current) {
        mqttClientRef.current.end()
      }
    }
  }, [])

  useEffect(() => {
    // Auto-start scanning when camera is selected
    if (selectedCamera && !scanning) {
      handleStartScan()
    }
  }, [selectedCamera])

  const handleStartScan = async () => {
    try {
      setError('')
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        selectedCamera || { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Skip if already processing a scan
          if (isProcessingRef.current) return
          
          isProcessingRef.current = true
          
          // Process the scanned UID
          await processScannedUID(decodedText)
          
          // Wait 3 seconds before allowing next scan
          setTimeout(() => {
            isProcessingRef.current = false
          }, 3000)
        },
        () => {
          // Ignore decode errors during scanning
        }
      )
      setScanning(true)
    } catch (err: any) {
      setError('Failed to start camera: ' + err.message)
      setScanning(false)
    }
  }

  const handleStopScan = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
        setScanning(false)
      } catch (err: any) {
        setError('Failed to stop camera: ' + err.message)
      }
    }
  }

  const sendToMQTT = async () => {
    console.log('sendToMQTT called, MQTT connected:', mqttClientRef.current?.connected)
    try {
      setError('')
      setSuccess('')
      
      if (mqttClientRef.current && mqttClientRef.current.connected) {
        console.log('Publishing to MQTT topic:', mqttTopic)
        mqttClientRef.current.publish(mqttTopic, 'on', { qos: 1 }, (err: any) => {
          if (err) {
            console.error('MQTT publish error:', err)
            setError('Failed to send to MQTT')
          } else {
            console.log('MQTT publish successful')
            setSuccess('Data sent to MQTT successfully!')
            setTimeout(() => setSuccess(''), 3000)
          }
        })
      } else {
        console.log('MQTT not connected')
        setError('MQTT not connected')
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error'
      console.error('MQTT Error:', errorMsg)
      setError('MQTT Error: ' + errorMsg)
    }
  }

  const processScannedUID = async (uid: string) => {
    try {
      setError('')
      setSuccess('')

      // Step 1: Fetch data from Access table using UID
      const accessResponse = await axios.get(
        `${supabaseUrl}/rest/v1/access?uid=eq.${uid}&select=uid,driver_id,plate_num`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )

      if (!accessResponse.data || accessResponse.data.length === 0) {
        setError('UID not found in access table')
        return
      }

      const accessData = accessResponse.data[0]

      // Step 2: Insert to access_log table
      await axios.post(
        `${supabaseUrl}/rest/v1/access_log`,
        {
          uid: accessData.uid,
          driver_id: accessData.driver_id,
          plate_num: accessData.plate_num,
          created_at: new Date().toISOString()
        },
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      )

      // Step 3: Delete from access table
      await axios.delete(
        `${supabaseUrl}/rest/v1/access?uid=eq.${uid}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )

      // Step 4: Send to MQTT
      await sendToMQTT()

      setSuccess(`Access logged for ${accessData.plate_num} (${accessData.driver_id})`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message
      setError('Failed to process access: ' + errorMsg)
    }
  }

  return (
    <div className="app-container">
      <h1>QR Code Scanner</h1>
      
      {mqttConnected ? (
        <div className="success-message">MQTT Connected</div>
      ) : (
        <div className="error-message">MQTT Disconnected</div>
      )}

      {cameras.length > 1 && !scanning && (
        <div className="camera-select">
          <label htmlFor="camera-select">Select Camera:</label>
          <select 
            id="camera-select"
            value={selectedCamera} 
            onChange={(e) => setSelectedCamera(e.target.value)}
          >
            {cameras.map(camera => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="scanner-section">
        <div id="qr-reader" className={scanning ? 'active' : 'inactive'}></div>
        
        {!scanning ? (
          <button onClick={handleStartScan} className="scan-btn">
            Start Scanning
          </button>
        ) : (
          <button onClick={handleStopScan} className="stop-btn">
            Stop Scanning
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
    </div>
  )
}

export default Scanner

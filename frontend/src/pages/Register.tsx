import { useState } from 'react'
import axios from 'axios'
import QRCode from 'qrcode'
import './Register.css'

function Register() {
  const [formData, setFormData] = useState({
    driverId: '',
    plateNumber: ''
  })
  
  const [displayValues, setDisplayValues] = useState({
    driverId: '',
    plateNumber: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  
  // Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const supabaseTruckTable = 'truck'
  const supabaseAccessTable = 'access'

  const handleDriverIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase()
    
    // Remove everything except letters, numbers, and dashes
    value = value.replace(/[^A-Z0-9-]/g, '')
    
    // Limit total length with dash
    if (value.length > 7) value = value.substring(0, 7)
    
    // Store clean value (without dashes)
    const cleanValue = value.replace(/-/g, '')
    
    // Validate format (3 letters, 3 numbers)
    const letters = cleanValue.substring(0, 3)
    const numbers = cleanValue.substring(3)
    
    if (letters.length > 0 && !/^[A-Z]*$/.test(letters)) return
    if (numbers.length > 0 && !/^[0-9]*$/.test(numbers)) return
    if (cleanValue.length > 6) return
    
    setFormData({ ...formData, driverId: cleanValue })
    setDisplayValues({ ...displayValues, driverId: value })
  }

  const handlePlateNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase()
    
    // Remove everything except letters, numbers, and dashes
    value = value.replace(/[^A-Z0-9-]/g, '')
    
    // Limit total length with dashes
    if (value.length > 12) value = value.substring(0, 12)
    
    // Store clean value (without dashes)
    const cleanValue = value.replace(/-/g, '')
    
    // Parse parts from clean value for validation
    let part1 = ''
    let part2 = ''
    let part3 = ''
    let remaining = cleanValue
    
    // First part: 1-2 letters
    const letters1Match = remaining.match(/^[A-Z]{1,2}/)
    if (letters1Match) {
      part1 = letters1Match[0]
      remaining = remaining.substring(part1.length)
    }
    
    // Second part: 1-4 numbers
    const numbersMatch = remaining.match(/^[0-9]{1,4}/)
    if (numbersMatch) {
      part2 = numbersMatch[0]
      remaining = remaining.substring(part2.length)
    }
    
    // Third part: up to 3 letters
    const letters2Match = remaining.match(/^[A-Z]{1,3}/)
    if (letters2Match) {
      part3 = letters2Match[0]
    }
    
    // Validate the format
    if (part1 && !/^[A-Z]{1,2}$/.test(part1)) return
    if (part2 && !/^[0-9]{1,4}$/.test(part2)) return
    if (part3 && !/^[A-Z]{1,3}$/.test(part3)) return
    
    setFormData({ ...formData, plateNumber: cleanValue })
    setDisplayValues({ ...displayValues, plateNumber: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate Driver ID (must be exactly 3 letters + 3 numbers)
    if (formData.driverId.length !== 6 || 
        !/^[A-Z]{3}[0-9]{3}$/.test(formData.driverId)) {
      setMessage({ type: 'error', text: 'Driver ID must be 3 letters followed by 3 numbers (e.g., ABC123)' })
      return
    }
    
    // Validate Plate Number
    const plateRegex = /^[A-Z]{1,2}[0-9]{1,4}[A-Z]{1,3}$/
    if (!plateRegex.test(formData.plateNumber)) {
      setMessage({ type: 'error', text: 'Invalid plate number format' })
      return
    }
    
    setIsSubmitting(true)
    setMessage({ type: '', text: '' })
    
    try {
      // Step 1: Validate if driver_id and plate_num exist in Truck table
      const truckValidation = await axios.get(
        `${supabaseUrl}/rest/v1/${supabaseTruckTable}?driver_id=eq.${formData.driverId}&plate_num=eq.${formData.plateNumber}&select=driver_id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      // If data doesn't exist in Truck table, deny access
      if (!truckValidation.data || truckValidation.data.length === 0) {
        setMessage({ type: 'error', text: 'Driver ID and Plate Number not found in system. Access denied.' })
        setIsSubmitting(false)
        return
      }
      
      // Step 2: Check if data already exists in Access table
      const checkResponse = await axios.get(
        `${supabaseUrl}/rest/v1/${supabaseAccessTable}?driver_id=eq.${formData.driverId}&plate_num=eq.${formData.plateNumber}&select=uid`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      let uid: string
      
      if (checkResponse.data && checkResponse.data.length > 0) {
        // Data already exists, use existing UID and show QR code only
        uid = checkResponse.data[0].uid
        
        // Generate and download QR code
        const qrDataUrl = await QRCode.toDataURL(uid)
        
        // Display QR code
        setQrCodeUrl(qrDataUrl)
        
        // Download QR code
        const link = document.createElement('a')
        link.href = qrDataUrl
        link.download = `${formData.plateNumber}_QR.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        setMessage({ type: 'success', text: 'Already registered. QR code downloaded.' })
      } else {
        // Data doesn't exist, insert to Access table
        const insertResponse = await axios.post(
          `${supabaseUrl}/rest/v1/${supabaseAccessTable}`,
          {
            driver_id: formData.driverId,
            plate_num: formData.plateNumber
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
        
        // Retrieve UID from the insert response
        if (insertResponse.data && insertResponse.data.length > 0) {
          uid = insertResponse.data[0].uid
        } else {
          // If not in response, fetch it
          const accessResponse = await axios.get(
            `${supabaseUrl}/rest/v1/${supabaseAccessTable}?driver_id=eq.${formData.driverId}&plate_num=eq.${formData.plateNumber}&select=uid`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            }
          )
          uid = accessResponse.data[0].uid
        }
        
        // Generate and download QR code
        const qrDataUrl = await QRCode.toDataURL(uid)
        
        // Display QR code
        setQrCodeUrl(qrDataUrl)
        
        // Download QR code
        const link = document.createElement('a')
        link.href = qrDataUrl
        link.download = `${formData.plateNumber}_QR.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        setMessage({ type: 'success', text: 'Registration successful! QR code downloaded.' })
      }
      
      // Clear form after successful submission
      setFormData({ driverId: '', plateNumber: '' })
      setDisplayValues({ driverId: '', plateNumber: '' })
      
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed. Please try again.'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Register</h1>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="driverId">Driver ID:</label>
            <input
              type="text"
              id="driverId"
              name="driverId"
              value={displayValues.driverId}
              onChange={handleDriverIdChange}
              required
              className="form-input"
              placeholder="ABC-123"
              maxLength={7}
            />
          </div>
          <div className="form-group">
            <label htmlFor="plateNumber">Plate Number:</label>
            <input
              type="text"
              id="plateNumber"
              name="plateNumber"
              value={displayValues.plateNumber}
              onChange={handlePlateNumberChange}
              required
              className="form-input"
              placeholder="B-1234-ABC"
              maxLength={12}
            />
          </div>
          <button type="submit" className="register-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        {qrCodeUrl && (
          <div className="qr-code-section">
            <h2>QR Code</h2>
            <div className="qr-code-display">
              <img src={qrCodeUrl} alt="QR Code" className="qr-code-image" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Register

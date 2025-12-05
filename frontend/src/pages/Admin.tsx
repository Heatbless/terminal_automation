import { useState, useEffect } from 'react'
import axios from 'axios'
import './Admin.css'

interface TruckRow {
  id: number
  driver_id: string
  plate_num: string
}

interface AccessRow {
  uid: string
  driver_id: string
  plate_num: string
}

interface AccessLogRow {
  id: number
  uid: string
  driver_id: string
  plate_num: string
  created_at: string
}

function Admin() {
  const [activeTab, setActiveTab] = useState<'truck' | 'access' | 'access_log' | 'add'>('truck')
  const [truckData, setTruckData] = useState<TruckRow[]>([])
  const [accessData, setAccessData] = useState<AccessRow[]>([])
  const [accessLogData, setAccessLogData] = useState<AccessLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Form for adding new truck
  const [newTruck, setNewTruck] = useState({
    driverId: '',
    plateNumber: ''
  })
  
  // Edit modal state
  const [editModal, setEditModal] = useState<{
    show: boolean
    table: 'truck' | 'access' | 'access_log'
    data: any
  }>({
    show: false,
    table: 'truck',
    data: null
  })

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    if (activeTab === 'truck') {
      fetchTruckData()
    } else if (activeTab === 'access') {
      fetchAccessData()
    } else if (activeTab === 'access_log') {
      fetchAccessLogData()
    }
  }, [activeTab])

  const fetchTruckData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        `${supabaseUrl}/rest/v1/truck?select=*&order=id.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )
      setTruckData(response.data)
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to fetch truck data: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchAccessData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        `${supabaseUrl}/rest/v1/access?select=*.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )
      setAccessData(response.data)
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to fetch access data: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchAccessLogData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        `${supabaseUrl}/rest/v1/access_log?select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )
      setAccessLogData(response.data)
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to fetch access log data: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Check for duplicate driver_id and plate_num combination
      const checkResponse = await axios.get(
        `${supabaseUrl}/rest/v1/truck?driver_id=eq.${newTruck.driverId}&plate_num=eq.${newTruck.plateNumber}&select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )

      if (checkResponse.data && checkResponse.data.length > 0) {
        setMessage({ type: 'error', text: 'This Driver ID and Plate Number combination already exists!' })
        setLoading(false)
        return
      }

      await axios.post(
        `${supabaseUrl}/rest/v1/truck`,
        {
          driver_id: newTruck.driverId,
          plate_num: newTruck.plateNumber
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
      
      setMessage({ type: 'success', text: 'Truck added successfully!' })
      setNewTruck({ driverId: '', plateNumber: '' })
      fetchTruckData()
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to add truck: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (table: 'truck' | 'access' | 'access_log', data: any) => {
    setEditModal({ show: true, table, data: { ...data } })
  }

  const handleSaveEdit = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { table, data } = editModal
      let endpoint = ''
      let updateData: any = {}

      if (table === 'truck') {
        // Check for duplicate driver_id and plate_num combination (excluding current row)
        const checkResponse = await axios.get(
          `${supabaseUrl}/rest/v1/truck?driver_id=eq.${data.driver_id}&plate_num=eq.${data.plate_num}&id=neq.${data.id}&select=id`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        )

        if (checkResponse.data && checkResponse.data.length > 0) {
          setMessage({ type: 'error', text: 'This Driver ID and Plate Number combination already exists!' })
          setLoading(false)
          return
        }

        endpoint = `${supabaseUrl}/rest/v1/truck?id=eq.${data.id}`
        updateData = {
          driver_id: data.driver_id,
          plate_num: data.plate_num
        }
      } else if (table === 'access') {
        // Check for duplicate driver_id and plate_num combination (excluding current row)
        const checkResponse = await axios.get(
          `${supabaseUrl}/rest/v1/access?driver_id=eq.${data.driver_id}&plate_num=eq.${data.plate_num}&uid=neq.${data.uid}&select=uid`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        )

        if (checkResponse.data && checkResponse.data.length > 0) {
          setMessage({ type: 'error', text: 'This Driver ID and Plate Number combination already exists!' })
          setLoading(false)
          return
        }

        endpoint = `${supabaseUrl}/rest/v1/access?uid=eq.${data.uid}`
        updateData = {
          driver_id: data.driver_id,
          plate_num: data.plate_num
        }
      } else if (table === 'access_log') {
        endpoint = `${supabaseUrl}/rest/v1/access_log?id=eq.${data.id}`
        updateData = { ...data }
        delete updateData.id
      }

      await axios.patch(
        endpoint,
        updateData,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      )

      setMessage({ type: 'success', text: 'Updated successfully!' })
      setEditModal({ show: false, table: 'truck', data: null })
      
      // Refresh data
      if (table === 'truck') fetchTruckData()
      else if (table === 'access') fetchAccessData()
      else if (table === 'access_log') fetchAccessLogData()
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to update: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (table: 'truck' | 'access' | 'access_log', id: any) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      let endpoint = ''
      if (table === 'truck') {
        endpoint = `${supabaseUrl}/rest/v1/truck?id=eq.${id}`
      } else if (table === 'access') {
        endpoint = `${supabaseUrl}/rest/v1/access?uid=eq.${id}`
      } else if (table === 'access_log') {
        endpoint = `${supabaseUrl}/rest/v1/access_log?id=eq.${id}`
      }

      await axios.delete(endpoint, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })

      setMessage({ type: 'success', text: 'Deleted successfully!' })
      
      // Refresh data
      if (table === 'truck') fetchTruckData()
      else if (table === 'access') fetchAccessData()
      else if (table === 'access_log') fetchAccessLogData()
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to delete: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-panel">
        <h1>Admin Panel</h1>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="tabs">
          <button 
            className={activeTab === 'add' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('add')}
          >
            Add Truck
          </button>
          <button 
            className={activeTab === 'truck' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('truck')}
          >
            Truck Table
          </button>
          <button 
            className={activeTab === 'access' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('access')}
          >
            Access Table
          </button>
          <button 
            className={activeTab === 'access_log' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('access_log')}
          >
            Access Log
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'add' && (
            <div className="add-form">
              <h2>Add New Truck</h2>
              <form onSubmit={handleAddTruck}>
                <div className="form-group">
                  <label>Driver ID:</label>
                  <input
                    type="text"
                    value={newTruck.driverId}
                    onChange={(e) => setNewTruck({ ...newTruck, driverId: e.target.value.toUpperCase() })}
                    placeholder="ABC123"
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Plate Number:</label>
                  <input
                    type="text"
                    value={newTruck.plateNumber}
                    onChange={(e) => setNewTruck({ ...newTruck, plateNumber: e.target.value.toUpperCase() })}
                    placeholder="B1234ABC"
                    required
                    className="form-input"
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Truck'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'truck' && (
            <div className="table-view">
              <h2>Truck Table</h2>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Driver ID</th>
                        <th>Plate Number</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {truckData.map((row) => (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.driver_id}</td>
                          <td>{row.plate_num}</td>
                          <td>
                            <button className="btn-edit" onClick={() => handleEdit('truck', row)}>Edit</button>
                            <button className="btn-delete" onClick={() => handleDelete('truck', row.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'access' && (
            <div className="table-view">
              <h2>Access Table</h2>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>UID</th>
                        <th>Driver ID</th>
                        <th>Plate Number</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessData.map((row) => (
                        <tr key={row.uid}>
                          <td>{row.uid}</td>
                          <td>{row.driver_id}</td>
                          <td>{row.plate_num}</td>
                          <td>
                            <button className="btn-edit" onClick={() => handleEdit('access', row)}>Edit</button>
                            <button className="btn-delete" onClick={() => handleDelete('access', row.uid)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'access_log' && (
            <div className="table-view">
              <h2>Access Log</h2>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>UID</th>
                        <th>Driver ID</th>
                        <th>Plate Number</th>
                        <th>Timestamp</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLogData.map((row) => (
                        <tr key={row.id}>
                          <td>{row.uid}</td>
                          <td>{row.driver_id}</td>
                          <td>{row.plate_num}</td>
                          <td>{new Date(row.created_at).toLocaleString()}</td>
                          <td>
                            <button className="btn-edit" onClick={() => handleEdit('access_log', row)}>Edit</button>
                            <button className="btn-delete" onClick={() => handleDelete('access_log', row.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editModal.show && (
        <div className="modal-overlay" onClick={() => setEditModal({ show: false, table: 'truck', data: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit {editModal.table.charAt(0).toUpperCase() + editModal.table.slice(1)}</h2>
            <div className="form-group">
              {editModal.table === 'truck' && (
                <>
                  <label>Driver ID:</label>
                  <input
                    type="text"
                    value={editModal.data.driver_id}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, driver_id: e.target.value.toUpperCase() } 
                    })}
                    className="form-input"
                  />
                  <label>Plate Number:</label>
                  <input
                    type="text"
                    value={editModal.data.plate_num}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, plate_num: e.target.value.toUpperCase() } 
                    })}
                    className="form-input"
                  />
                </>
              )}
              {editModal.table === 'access' && (
                <>
                  <label>UID (Read-only):</label>
                  <input
                    type="text"
                    value={editModal.data.uid}
                    disabled
                    className="form-input"
                  />
                  <label>Driver ID:</label>
                  <input
                    type="text"
                    value={editModal.data.driver_id}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, driver_id: e.target.value.toUpperCase() } 
                    })}
                    className="form-input"
                  />
                  <label>Plate Number:</label>
                  <input
                    type="text"
                    value={editModal.data.plate_num}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, plate_num: e.target.value.toUpperCase() } 
                    })}
                    className="form-input"
                  />
                </>
              )}
              {editModal.table === 'access_log' && (
                <>
                  <label>ID (Read-only):</label>
                  <input
                    type="text"
                    value={editModal.data.id}
                    disabled
                    className="form-input"
                  />
                  <label>UID:</label>
                  <input
                    type="text"
                    value={editModal.data.uid}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, uid: e.target.value } 
                    })}
                    className="form-input"
                  />
                  <label>Driver ID:</label>
                  <input
                    type="text"
                    value={editModal.data.driver_id}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, driver_id: e.target.value.toUpperCase() } 
                    })}
                    className="form-input"
                  />
                  <label>Plate Number:</label>
                  <input
                    type="text"
                    value={editModal.data.plate_num}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, plate_num: e.target.value.toUpperCase() } 
                    })}
                    className="form-input"
                  />
                  <label>Timestamp:</label>
                  <input
                    type="datetime-local"
                    value={editModal.data.timestamp ? new Date(editModal.data.timestamp).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditModal({ 
                      ...editModal, 
                      data: { ...editModal.data, timestamp: new Date(e.target.value).toISOString() } 
                    })}
                    className="form-input"
                  />
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSaveEdit} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button className="btn-secondary" onClick={() => setEditModal({ show: false, table: 'truck', data: null })}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin

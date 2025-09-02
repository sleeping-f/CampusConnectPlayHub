import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit3, FiTrash2, FiClock, FiMapPin, FiX } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import './RoutineManager.css';

const RoutineManager = ({ user }) => {
  const [routines, setRoutines] = useState([]);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // FIX: correct state name (was foArmData)
  const [formData, setFormData] = useState({
    day: 'monday',
    startTime: '09:00',
    endTime: '10:00',
    activity: '',
    location: '',
    type: 'class'
  });
  const [submitting, setSubmitting] = useState(false);

  // same auth header pattern you already use in FriendFinder :contentReference[oaicite:4]{index=4}
  const authHeaders = () => {
    try {
      const t = localStorage.getItem('token');
      return t ? { Authorization: `Bearer ${t}` } : {};
<<<<<<< HEAD
    } catch { return {}; }
=======
    } catch {
      return {};
    }
>>>>>>> 623e25949a0e01a86298b67241a4852ee060a231
  };

  const days = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];

  useEffect(() => {
    if (user) fetchRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/routines', { headers: authHeaders() });
      setRoutines(res.data.routines || []);
    } catch (e) {
      console.error('Error fetching routines:', e);
      toast.error('Failed to load routines');
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  // 🔒 Block non-students
  if (!user || user.role !== 'student') {
    return (
      <div className="routine-management-disabled">
        <p> Only students can use the Routines feature.</p>
      </div>
    );
  }

=======
>>>>>>> 623e25949a0e01a86298b67241a4852ee060a231
  const getRoutinesForDay = (day) => routines.filter(r => r.day === day);

  const getTypeColor = (type) => ({
    class: '#667eea', study: '#10b981', break: '#f59e0b', activity: '#8b5cf6'
  }[type] || '#667eea');

  const getTypeLabel = (type) => ({
    class: 'Class', study: 'Study', break: 'Break', activity: 'Activity'
  }[type] || type);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.activity.trim() || !formData.location.trim()) {
      toast.error('Please fill in all required fields'); return;
    }
    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time'); return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post('/api/routines', formData, { headers: authHeaders() });
      setRoutines(prev => [...prev, res.data.routine]);
      setSelectedDay(formData.day);
      setFormData({ day: 'monday', startTime: '09:00', endTime: '10:00', activity: '', location: '', type: 'class' });
      setShowForm(false);
      toast.success('Routine added successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to add routine';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoutine = async (id) => {
    try {
      await axios.delete(`/api/routines/${id}`, { headers: authHeaders() });
      setRoutines(prev => prev.filter(r => r.id !== id));
      toast.success('Routine deleted successfully!');
    } catch {
      toast.error('Failed to delete routine');
    }
  };

  const openForm = () => {
    setFormData({ day: selectedDay, startTime: '09:00', endTime: '10:00', activity: '', location: '', type: 'class' });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setFormData({ day: 'monday', startTime: '09:00', endTime: '10:00', activity: '', location: '', type: 'class' });
  };

  if (loading) {
    return (
      <div className="routine-loading">
        <div className="loading-spinner"></div>
        <p>Loading your routine...</p>
      </div>
    );
  }

<<<<<<< HEAD
=======
  // 🔒 Block non-students
  if (!user || user.role !== 'student') {
    return (
      <div className="routine-management-disabled">
        <p> Only students can use the Routines feature.</p>
      </div>
    );
  }

>>>>>>> 623e25949a0e01a86298b67241a4852ee060a231
  return (
    <div className="routine-manager">
      <div className="routine-header">
        <h2>My Routine</h2>
        <motion.button className="btn btn-primary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openForm}>
          <FiPlus /> Add Routine
        </motion.button>
      </div>

      {showForm && (
        <motion.div className="routine-form-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="routine-form" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
            <div className="form-header">
              <h3>Add New Routine</h3>
              <button className="close-btn" onClick={closeForm}><FiX /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="day">Day</label>
                  <select id="day" name="day" value={formData.day} onChange={handleInputChange} required>
                    {days.map(d => (<option key={d.id} value={d.id}>{d.label}</option>))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <select id="type" name="type" value={formData.type} onChange={handleInputChange} required>
                    <option value="class">Class</option>
                    <option value="study">Study</option>
                    <option value="break">Break</option>
                    <option value="activity">Activity</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">Start Time</label>
                  <input type="time" id="startTime" name="startTime" value={formData.startTime} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <input type="time" id="endTime" name="endTime" value={formData.endTime} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="activity">Activity</label>
                <input type="text" id="activity" name="activity" value={formData.activity} onChange={handleInputChange} placeholder="e.g., Computer Science 101" required />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input type="text" id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., Room 301" required />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeForm} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add Routine'}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <div className="day-selector">
        {days.map(d => {
          const dayRoutines = getRoutinesForDay(d.id);
          return (
            <motion.button key={d.id} className={`day-btn ${selectedDay === d.id ? 'active' : ''}`} onClick={() => setSelectedDay(d.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span className="day-label">{d.label}</span>
              <div className="day-count-badge">{dayRoutines.length}</div>
            </motion.button>
          );
        })}
      </div>

      <div className="routine-content">
        <div className="routine-timeline">
          {getRoutinesForDay(selectedDay).length === 0 ? (
            <div className="empty-routine">
              <div className="empty-icon">📅</div>
              <h3>No routines for {days.find(d => d.id === selectedDay)?.label}</h3>
              <p>Add your first routine to get started!</p>
            </div>
          ) : (
            getRoutinesForDay(selectedDay)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map(r => (
                <motion.div key={r.id} className="routine-item" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="routine-type-indicator" style={{ backgroundColor: getTypeColor(r.type) }}>{getTypeLabel(r.type)}</div>
                  <div className="routine-details">
                    <div className="routine-header-info">
                      <h3>{r.activity}</h3>
                      <div className="routine-actions">
                        <button className="action-btn"><FiEdit3 /></button>
                        <button className="action-btn delete" onClick={() => handleDeleteRoutine(r.id)}><FiTrash2 /></button>
                      </div>
                    </div>
                    <div className="routine-info">
                      <div className="info-item"><FiClock /><span>{r.startTime} - {r.endTime}</span></div>
                      <div className="info-item"><FiMapPin /><span>{r.location}</span></div>
                    </div>
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutineManager;
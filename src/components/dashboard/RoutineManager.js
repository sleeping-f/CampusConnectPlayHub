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
  const [formData, setFormData] = useState({
    day: 'monday',
    startTime: '09:00',
    endTime: '10:00',
    activity: '',
    location: '',
    type: 'class'
  });
  const [submitting, setSubmitting] = useState(false);

  const days = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];

  // Fetch routines from backend
  useEffect(() => {
    if (user) {
      fetchRoutines();
    }
  }, [user]);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/routines');
      setRoutines(response.data.routines || []);
    } catch (error) {
      console.error('Error fetching routines:', error);
      toast.error('Failed to load routines');
    } finally {
      setLoading(false);
    }
  };

  const getRoutinesForDay = (day) => {
    return routines.filter(routine => routine.day === day);
  };

  const getTypeColor = (type) => {
    const colors = {
      class: '#667eea',
      study: '#10b981',
      break: '#f59e0b',
      activity: '#8b5cf6'
    };
    return colors[type] || '#667eea';
  };

  const getTypeLabel = (type) => {
    const labels = {
      class: 'Class',
      study: 'Study',
      break: 'Break',
      activity: 'Activity'
    };
    return labels[type] || type;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.activity.trim() || !formData.location.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post('/api/routines', formData);

      // Add new routine to state
      setRoutines(prev => [...prev, response.data.routine]);

      // Switch to the day where the routine was added
      setSelectedDay(formData.day);

      // Reset form and close
      setFormData({
        day: 'monday',
        startTime: '09:00',
        endTime: '10:00',
        activity: '',
        location: '',
        type: 'class'
      });
      setShowForm(false);

      toast.success('Routine added successfully!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add routine';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoutine = async (routineId) => {
    try {
      await axios.delete(`/api/routines/${routineId}`);
      setRoutines(prev => prev.filter(routine => routine.id !== routineId));
      toast.success('Routine deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete routine');
    }
  };

  const openForm = () => {
    setFormData({
      day: selectedDay,
      startTime: '09:00',
      endTime: '10:00',
      activity: '',
      location: '',
      type: 'class'
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      day: 'monday',
      startTime: '09:00',
      endTime: '10:00',
      activity: '',
      location: '',
      type: 'class'
    });
  };

  if (loading) {
    return (
      <div className="routine-loading">
        <div className="loading-spinner"></div>
        <p>Loading your routine...</p>
      </div>
    );
  }

  return (
    <div className="routine-manager">
      <div className="routine-header">
        <h2>My Routine</h2>
        <motion.button
          className="btn btn-primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openForm}
        >
          <FiPlus />
          Add Routine
        </motion.button>
      </div>

      {/* Add Routine Form */}
      {showForm && (
        <motion.div
          className="routine-form-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="routine-form"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <div className="form-header">
              <h3>Add New Routine</h3>
              <button className="close-btn" onClick={closeForm}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="day">Day</label>
                  <select
                    id="day"
                    name="day"
                    value={formData.day}
                    onChange={handleInputChange}
                    required
                  >
                    {days.map(day => (
                      <option key={day.id} value={day.id}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
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
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="activity">Activity</label>
                <input
                  type="text"
                  id="activity"
                  name="activity"
                  value={formData.activity}
                  onChange={handleInputChange}
                  placeholder="e.g., Computer Science 101"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Room 301"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Adding...' : 'Add Routine'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Day Selector */}
      <div className="day-selector">
        {days.map((day) => (
          <motion.button
            key={day.id}
            className={`day-btn ${selectedDay === day.id ? 'active' : ''}`}
            onClick={() => setSelectedDay(day.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {day.label}
          </motion.button>
        ))}
      </div>

      {/* Routine Display */}
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
              .map((routine) => (
                <motion.div
                  key={routine.id}
                  className="routine-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className="routine-type-indicator"
                    style={{ backgroundColor: getTypeColor(routine.type) }}
                  >
                    {getTypeLabel(routine.type)}
                  </div>

                  <div className="routine-details">
                    <div className="routine-header-info">
                      <h3>{routine.activity}</h3>
                      <div className="routine-actions">
                        <button className="action-btn">
                          <FiEdit3 />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteRoutine(routine.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>

                    <div className="routine-info">
                      <div className="info-item">
                        <FiClock />
                        <span>{routine.startTime} - {routine.endTime}</span>
                      </div>
                      <div className="info-item">
                        <FiMapPin />
                        <span>{routine.location}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
          )}
        </div>

        {/* Weekly Overview */}
        <div className="weekly-overview">
          <h3>Weekly Overview</h3>
          <div className="week-grid">
            {days.map((day) => {
              const dayRoutines = getRoutinesForDay(day.id);
              return (
                <div
                  key={day.id}
                  className={`week-day ${selectedDay === day.id ? 'active' : ''}`}
                  onClick={() => setSelectedDay(day.id)}
                >
                  <div className="day-name">{day.label.slice(0, 3)}</div>
                  <div className="day-count">{dayRoutines.length}</div>
                  <div className="day-indicators">
                    {dayRoutines.slice(0, 3).map((routine, index) => (
                      <div
                        key={index}
                        className="day-indicator"
                        style={{ backgroundColor: getTypeColor(routine.type) }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutineManager;

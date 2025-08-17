import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit3, FiTrash2, FiClock, FiMapPin } from 'react-icons/fi';
import './RoutineManager.css';

const RoutineManager = ({ user }) => {
  const [routines, setRoutines] = useState([]);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [loading, setLoading] = useState(true);

  const days = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];

  // Mock data for demonstration
  useEffect(() => {
    const mockRoutines = [
      {
        id: 1,
        day: 'monday',
        startTime: '09:00',
        endTime: '10:30',
        activity: 'Computer Science 101',
        location: 'Room 301',
        type: 'class'
      },
      {
        id: 2,
        day: 'monday',
        startTime: '11:00',
        endTime: '12:30',
        activity: 'Mathematics',
        location: 'Room 205',
        type: 'class'
      },
      {
        id: 3,
        day: 'tuesday',
        startTime: '14:00',
        endTime: '15:30',
        activity: 'Study Session',
        location: 'Library',
        type: 'study'
      },
      {
        id: 4,
        day: 'wednesday',
        startTime: '10:00',
        endTime: '11:30',
        activity: 'Physics Lab',
        location: 'Lab 102',
        type: 'class'
      }
    ];
    
    setRoutines(mockRoutines);
    setLoading(false);
  }, []);

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

  const formatTime = (time) => {
    return time.replace(':', '');
  };

  const handleDeleteRoutine = (routineId) => {
    setRoutines(routines.filter(routine => routine.id !== routineId));
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
        >
          <FiPlus />
          Add Routine
        </motion.button>
      </div>

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

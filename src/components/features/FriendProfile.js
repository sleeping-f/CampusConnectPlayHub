import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiHash, FiBookOpen, FiCalendar, FiClock, FiX, FiArrowLeft } from 'react-icons/fi';
import axios from 'axios';
import './FriendProfile.css';

const FriendProfile = ({ friend, onClose, onBack }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [routines, setRoutines] = useState([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(false);

  useEffect(() => {
    if (friend && activeTab === 'routine') {
      fetchFriendRoutines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friend, activeTab]);

  const fetchFriendRoutines = async () => {
    try {
      setIsLoadingRoutines(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      // ✅ call the dedicated endpoint that returns routines by USER id
      const response = await axios.get(`/api/routines/user/${friend.id}`, { headers });
      setRoutines(response.data.routines || []);
    } catch (error) {
      console.error('Error fetching friend routines:', error);
    } finally {
      setIsLoadingRoutines(false);
    }
  };

  const getInitials = (firstName, lastName) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

  const getRoleDisplay = (role) => {
    const roleMap = { student: 'Student', manager: 'Manager', admin: 'Administrator' };
    return roleMap[role] || role;
  };

  const formatTime = (time) =>
    new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getDayColor = (day) => {
    const colors = {
      monday: '#ff6b6b',
      tuesday: '#4ecdc4',
      wednesday: '#45b7d1',
      thursday: '#96ceb4',
      friday: '#feca57',
      saturday: '#ff9ff3',
      sunday: '#54a0ff'
    };
    return colors[day] || '#667eea';
  };

  return (
    <div className="friend-profile-overlay" onClick={onClose}>
      <motion.div
        className="friend-profile-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="friend-profile-header">
          <button className="back-btn" onClick={onBack}>
            <FiArrowLeft />
            Back to Friends
          </button>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Profile Info */}
        <div className="friend-profile-info">
          <div className="friend-avatar">
            {friend.profileImage ? (
              <img src={friend.profileImage} alt={`${friend.firstName} ${friend.lastName}`} />
            ) : (
              <div className="avatar-placeholder">{getInitials(friend.firstName, friend.lastName)}</div>
            )}
          </div>
          <div className="friend-basic-info">
            <h2>{friend.firstName} {friend.lastName}</h2>
            <p className="friend-email">{friend.email}</p>
            <p className="friend-role">{getRoleDisplay(friend.role)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="friend-tabs">
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <FiUser /> Profile
          </button>
          <button className={`tab-btn ${activeTab === 'routine' ? 'active' : ''}`} onClick={() => setActiveTab('routine')}>
            <FiCalendar /> Routine
          </button>
        </div>

        {/* Tab Content */}
        <div className="friend-tab-content">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="profile-tab">
              <div className="profile-details">
                {friend.studentId && (
                  <div className="detail-item">
                    <div className="detail-icon"><FiHash /></div>
                    <div className="detail-content">
                      <label>Student ID</label>
                      <p>{friend.studentId}</p>
                    </div>
                  </div>
                )}

                {friend.department && (
                  <div className="detail-item">
                    <div className="detail-icon"><FiBookOpen /></div>
                    <div className="detail-content">
                      <label>Department</label>
                      <p>{friend.department}</p>
                    </div>
                  </div>
                )}

                <div className="detail-item">
                  <div className="detail-icon"><FiMail /></div>
                  <div className="detail-content">
                    <label>Email</label>
                    <p>{friend.email}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'routine' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="routine-tab">
              {isLoadingRoutines ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading routine...</p>
                </div>
              ) : routines.length > 0 ? (
                <div className="routines-grid">
                  {routines.map((routine) => (
                    <motion.div key={routine.id} className="routine-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }}>
                      <div className="routine-day-header" style={{ backgroundColor: getDayColor(routine.day) }}>
                        <h4>{routine.day.charAt(0).toUpperCase() + routine.day.slice(1)}</h4>
                      </div>
                      <div className="routine-content">
                        <div className="routine-time">
                          <FiClock />
                          <span>
                            {formatTime(routine.startTime)} - {formatTime(routine.endTime)}
                          </span>
                        </div>
                        <h5 className="routine-activity">{routine.activity}</h5>
                        {routine.location && <p className="routine-location">{routine.location}</p>}
                        <span className={`routine-type routine-type-${routine.type}`}>
                          {routine.type.charAt(0).toUpperCase() + routine.type.slice(1)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <FiCalendar className="empty-icon" />
                  <h3>No Routine Available</h3>
                  <p>{friend.firstName} hasn't shared their routine yet.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FriendProfile;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { FiUser, FiCalendar, FiLogOut, FiPlus, FiEdit3 } from 'react-icons/fi';
import StudentInfo from './StudentInfo';
import RoutineManager from './RoutineManager';
import './Dashboard.css';
import FeedbackForm from "./FeedbackForm";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'info', label: 'Profile', icon: FiUser },
    { id: 'routine', label: 'Routine', icon: FiCalendar },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <StudentInfo user={user} />;
      case 'routine':
        return <RoutineManager user={user} />;
      default:
        return <StudentInfo user={user} />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <motion.h1
            className="dashboard-title"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            CampusConnect<span className="title-accent">PlayHub</span>
          </motion.h1>

          <div className="header-actions">
            <motion.button
              className="btn btn-outline"
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiLogOut />
              Logout
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-layout">
          {/* Sidebar */}
          <aside className="dashboard-sidebar">
            <nav className="sidebar-nav">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="nav-icon" />
                    <span>{tab.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <motion.button
                className="action-btn"
                onClick={() => setShowRoutineModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiPlus />
                Add Routine
              </motion.button>
              <motion.button
                className="action-btn"
                onClick={() => { /* TODO: Navigate to friends */ }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUser />
                Find Friends
              </motion.button>
              <motion.button
                className="action-btn"
                onClick={() => setShowFeedbackModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiEdit3 />
                Give Feedback
              </motion.button>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="dashboard-content">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="content-wrapper"
            >
              {renderTabContent()}
            </motion.div>
          </section>
        </div>
      </main>

      {/* Routine Modal */}
      {showRoutineModal && (
        <RoutineModal
          onClose={() => setShowRoutineModal(false)}
          user={user}
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
};

// Routine Modal Component
const RoutineModal = ({ onClose, user }) => {
  const [routineData, setRoutineData] = useState({
    day: '',
    startTime: '',
    endTime: '',
    activity: '',
    location: '',
    type: 'class'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Save routine to backend
    console.log('Saving routine:', routineData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Add New Routine</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Day</label>
              <select
                value={routineData.day}
                onChange={(e) => setRoutineData({ ...routineData, day: e.target.value })}
                required
              >
                <option value="">Select Day</option>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={routineData.type}
                onChange={(e) => setRoutineData({ ...routineData, type: e.target.value })}
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
              <label>Start Time</label>
              <input
                type="time"
                value={routineData.startTime}
                onChange={(e) => setRoutineData({ ...routineData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                value={routineData.endTime}
                onChange={(e) => setRoutineData({ ...routineData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Activity</label>
            <input
              type="text"
              placeholder="e.g., Computer Science 101"
              value={routineData.activity}
              onChange={(e) => setRoutineData({ ...routineData, activity: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              placeholder="e.g., Room 301, Library"
              value={routineData.location}
              onChange={(e) => setRoutineData({ ...routineData, location: e.target.value })}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Routine
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Feedback Modal Component
const FeedbackModal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Share Your Feedback</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-form">
          <FeedbackForm />
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;


import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiHash, FiBookOpen, FiEdit3, FiSave, FiX } from 'react-icons/fi';
import './StudentInfo.css';
import GradientText from '../extra_designings/GradientText';

const StudentInfo = ({ user }) => {
  console.log('User data:', user);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    studentId: user?.studentId || '',
    department: user?.department || '',
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // TODO: Update user data in backend
      console.log('Saving user data:', editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const handleCancel = () => {
    setEditData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      studentId: user?.studentId || '',
      department: user?.department || '',
    });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value,
    });
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      student: 'Student',
      faculty: 'Faculty',
      staff: 'University Staff',
      admin: 'Administrator'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="student-info">
      <div className="info-header">
        <h2><GradientText
          colors={["#8352fdff", "#5487ffff", "#7852ffff", "#4d83ffff", "#7b50feff"]}
          animationSpeed={3}
          showBorder={false}
          className="custom-class"
        >
          Student Profile
        </GradientText></h2>
        {!isEditing ? (
          <motion.button
            className="btn btn-outline"
            onClick={handleEdit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiEdit3 />
            Edit Profile
          </motion.button>
        ) : (
          <div className="edit-actions">
            <motion.button
              className="btn btn-primary"
              onClick={handleSave}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiSave />
              Save
            </motion.button>
            <motion.button
              className="btn btn-secondary"
              onClick={handleCancel}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiX />
              Cancel
            </motion.button>
          </div>
        )}
      </div>

      <div className="info-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-placeholder">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          <div className="profile-details">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={editData.firstName}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={editData.lastName}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editData.email}
                    onChange={handleChange}
                    className="form-input"
                    disabled
                  />
                </div>

                {user?.role === 'student' && (
                  <>
                    <div className="form-group">
                      <label>Student ID</label>
                      <input
                        type="text"
                        name="studentId"
                        value={editData.studentId}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Department</label>
                      <select
                        name="department"
                        value={editData.department}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                        <option value="Electrical & Electronic Engineering">Electrical & Electronic Engineering</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Architecture">Architecture</option>
                        <option value="Business Administration">Business Administration</option>
                        <option value="Economics">Economics</option>
                        <option value="English">English</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="Psychology">Psychology</option>
                        <option value="Sociology">Sociology</option>
                        <option value="Political Science">Political Science</option>
                        <option value="History">History</option>
                        <option value="Philosophy">Philosophy</option>
                        <option value="Fine Arts">Fine Arts</option>
                        <option value="Music">Music</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="info-fields">
                <div className="info-field">
                  <div className="field-icon">
                    <FiUser />
                  </div>
                  <div className="field-content">
                    <label>Full Name</label>
                    <p>{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>

                <div className="info-field">
                  <div className="field-icon">
                    <FiMail />
                  </div>
                  <div className="field-content">
                    <label>Email</label>
                    <p>{user?.email}</p>
                  </div>
                </div>

                <div className="info-field">
                  <div className="field-icon">
                    <FiUser />
                  </div>
                  <div className="field-content">
                    <label>Role</label>
                    <p>{getRoleDisplay(user?.role)}</p>
                  </div>
                </div>

                {user?.role === 'student' && (
                  <>
                    <div className="info-field">
                      <div className="field-icon">
                        <FiHash />
                      </div>
                      <div className="field-content">
                        <label>Student ID</label>
                        <p>{user?.studentId || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="info-field">
                      <div className="field-icon">
                        <FiBookOpen />
                      </div>
                      <div className="field-content">
                        <label>Department</label>
                        <p>{user?.department || 'Not specified'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-section">
          <h3><GradientText
            colors={["#8352fdff", "#5487ffff", "#7852ffff", "#4d83ffff", "#7b50feff"]}
            animationSpeed={3}
            showBorder={false}
            className="custom-class"
          >
            Your Activity
          </GradientText></h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Friends</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Study Groups</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Achievements</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Campus Coins</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInfo;

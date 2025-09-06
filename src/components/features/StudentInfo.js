import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiHash, FiBookOpen, FiEdit3, FiSave, FiX, FiImage } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import './StudentInfo.css';
import GradientText from '../common/GradientText';

const API_BASE = 'http://localhost:5000';

const StudentInfo = ({ user }) => {
  console.log('User data:', user);
  const { user: authUser, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    campus_id: user?.campus_id || '',
    department: user?.department || '',
  });

  // NEW: image state (only used if you pick a new photo)
  const [newPhoto, setNewPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchFriendsCount();
    }
  }, [user]);

  // Add a function to refresh friends count that can be called from parent components
  const refreshFriendsCount = () => {
    fetchFriendsCount();
  };

  // Expose the refresh function to parent components
  useEffect(() => {
    if (window.refreshFriendsCount) {
      window.refreshFriendsCount = refreshFriendsCount;
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fetchFriendsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_BASE}/api/friends`, { headers });
      setFriendsCount(response.data.friends?.length || 0);
    } catch (error) {
      console.error('Error fetching friends count:', error);
      setFriendsCount(0);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  // NEW: pick a photo (optional)
  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      toast.error('Only PNG, JPG, or WEBP images allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Max size is 2MB');
      return;
    }
    setNewPhoto(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const baseFields = {
        firstName: editData.firstName,
        lastName: editData.lastName,
        email: editData.email,
        campus_id: editData.campus_id,
        department: editData.department
      };

      if (newPhoto) {
        // If a new photo was chosen, send multipart/form-data
        const form = new FormData();
        Object.entries(baseFields).forEach(([k, v]) => {
          if (v !== undefined && v !== '') form.append(k, v);
        });
        form.append('profileImage', newPhoto);

        const response = await axios.patch(`${API_BASE}/api/users/me`, form, {
          headers,
        });

        toast.success('Profile photo updated!');
        if (response.data && response.data.profile) {
          updateUser(response.data.profile);
        }
      } else {
        // Otherwise keep your existing JSON PATCH flow
        const updateData = { ...baseFields };
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined || updateData[key] === '') delete updateData[key];
        });

        const response = await axios.patch(`${API_BASE}/api/users/me`, updateData, { headers });

        toast.success('Profile updated successfully!');
        if (response.data && response.data.profile) {
          updateUser(response.data.profile);
        }
      }

      setIsEditing(false);
      setNewPhoto(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error saving user data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    setEditData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      campus_id: user?.campus_id || '',
      department: user?.department || '',
    });
    // reset new photo/preview if you cancel
    setNewPhoto(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
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

  // Decide which avatar to show:
  const currentAvatar = previewUrl
    ? previewUrl
    : (user?.profileImage
        ? (user.profileImage.startsWith('http') ? user.profileImage : `${API_BASE}${user.profileImage}`)
        : null);

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
            {currentAvatar ? (
              <img src={currentAvatar} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}

            {isEditing && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onPickPhoto}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiImage style={{ marginRight: 6 }} />
                  Change Photo
                </button>
                {newPhoto && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setNewPhoto(null);
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <FiX style={{ marginRight: 6 }} />
                    Remove New
                  </button>
                )}
              </div>
            )}
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
                        name="campus_id"
                        value={editData.campus_id}
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
                        <p>{user?.campus_id || 'Not provided'}</p>
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
              <div className="stat-number">{friendsCount}</div>
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

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiBookOpen, FiHash } from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import './AuthForms.css';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    campus_id: '',
    department: '',
    role: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const departments = [
    'Computer Science & Engineering',
    'Electrical & Electronic Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Architecture',
    'Business Administration',
    'Economics',
    'English',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Psychology',
    'Sociology',
    'Political Science',
    'History',
    'Philosophy',
    'Fine Arts',
    'Music',
    'Other'
  ];

  const roleIdLabel = (role) => {
    if (role === 'admin')   return 'Admin ID';
    if (role === 'manager') return 'Manager ID';
    return 'Student ID';
  };

  const roles = [
    { value: 'student', label: 'Student' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Administrator' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!formData.campus_id) {
      return 'ID is required';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    const result = await register(formData);
    if (result.success) {
      navigate('/features');
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        navigate('/features');
      }
    } catch (error) {
      toast.error('Google Sign-In failed');
    }
    setLoading(false);
  };

  const handleGoogleError = () => {
    toast.error('Google Sign-In failed');
    setLoading(false);
  };

  return (
    <motion.form
      className="auth-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Name Fields */}
      <div className="form-row">
        <div className="form-group-signup">
          <div className="input-wrapper">
            <FiUser className="input-icon" />
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
        </div>
        <div className="form-group-signup">
          <div className="input-wrapper">
            <FiUser className="input-icon" />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Email Field */}
      <div className="form-group-signup">
        <div className="input-wrapper">
          <FiMail className="input-icon" />
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
      </div>

      {/* Role Selection */}
      <div className="form-group-signup">
        <div className="input-wrapper">
          <FiUser className="input-icon" />
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-input"
            required
            aria-label="Select user role"
          >
          <option value="" disabled hidden>User</option>
            <optgroup label="User">
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* ID field (shown when a valid role is chosen) */}
      {formData.role && (
        <div className="form-group-signup">
          <div className="input-wrapper">
            <FiHash className="input-icon" />
            <input
              type="text"
              name="campus_id"
              value={formData.campus_id}
              onChange={handleChange}
              placeholder={`Enter your ${roleIdLabel(formData.role || 'student')}`}
              required
              className="form-input"
            />
          </div>
        </div>
      )}

      {/* Department (if student) */}
      {formData.role === 'student' && (
        <div className="form-group-signup">
          <div className="input-wrapper">
            <FiBookOpen className="input-icon" />
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Password Fields */}
      <div className="form-group-signup">
        <div className="input-wrapper">
          <FiLock className="input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      </div>

      <div className="form-group-signup">
        <div className="input-wrapper">
          <FiLock className="input-icon" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="form-input"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        className="submit-btn"
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </motion.button>

      {/* Divider */}
      <div className="divider">
        <span>or</span>
      </div>
      <div className="divider2" />

      {/* Google Sign-In */}
      <div className="google-btn-container">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
          locale="en"
          disabled={loading}
        />
      </div>
    </motion.form>
  );
};

export default RegisterForm;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import './AuthForms.css';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData);
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
      {/* Email Field */}
      <div className="form-group-signup">
        <div className="input-wrapper"
        >
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

      {/* Password Field */}
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

      {/* Submit Button */}
      <motion.button
        type="submit"
        className="submit-btn"
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? 'Signing In...' : 'Sign In'}
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

export default LoginForm;

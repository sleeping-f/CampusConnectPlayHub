import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './components/features/Dashboard';
import AdminConsole from './components/features/AdminConsole'; // ⬅️ NEW
import './App.css';

// Role-aware guard
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (requiredRole && user?.role !== requiredRole) {
    // logged in but wrong role → send to main area
    return <Navigate to="/features" replace />;
  }
  return children;
};

// If an admin tries to open /features, send them to /admin
function DashboardGate() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Dashboard />;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  fontFamily: 'Inter, sans-serif',
                },
              }}
            />

            <Routes>
              <Route path="/auth" element={<AuthPage />} />

              {/* student/regular dashboard */}
              <Route
                path="/features"
                element={
                  <ProtectedRoute>
                    <DashboardGate />
                  </ProtectedRoute>
                }
              />

              {/* admin-only dashboard */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminConsole />
                  </ProtectedRoute>
                }
              />

              {/* default */}
              <Route path="/" element={<Navigate to="/auth" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

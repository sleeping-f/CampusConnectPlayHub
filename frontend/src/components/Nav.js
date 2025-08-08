import React from 'react';
// In Nav.jsx or Nav.js
import '../styles/Nav.css';



import { Link, useNavigate } from 'react-router-dom';

export default function Nav() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <nav className="p-4 bg-gray-100 mb-4">
            <div className="container mx-auto flex justify-between">
                <div className="font-bold">CampusConnect</div>
                <div className="space-x-4">
                    {!token ? (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/register">Register</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/dashboard">Dashboard</Link>
                            <button onClick={logout} className="ml-2">Logout</button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

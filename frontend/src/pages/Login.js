import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            const res = await api.post('/api/auth/login', form);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard');
        } catch (err) {
            setMsg(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
            <h2 className="text-xl mb-4">Login</h2>
            {msg && <div className="mb-3 text-red-600">{msg}</div>}
            <form onSubmit={submit} className="space-y-3">
                <input name="email" onChange={handleChange} value={form.email} placeholder="Email" className="w-full p-2 border" type="email" required />
                <input name="password" onChange={handleChange} value={form.password} placeholder="Password" className="w-full p-2 border" type="password" required />
                <button className="w-full bg-green-600 text-white p-2 rounded">Login</button>
            </form>
        </div>
    );
}

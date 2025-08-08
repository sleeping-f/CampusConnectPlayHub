import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', department: '', year: '' });
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            const res = await api.post('/api/auth/register', form);
            setMsg(res.data.message);
            setTimeout(() => navigate('/login'), 1000);
        } catch (err) {
            setMsg(err.response?.data?.message || 'Error');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
            <h2 className="text-xl mb-4">Register</h2>
            {msg && <div className="mb-3 text-red-600">{msg}</div>}
            <form onSubmit={submit} className="space-y-3">
                <input name="name" onChange={handleChange} value={form.name} placeholder="Full name" className="w-full p-2 border" required />
                <input name="email" onChange={handleChange} value={form.email} placeholder="Email" className="w-full p-2 border" type="email" required />
                <input name="password" onChange={handleChange} value={form.password} placeholder="Password" className="w-full p-2 border" type="password" required />
                <input name="department" onChange={handleChange} value={form.department} placeholder="Department" className="w-full p-2 border" />
                <input name="year" onChange={handleChange} value={form.year} placeholder="Year" className="w-full p-2 border" />
                <button className="w-full bg-blue-600 text-white p-2 rounded">Register</button>
            </form>
        </div>
    );
}

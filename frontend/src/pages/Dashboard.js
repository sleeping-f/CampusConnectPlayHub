import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [routine, setRoutine] = useState(null);
    const [freeTimes, setFreeTimes] = useState(null);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/api/user/me');
                setUser(res.data.user);
                setRoutine(res.data.user.routine || {});
                setFreeTimes(res.data.user.free_times || {});
            } catch (err) {
                setMsg('Unable to fetch profile');
            }
        };
        load();
    }, []);

    if (!user) return <div>Loading...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-2xl font-bold">Welcome, {user.name}</h2>
                <p>Email: {user.email}</p>
                <p>Department: {user.department || '-'}</p>
                <p>Year: {user.year || '-'}</p>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold">Routine</h3>
                <pre className="text-sm bg-gray-50 p-2 rounded">{JSON.stringify(routine, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold">Free Times</h3>
                <pre className="text-sm bg-gray-50 p-2 rounded">{JSON.stringify(freeTimes, null, 2)}</pre>
            </div>

            <div className="flex gap-4">
                <button className="flex-1 p-4 bg-indigo-600 text-white rounded">Go to Arcade / Games (soon)</button>
                <button className="flex-1 p-4 bg-orange-500 text-white rounded">Food & Pre-Order (soon)</button>
            </div>

            {msg && <div className="text-red-600">{msg}</div>}
        </div>
    );
}

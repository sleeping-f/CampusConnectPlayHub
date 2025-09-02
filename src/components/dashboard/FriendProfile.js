import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiHash, FiBookOpen, FiCalendar, FiClock, FiX, FiArrowLeft } from 'react-icons/fi';
import axios from 'axios';
import './FriendProfile.css';

const FriendProfile = ({ friend, onClose, onBack }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [routines, setRoutines] = useState([]);
    const [isLoadingRoutines, setIsLoadingRoutines] = useState(false);

    // === NEW: state for mutual free time ===
    const [selectedDay, setSelectedDay] = useState('monday');
    const [mutualSlots, setMutualSlots] = useState([]);
    const [finding, setFinding] = useState(false);
    const [availError, setAvailError] = useState('');

    useEffect(() => {
        if (friend && activeTab === 'routine') {
            fetchFriendRoutines();
        }
    }, [friend, activeTab]);

    const fetchFriendRoutines = async () => {
        try {
            setIsLoadingRoutines(true);
            const response = await axios.get(`/api/users/${friend.id}/routines`);
            setRoutines(response.data.routines || []);
        } catch (error) {
            console.error('Error fetching friend routines:', error);
        } finally {
            setIsLoadingRoutines(false);
        }
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
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

    const formatTime = (time) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getDayColor = (day) => {
        const colors = {
            monday: '#ff6b6b',
            tuesday: '#4ecdc4',
            wednesday: '#45b7d1',
            thursday: '#96ceb4',
            friday: '#feca57',
            saturday: '#ff9ff3',
            sunday: '#54a0ff'
        };
        return colors[day] || '#667eea';
    };

    // === NEW: tiny time/interval helpers ===
    const toMin = (hhmm) => {
        const [h, m] = (hhmm || '00:00').split(':').map(Number);
        return h * 60 + m;
    };
    const toHHMM = (mins) => {
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        return `${hh}:${mm}`;
    };
    const mergeBusy = (intervals) => {
        const a = intervals.slice().sort((x, y) => x[0] - y[0]);
        const out = [];
        for (const cur of a) {
            if (!out.length || cur[0] > out[out.length - 1][1]) out.push(cur);
            else out[out.length - 1][1] = Math.max(out[out.length - 1][1], cur[1]);
        }
        return out;
    };
    const invertToFree = (busy, startDay = toMin('08:00'), endDay = toMin('22:00'), minDur = 30) => {
        const merged = mergeBusy(busy);
        const free = [];
        let cur = startDay;
        for (const [s, e] of merged) {
            if (s > cur) free.push([cur, Math.min(s, endDay)]);
            cur = Math.max(cur, e);
            if (cur >= endDay) break;
        }
        if (cur < endDay) free.push([cur, endDay]);
        return free.filter(([s, e]) => e - s >= minDur);
    };
    const intersectIntervals = (A, B) => {
        const out = [];
        let i = 0, j = 0;
        while (i < A.length && j < B.length) {
            const s = Math.max(A[i][0], B[j][0]);
            const e = Math.min(A[i][1], B[j][1]);
            if (s < e) out.push([s, e]);
            if (A[i][1] < B[j][1]) i++; else j++;
        }
        return out;
    };

    // === NEW: compute mutual free time using existing endpoints ===
    const findMutualFreeTime = async () => {
        setFinding(true);
        setAvailError('');
        setMutualSlots([]);
        try {
            // your routines
            const meRes = await axios.get('/api/routines');
            const myRoutines = meRes.data?.routines || [];

            // friend routines already in state: `routines`

            // build busy lists for selected day
            const busyMe = myRoutines
                .filter(r => r.day === selectedDay)
                .map(r => [toMin(r.startTime), toMin(r.endTime)]);

            const busyFriend = routines
                .filter(r => r.day === selectedDay)
                .map(r => [toMin(r.startTime), toMin(r.endTime)]);

            // convert to free intervals and intersect
            const freeMe = invertToFree(mergeBusy(busyMe));
            const freeFr = invertToFree(mergeBusy(busyFriend));
            const mutual = intersectIntervals(freeMe, freeFr)
                .map(([s, e]) => ({ start: toHHMM(s), end: toHHMM(e) }));

            setMutualSlots(mutual);
            if (mutual.length === 0) setAvailError('No mutual free time on this day.');
        } catch (e) {
            console.error(e);
            setAvailError('Failed to compute mutual free time.');
        } finally {
            setFinding(false);
        }
    };

    return (
        <div className="friend-profile-overlay" onClick={onClose}>
            <motion.div
                className="friend-profile-modal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="friend-profile-header">
                    <button className="back-btn" onClick={onBack}>
                        <FiArrowLeft />
                        Back to Friends
                    </button>
                    <button className="close-btn" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                {/* Profile Info */}
                <div className="friend-profile-info">
                    <div className="friend-avatar">
                        {friend.profileImage ? (
                            <img src={friend.profileImage} alt={`${friend.firstName} ${friend.lastName}`} />
                        ) : (
                            <div className="avatar-placeholder">
                                {getInitials(friend.firstName, friend.lastName)}
                            </div>
                        )}
                    </div>
                    <div className="friend-basic-info">
                        <h2>{friend.firstName} {friend.lastName}</h2>
                        <p className="friend-email">{friend.email}</p>
                        <p className="friend-role">{getRoleDisplay(friend.role)}</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="friend-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <FiUser />
                        Profile
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'routine' ? 'active' : ''}`}
                        onClick={() => setActiveTab('routine')}
                    >
                        <FiCalendar />
                        Routine
                    </button>
                </div>

                {/* Tab Content */}
                <div className="friend-tab-content">
                    {activeTab === 'profile' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="profile-tab"
                        >
                            <div className="profile-details">
                                {friend.studentId && (
                                    <div className="detail-item">
                                        <div className="detail-icon">
                                            <FiHash />
                                        </div>
                                        <div className="detail-content">
                                            <label>Student ID</label>
                                            <p>{friend.studentId}</p>
                                        </div>
                                    </div>
                                )}

                                {friend.department && (
                                    <div className="detail-item">
                                        <div className="detail-icon">
                                            <FiBookOpen />
                                        </div>
                                        <div className="detail-content">
                                            <label>Department</label>
                                            <p>{friend.department}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="detail-item">
                                    <div className="detail-icon">
                                        <FiMail />
                                    </div>
                                    <div className="detail-content">
                                        <label>Email</label>
                                        <p>{friend.email}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'routine' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="routine-tab"
                        >
                            {/* === NEW: controls for mutual free time === */}
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', margin: '0 0 12px' }}>
                                <label style={{ opacity: 0.9 }}>Day:</label>
                                <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => (
                                        <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
                                    ))}
                                </select>
                                <button className="btn btn-primary" onClick={findMutualFreeTime}>
                                    {finding ? 'Finding…' : 'Find mutual free time'}
                                </button>
                                {availError && <span style={{ marginLeft: '8px', opacity: 0.8 }}>{availError}</span>}
                            </div>

                            {/* === NEW: results grid for mutual free time (shown when we have results) === */}
                            {mutualSlots.length > 0 && (
                                <div className="routines-grid" style={{ marginBottom: '1rem' }}>
                                    {mutualSlots.map((slot, i) => (
                                        <motion.div
                                            key={`mutual-${i}`}
                                            className="routine-card"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <div
                                                className="routine-day-header"
                                                style={{ backgroundColor: getDayColor(selectedDay) }}
                                            >
                                                <h4>{selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} — Free (Both)</h4>
                                            </div>
                                            <div className="routine-content">
                                                <div className="routine-time">
                                                    <FiClock />
                                                    <span>{slot.start} - {slot.end}</span>
                                                </div>
                                                <span className="routine-type routine-type-activity">Free</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* your original routine rendering stays exactly the same */}
                            {isLoadingRoutines ? (
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading routine...</p>
                                </div>
                            ) : routines.length > 0 ? (
                                <div className="routines-grid">
                                    {routines.map((routine) => (
                                        <motion.div
                                            key={routine.id}
                                            className="routine-card"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <div
                                                className="routine-day-header"
                                                style={{ backgroundColor: getDayColor(routine.day) }}
                                            >
                                                <h4>{routine.day.charAt(0).toUpperCase() + routine.day.slice(1)}</h4>
                                            </div>
                                            <div className="routine-content">
                                                <div className="routine-time">
                                                    <FiClock />
                                                    <span>{formatTime(routine.startTime)} - {formatTime(routine.endTime)}</span>
                                                </div>
                                                <h5 className="routine-activity">{routine.activity}</h5>
                                                {routine.location && (
                                                    <p className="routine-location">{routine.location}</p>
                                                )}
                                                <span className={`routine-type routine-type-${routine.type}`}>
                                                    {routine.type.charAt(0).toUpperCase() + routine.type.slice(1)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <FiCalendar className="empty-icon" />
                                    <h3>No Routine Available</h3>
                                    <p>{friend.firstName} hasn't shared their routine yet.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default FriendProfile;

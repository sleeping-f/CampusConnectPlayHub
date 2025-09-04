// src/components/features/FriendFinder.js
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiUsers, FiMail, FiLoader, FiEye, FiUserPlus, FiCheck, FiX } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import FriendProfile from './FriendProfile';
import './FriendFinder.css';

const DEBUG_SEARCH = true;
const showErr = (err) => {
  const payload = err?.response?.data ?? { message: err?.message || 'Unknown error' };
  if (DEBUG_SEARCH) console.error('SEARCH_ERROR:', err?.response || err);
  return typeof payload === 'string' ? payload : JSON.stringify(payload);
};

// Always attach Authorization if present
const authHeaders = () => {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

// Normalize backend shapes: {results:[...]}, {users:[...]}, {rows:[...]}, plain array
// Also flatten friend-wrapped rows from /api/friends/search → [{...user}]
const normalizeResults = (data) => {
  const arr =
    !data ? [] :
    Array.isArray(data) ? data :
    Array.isArray(data.results) ? data.results :
    Array.isArray(data.users) ? data.users :
    Array.isArray(data.rows) ? data.rows :
    (Array.isArray(data.data) ? data.data : []);

  // Flatten { friend: {...} } → {...}
  return arr.map(item => (item && item.friend ? item.friend : item));
};  

// Try multiple endpoints for search to tolerate slight backend route differences
const SEARCH_ENDPOINTS = [
  { url: '/api/users/search', params: (q) => ({ q, limit: 20 }) },
  { url: '/api/friends/search', params: (q) => ({ q, limit: 20 }) },
  { url: '/api/users', params: (q) => ({ q, limit: 20 }) }, // final fallback
];

const FriendFinder = () => {
  const { user } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState('search');

  // Data
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // UI
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [error, setError] = useState(null);

  // Profile modal
  const [selectedFriend, setSelectedFriend] = useState(null);

  // ------- fetchers -------
  const fetchFriends = useCallback(async () => {
    try {
      setIsLoadingFriends(true);
      const { data } = await axios.get('/api/friends', { headers: authHeaders() }); // { friends: [{ friend, since }] }
      const list = (data?.friends || []).map(x => x.friend);
      setFriends(list);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to load friends';
      setError(msg);
      console.error('GET /api/friends error:', err?.response || err);
      toast.error(msg);
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      setIsLoadingRequests(true);
      const { data } = await axios.get('/api/friends/pending', { headers: authHeaders() }); // { incoming: [...] }
      setPendingRequests(data?.incoming || []);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to load pending requests';
      setError(msg);
      console.error('GET /api/friends/pending error:', err?.response || err);
      toast.error(msg);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchFriends();
    fetchPendingRequests();
  }, [user, fetchFriends, fetchPendingRequests]);

  // 🔒 Block non-students
  if (!user || user.role !== 'student') {
    return (
      <div className="friend-finder-disabled">
        <p> Only students can use the Friends feature.</p>
      </div>
    );
  }

  const handleSearch = async () => {
    const q = (searchQuery || '').trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
  
    setIsSearching(true);
    setError(null);
  
    let lastErr = null;
    for (const ep of SEARCH_ENDPOINTS) {
      try {
        const { data } = await axios.get(ep.url, {
          params: ep.params(q),
          headers: authHeaders(),
        });
  
        // Now always flat user objects, even if backend returned { friend: {...} }
        const raw = normalizeResults(data);

        // hide myself, annotate, sort (optional)
        const annotated = raw
          .filter(u => u && u.id !== user?.id)
          .map(u => ({
            ...u,
            _isFriend: friends.some(f => f.id === u.id),
            _isPending: pendingRequests.some(p => p.id === u.id)
          }));
        
        setSearchResults(annotated);
        
        setIsSearching(false);
        return; // success on this endpoint
      } catch (err) {
        const status = err?.response?.status;
        setIsSearching(false);
        const readable = showErr(err);
    
        if (status === 401 || status === 403) {
          setError('Not authorized. Please log in again.');
        } else {
          setError(`Search failed: ${readable}`);
        }
        setSearchResults([]);
        return;
      }
    }
  
    console.error('Search failed across endpoints:', lastErr?.response || lastErr);
    const status = lastErr?.response?.status;
    if (status === 401 || status === 403) {
      toast.error('Please log in again.');
    } else if (status === 404) {
      toast.error('Search route not found.');
    } else {
      toast.error(lastErr?.response?.data?.message || 'Search failed');
    }
    setSearchResults([]);
    setIsSearching(false);
  };
  
  // ------- actions -------
  const sendFriendRequest = async (friendId) => {
    try {
      await axios.post('/api/friends/request', { student_id_2: friendId }, { headers: authHeaders() });
      // Mark as pending in the visible list
      setSearchResults(prev => prev.map(r => r.id === friendId ? { ...r, _isPending: true } : r));
      // Refresh pending list
      fetchPendingRequests();
      toast.success('Friend request sent');
    } catch (err) {
      console.error('POST /api/friends/request error:', err?.response || err);
      const msg = err?.response?.data?.message || 'Failed to send request';
      toast.error(msg);
    }
  };

  const respondToFriendRequest = async (friendId, action) => {
    try {
      await axios.put('/api/friends/respond', { student_id_1: friendId, action }, { headers: authHeaders() }); // 'accept' | 'decline'
      if (action === 'accept') {
        await fetchFriends();
        toast.success('Friend request accepted');
      } else {
        toast.success('Friend request declined');
      }
      setPendingRequests(prev => prev.filter(p => p.id !== friendId));
    } catch (err) {
      console.error('PUT /api/friends/respond error:', err?.response || err);
      const msg = err?.response?.data?.message || 'Failed to respond';
      toast.error(msg);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      await axios.delete(`/api/friends/${friendId}`, { headers: authHeaders() });
      setFriends(prev => prev.filter(f => f.id !== friendId));
      // reflect in search results if visible
      setSearchResults(prev => prev.map(r => (r.id === friendId ? { ...r, _isFriend: false } : r)));
      toast.success('Friend removed');
    } catch (err) {
      console.error('DELETE /api/friends/:id error:', err?.response || err);
      const msg = err?.response?.data?.message || 'Failed to remove friend';
      toast.error(msg);
    }
  };

  const getInitials = (firstName, lastName) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="friend-finder">
      <div className="friend-finder-header">
        <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <FiUsers className="header-icon" />
          Friend Management
        </motion.h2>
        <p>Connect with fellow students and build your campus network</p>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="friend-tabs">
        <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          <FiSearch /> Find Friends
        </button>
        <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
          <FiUsers /> My Friends ({friends.length})
        </button>
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          <FiMail /> Requests ({pendingRequests.length})
        </button>
      </div>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="search-tab">
          <div className="search-section">
            <div className="search-container">
              <div className="search-input-wrapper">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, campus ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="search-input"
                />
              </div>
              <motion.button
                className="search-btn"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isSearching ? <FiLoader className="spinner" /> : 'Search'}
              </motion.button>
            </div>

            <AnimatePresence>
              {searchResults.length > 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="search-results">
                  <h3>Search Results ({searchResults.length})</h3>
                  <div className="results-grid">
                    {searchResults.map((result) => (
                      <motion.div key={result.id} className="user-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }}>
                        <div className="user-avatar">
                          {result.profileImage ? (
                            <img
                              src={`http://localhost:5000${result.profileImage}`}
                              alt={`${result.firstName} ${result.lastName}`}
                            />
                          ) : (
                            <div className="avatar-placeholder">{getInitials(result.firstName, result.lastName)}</div>
                          )}
                        </div>

                        <div className="user-info">
                          <h4>{result.firstName} {result.lastName}</h4>
                          <p className="user-email">{result.email}</p>
                          {result.campus_id && <p className="user-student-id">Campus ID: {result.campus_id}</p>}
                          {result.department && <p className="user-department">Dept: {result.department}</p>}
                        </div>

                        <div className="user-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="add-friend-btn"
                            onClick={() => sendFriendRequest(result.id)}
                            disabled={result._isFriend || result._isPending}
                            title={result._isFriend ? 'Already friends' : result._isPending ? 'Request pending' : 'Add Friend'}
                          >
                            {result._isFriend ? <FiCheck /> : result._isPending ? <FiMail /> : <FiUserPlus />}
                            {result._isFriend ? 'Already friends' : result._isPending ? 'Request pending' : 'Add Friend'}
                          </button>

                          {result._isFriend && (
                            <button
                              className="add-friend-btn"
                              onClick={() => setSelectedFriend(result)}
                              title="View Profile"
                              style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}
                            >
                              <FiEye /> View
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                !isSearching && searchQuery.trim() && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="no-results">
                    <p>Enter a name, email, or campus ID to search.</p>
                    <p className="no-results-hint">No result? Try a different search.</p>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* FRIENDS TAB */}
      {activeTab === 'friends' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="friends-section">
          {isLoadingFriends ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <FiLoader className="spinner" />
            </div>
          ) : friends.length === 0 ? (
            <div className="no-results">
              <p>You have no friends yet.</p>
              <p className="no-results-hint">Go to the Search tab to add some!</p>
            </div>
          ) : (
            <div className="friends-grid">
              {friends.map((f) => (
                <div key={f.id} className="friend-card">
                  <div className="friend-avatar">
                    {f.profileImage ? (
                      <img
                        src={`http://localhost:5000${f.profileImage}`}
                        alt={`${f.firstName} ${f.lastName}`}
                      />
                    ) : (
                      <div className="avatar-placeholder">{getInitials(f.firstName, f.lastName)}</div>
                    )}
                  </div>
                  <div className="friend-info">
                    <h4>{f.firstName} {f.lastName}</h4>
                    <p className="friend-email">{f.email}</p>
                    {f.campus_id && <p className="friend-student-id">Campus ID: {f.campus_id}</p>}
                    {f.department && <p className="friend-department">Dept: {f.department}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="view-profile-btn"
                      onClick={() => setSelectedFriend(f)}
                      title="View Profile"
                    >
                      <FiEye />
                    </button>
                    <button
                      className="remove-friend-btn"
                      onClick={() => removeFriend(f.id)}
                      title="Remove Friend"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="requests-section"
        >
          {isLoadingRequests ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <FiLoader className="spinner" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="no-results">
              <p>No pending requests.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {pendingRequests.map((p) => (
                <div key={p.id} className="request-card">
                  <div className="request-avatar">
                    {p.profileImage ? (
                      <img
                        src={`http://localhost:5000${p.profileImage}`}
                        alt={`${p.firstName} ${p.lastName}`}
                      />
                    ) : (
                      <div className="avatar-placeholder">{getInitials(p.firstName, p.lastName)}</div>
                    )}
                  </div>

                  <div className="request-info">
                    <h4>{p.firstName} {p.lastName}</h4>
                    <p className="request-email">{p.email}</p>
                    {p.campus_id && <p className="request-student-id">Campus ID: {p.campus_id}</p>}
                    {p.department && <p className="request-department">Dept: {p.department}</p>}
                  </div>

                  <div className="request-actions">
                    <button
                      className="accept-btn"
                      onClick={() => respondToFriendRequest(p.id, 'accept')}
                    >
                      <FiCheck /> Accept
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => respondToFriendRequest(p.id, 'decline')}
                    >
                      <FiX /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Friend profile modal */}
      <AnimatePresence>
        {selectedFriend && (
          <FriendProfile
            friend={selectedFriend}
            onClose={() => setSelectedFriend(null)}
            onBack={() => setSelectedFriend(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FriendFinder;

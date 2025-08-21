import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiUserPlus, FiMail, FiHash, FiUsers, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './FriendFinder.css';

const FriendFinder = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchType, setSearchType] = useState('all');
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('search');
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            fetchFriends();
            fetchPendingRequests();
        }
    }, [user]);

    const fetchFriends = async () => {
        try {
            setIsLoadingFriends(true);
            const response = await axios.get('/api/users/friends');
            setFriends(response.data.friends || []);
        } catch (error) {
            console.error('Error fetching friends:', error);
            const errorMsg = error.response?.data?.message || 'Failed to load friends';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoadingFriends(false);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            setIsLoadingRequests(true);
            const response = await axios.get('/api/users/friends/pending');
            setPendingRequests(response.data.requests || []);
        } catch (error) {
            console.error('Error fetching pending requests:', error);
            const errorMsg = error.response?.data?.message || 'Failed to load pending requests';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoadingRequests(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await axios.get('/api/users/search', {
                params: {
                    q: searchQuery,
                    limit: 20
                }
            });

            // Filter out current user and existing friends
            const filteredResults = response.data.users.filter(result => {
                const isCurrentUser = result.id === user?.id;
                const isAlreadyFriend = friends.some(friend => friend.id === result.id);
                const hasPendingRequest = pendingRequests.some(req => req.id === result.id);
                return !isCurrentUser && !isAlreadyFriend && !hasPendingRequest;
            });
            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const sendFriendRequest = async (friendId) => {
        try {
            const response = await axios.post('/api/users/friends/request', { friendId });

            // Remove from search results and add to pending requests
            setSearchResults(prev => prev.filter(result => result.id !== friendId));
            // Refresh pending requests
            fetchPendingRequests();
            toast.success('Friend request sent successfully!');
        } catch (error) {
            console.error('Error sending friend request:', error);
            toast.error('Failed to send friend request');
        }
    };

    const respondToFriendRequest = async (friendId, action) => {
        try {
            const response = await axios.put('/api/users/friends/respond', { friendId, action });

            if (action === 'accept') {
                // Move to friends list
                fetchFriends();
                toast.success('Friend request accepted!');
            } else {
                toast.success('Friend request rejected');
            }
            // Remove from pending requests
            setPendingRequests(prev => prev.filter(req => req.id !== friendId));
        } catch (error) {
            console.error('Error responding to friend request:', error);
            toast.error('Failed to respond to friend request');
        }
    };

    const removeFriend = async (friendId) => {
        try {
            await axios.delete(`/api/users/friends/${friendId}`);
            setFriends(prev => prev.filter(friend => friend.id !== friendId));
            toast.success('Friend removed successfully');
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    return (
        <div className="friend-finder">
            <div className="friend-finder-header">
                <motion.h2
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <FiUsers className="header-icon" />
                    Friend Management
                </motion.h2>
                <p>Connect with fellow students and build your campus network</p>
            </div>

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="error-message"
                >
                    <p>⚠️ {error}</p>
                    <button onClick={() => setError(null)}>Dismiss</button>
                </motion.div>
            )}

            {/* Tab Navigation */}
            <div className="friend-tabs">
                <button
                    className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                    onClick={() => setActiveTab('search')}
                >
                    <FiSearch />
                    Find Friends
                </button>
                <button
                    className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                >
                    <FiUsers />
                    My Friends ({friends.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                >
                    <FiMail />
                    Requests ({pendingRequests.length})
                </button>
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="search-tab"
                >
                    <div className="search-section">
                        <div className="search-container">
                            <div className="search-input-wrapper">
                                <FiSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by name, student ID, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyPress}
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

                        {/* Search Results */}
                        <AnimatePresence>
                            {searchResults.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="search-results"
                                >
                                    <h3>Search Results ({searchResults.length})</h3>
                                    <div className="results-grid">
                                        {searchResults.map((result) => (
                                            <motion.div
                                                key={result.id}
                                                className="user-card"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                whileHover={{ scale: 1.02 }}
                                            >
                                                <div className="user-avatar">
                                                    {result.profileImage ? (
                                                        <img src={result.profileImage} alt={`${result.firstName} ${result.lastName}`} />
                                                    ) : (
                                                        <div className="avatar-placeholder">
                                                            {getInitials(result.firstName, result.lastName)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="user-info">
                                                    <h4>{result.firstName} {result.lastName}</h4>
                                                    <p className="user-email">{result.email}</p>
                                                    {result.studentId && (
                                                        <p className="user-student-id">
                                                            <FiHash /> {result.studentId}
                                                        </p>
                                                    )}
                                                    {result.department && (
                                                        <p className="user-department">{result.department}</p>
                                                    )}
                                                </div>
                                                <motion.button
                                                    className="add-friend-btn"
                                                    onClick={() => sendFriendRequest(result.id)}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiUserPlus />
                                                    Add Friend
                                                </motion.button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {searchQuery && searchResults.length === 0 && !isSearching && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="no-results"
                            >
                                <p>No users found matching "{searchQuery}"</p>
                                <p className="no-results-hint">Try searching with a different term</p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="friends-tab"
                >
                    <div className="friends-section">
                        {isLoadingFriends ? (
                            <div className="loading-state">
                                <FiLoader className="loading-spinner" />
                                <p>Loading friends...</p>
                            </div>
                        ) : friends.length > 0 ? (
                            <div className="friends-grid">
                                {friends.map((friend) => (
                                    <motion.div
                                        key={friend.id}
                                        className="friend-card"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className="friend-avatar">
                                            {friend.profileImage ? (
                                                <img src={friend.profileImage} alt={`${friend.firstName} ${friend.lastName}`} />
                                            ) : (
                                                <div className="avatar-placeholder">
                                                    {getInitials(friend.firstName, friend.lastName)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="friend-info">
                                            <h4>{friend.firstName} {friend.lastName}</h4>
                                            <p className="friend-email">{friend.email}</p>
                                            {friend.studentId && (
                                                <p className="friend-student-id">
                                                    <FiHash /> {friend.studentId}
                                                </p>
                                            )}
                                            {friend.department && (
                                                <p className="friend-department">{friend.department}</p>
                                            )}
                                        </div>
                                        <button
                                            className="remove-friend-btn"
                                            onClick={() => removeFriend(friend.id)}
                                            title="Remove Friend"
                                        >
                                            <FiX />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <FiUsers className="empty-icon" />
                                <h3>No Friends Yet</h3>
                                <p>Start searching for friends to build your network!</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="requests-tab"
                >
                    <div className="requests-section">
                        {isLoadingRequests ? (
                            <div className="loading-state">
                                <FiLoader className="loading-spinner" />
                                <p>Loading requests...</p>
                            </div>
                        ) : pendingRequests.length > 0 ? (
                            <div className="requests-grid">
                                {pendingRequests.map((request) => (
                                    <motion.div
                                        key={request.id}
                                        className="request-card"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className="request-avatar">
                                            {request.profileImage ? (
                                                <img src={request.profileImage} alt={`${request.firstName} ${request.lastName}`} />
                                            ) : (
                                                <div className="avatar-placeholder">
                                                    {getInitials(request.firstName, request.lastName)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="request-info">
                                            <h4>{request.firstName} {request.lastName}</h4>
                                            <p className="request-email">{request.email}</p>
                                            {request.studentId && (
                                                <p className="request-student-id">
                                                    <FiHash /> {request.studentId}
                                                </p>
                                            )}
                                            {request.department && (
                                                <p className="request-department">{request.department}</p>
                                            )}
                                        </div>
                                        <div className="request-actions">
                                            <motion.button
                                                className="accept-btn"
                                                onClick={() => respondToFriendRequest(request.id, 'accept')}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiCheck />
                                                Accept
                                            </motion.button>
                                            <motion.button
                                                className="reject-btn"
                                                onClick={() => respondToFriendRequest(request.id, 'reject')}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiX />
                                                Reject
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <FiMail className="empty-icon" />
                                <h3>No Pending Requests</h3>
                                <p>You're all caught up with friend requests!</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default FriendFinder;

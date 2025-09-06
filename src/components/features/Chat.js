import React, { useState, useEffect } from 'react';
import { FiSearch, FiMessageCircle, FiSend, FiSmile, FiPaperclip, FiMoreVertical, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Chat.css';

const Chat = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const {
        activeRooms,
        filteredFriends,
        currentRoom,
        messages,
        loading,
        error,
        searchQuery,
        createOrGetDirectChat,
        sendMessage,
        selectRoom,
        searchFriends,
        loadActiveRooms,
        refreshFriendsList,
        clearError
    } = useChat();

    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Refresh friends list when component mounts
    useEffect(() => {
        refreshFriendsList();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentRoom) return;

        try {
            await sendMessage(newMessage);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleStartChat = async (friend) => {
        try {
            await createOrGetDirectChat(friend.id);
        } catch (error) {
            console.error('Error starting chat:', error);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) { // 7 days
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const formatLastMessageTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h`;
        } else {
            return `${Math.floor(diffInHours / 24)}d`;
        }
    };

    return (
        <div className="chat-container">
            {error && (
                <div className="chat-error">
                    <span>{error}</span>
                    <button onClick={clearError}>×</button>
                </div>
            )}

            {/* Back Button */}
            <div className="chat-back-button">
                <button onClick={() => navigate('/features')} className="back-btn">
                    <FiArrowLeft />
                    Back to Dashboard
                </button>
            </div>

            <div className="chat-layout">
                {/* Left Sidebar */}
                <div className="chat-sidebar">
                    {/* Header */}
                    <div className="chat-sidebar-header">
                        <h2>Chats</h2>
                        <button className="chat-new-chat-btn">
                            <FiMessageCircle />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="chat-search-container">
                        <FiSearch className="chat-search-icon" />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => searchFriends(e.target.value)}
                            className="chat-search-input"
                        />
                    </div>

                    {/* Active Chats */}
                    <div className="chat-section">
                        <div className="chat-section-header">
                            <h3 className="chat-section-title">Active Chats</h3>
                            <button
                                className="chat-refresh-btn"
                                onClick={loadActiveRooms}
                                title="Refresh active chats"
                            >
                                <FiRefreshCw />
                            </button>
                        </div>
                        <div className="chat-rooms-list">
                            {loading ? (
                                <div className="chat-loading">Loading chats...</div>
                            ) : activeRooms.length === 0 ? (
                                <div className="chat-empty">No active chats</div>
                            ) : (
                                activeRooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className={`chat-room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
                                        onClick={() => selectRoom(room)}
                                    >
                                        <div className="chat-room-avatar">
                                            {room.display_image ? (
                                                <img src={room.display_image} alt={room.display_name} />
                                            ) : (
                                                <div className="chat-room-avatar-placeholder">
                                                    {room.display_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                            {room.unread_count > 0 && (
                                                <span className="chat-unread-badge">{room.unread_count}</span>
                                            )}
                                        </div>
                                        <div className="chat-room-info">
                                            <div className="chat-room-header">
                                                <h4 className="chat-room-name">{room.display_name}</h4>
                                                <span className="chat-room-time">
                                                    {formatLastMessageTime(room.last_message_time)}
                                                </span>
                                            </div>
                                            <p className="chat-room-last-message">
                                                {room.last_message_sender_id === user?.id ? 'You: ' : ''}
                                                {room.last_message || 'No messages yet'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Friends List */}
                    <div className="chat-section">
                        <div className="chat-section-header">
                            <h3 className="chat-section-title">Friends</h3>
                            <button
                                className="chat-refresh-btn"
                                onClick={refreshFriendsList}
                                title="Refresh friends list"
                            >
                                <FiRefreshCw />
                            </button>
                        </div>
                        <div className="chat-friends-list">
                            {loading ? (
                                <div className="chat-loading">Loading friends...</div>
                            ) : filteredFriends.length === 0 ? (
                                <div className="chat-empty">
                                    {searchQuery ? 'No friends found matching your search' : 'No friends yet. Add some friends to start chatting!'}
                                </div>
                            ) : (
                                filteredFriends.map((friend) => (
                                    <div
                                        key={friend.id}
                                        className="chat-friend-item"
                                        onClick={() => handleStartChat(friend)}
                                    >
                                        <div className="chat-friend-avatar">
                                            {friend.profileImage ? (
                                                <img src={friend.profileImage} alt={`${friend.firstName} ${friend.lastName}`} />
                                            ) : (
                                                <div className="chat-friend-avatar-placeholder">
                                                    {friend.firstName?.charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="chat-friend-info">
                                            <h4 className="chat-friend-name">
                                                {friend.firstName} {friend.lastName}
                                            </h4>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Chat Area */}
                <div className="chat-main">
                    {currentRoom ? (
                        <>
                            {/* Chat Header */}
                            <div className="chat-header">
                                <div className="chat-header-info">
                                    <div className="chat-header-avatar">
                                        {currentRoom.otherUser?.profileImage ? (
                                            <img src={currentRoom.otherUser.profileImage} alt={currentRoom.otherUser.firstName} />
                                        ) : (
                                            <div className="chat-header-avatar-placeholder">
                                                {currentRoom.otherUser?.firstName?.charAt(0)?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="chat-header-details">
                                        <h3 className="chat-header-name">
                                            {currentRoom.otherUser?.firstName} {currentRoom.otherUser?.lastName}
                                        </h3>
                                        <span className="chat-header-status">Online</span>
                                    </div>
                                </div>
                                <div className="chat-header-actions">
                                    <button className="chat-header-btn">
                                        <FiMoreVertical />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="chat-messages">
                                {messages.length === 0 ? (
                                    <div className="chat-messages-empty">
                                        <FiMessageCircle />
                                        <p>Start a conversation with {currentRoom.otherUser?.firstName}</p>
                                    </div>
                                ) : (
                                    <div className="chat-messages-list">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`chat-message ${message.sender_id === user?.id ? 'sent' : 'received'}`}
                                            >
                                                <div className="chat-message-content">
                                                    <p>{message.message}</p>
                                                    <span className="chat-message-time">
                                                        {formatTime(message.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Message Input */}
                            <div className="chat-input-container">
                                <form onSubmit={handleSendMessage} className="chat-input-form">
                                    <button type="button" className="chat-input-btn">
                                        <FiPaperclip />
                                    </button>
                                    <div className="chat-input-wrapper">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="chat-input"
                                        />
                                        <button
                                            type="button"
                                            className="chat-input-btn"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        >
                                            <FiSmile />
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        className="chat-send-btn"
                                        disabled={!newMessage.trim()}
                                    >
                                        <FiSend />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="chat-welcome">
                            <FiMessageCircle />
                            <h2>Welcome to Chat</h2>
                            <p>Select a friend to start chatting or search for someone to message.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;

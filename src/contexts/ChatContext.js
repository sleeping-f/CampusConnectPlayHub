import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [activeRooms, setActiveRooms] = useState([]);
    const [friends, setFriends] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFriends, setFilteredFriends] = useState([]);

    // Adaptive polling configuration
    const [pollingInterval, setPollingInterval] = useState(2000);
    const [lastMessageTime, setLastMessageTime] = useState(Date.now());
    const [isActive, setIsActive] = useState(true);

    // Load initial data
    useEffect(() => {
        if (isAuthenticated && user) {
            loadActiveRooms();
            loadFriends();
        }
    }, [isAuthenticated, user]);

    // Monitor page visibility for adaptive polling
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsActive(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Adaptive polling logic
    useEffect(() => {
        if (!isActive) {
            setPollingInterval(5000); // Slow polling when tab is not active
            return;
        }

        const timeSinceLastMessage = Date.now() - lastMessageTime;

        if (timeSinceLastMessage < 5000) {
            // Recent activity - fast polling
            setPollingInterval(500);
        } else if (timeSinceLastMessage < 30000) {
            // Some activity - normal polling
            setPollingInterval(2000);
        } else {
            // No activity - slow polling
            setPollingInterval(5000);
        }
    }, [isActive, lastMessageTime]);

    // Poll for new messages when a room is active
    useEffect(() => {
        if (!currentRoom || !isAuthenticated) return;

        const pollMessages = async () => {
            try {
                const response = await axios.get(`/api/chat/rooms/${currentRoom.id}/messages`);
                const newMessages = response.data;

                if (newMessages.length > 0) {
                    setMessages(newMessages);
                    setLastMessageTime(Date.now());
                }
            } catch (error) {
                console.error('Error polling messages:', error);
                // Increase interval on error to reduce load
                setPollingInterval(prev => Math.min(prev * 1.5, 10000));
            }
        };

        pollMessages();
        const interval = setInterval(pollMessages, pollingInterval);
        return () => clearInterval(interval);
    }, [currentRoom, pollingInterval, isAuthenticated]);

    // Poll for room updates
    useEffect(() => {
        if (!isAuthenticated) return;

        const pollRooms = async () => {
            try {
                const response = await axios.get('/api/chat/rooms');
                setActiveRooms(response.data);
            } catch (error) {
                console.error('Error polling rooms:', error);
            }
        };

        pollRooms();
        const interval = setInterval(pollRooms, pollingInterval * 2); // Poll rooms less frequently
        return () => clearInterval(interval);
    }, [pollingInterval, isAuthenticated]);

    const loadActiveRooms = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/chat/rooms');
            setActiveRooms(response.data);
        } catch (error) {
            console.error('Error loading active rooms:', error);
            setError('Failed to load chat rooms');
        } finally {
            setLoading(false);
        }
    };

    const loadFriends = useCallback(async () => {
        try {
            const response = await axios.get('/api/chat/friends');
            setFriends(response.data);
            setFilteredFriends(response.data);
        } catch (error) {
            console.error('Error loading friends:', error);
            setError('Failed to load friends');
        }
    }, []);

    const searchFriends = async (query) => {
        setSearchQuery(query);

        if (!query.trim()) {
            setFilteredFriends(friends);
            return;
        }

        try {
            const response = await axios.get(`/api/chat/friends/search?q=${encodeURIComponent(query)}`);
            setFilteredFriends(response.data);
        } catch (error) {
            console.error('Error searching friends:', error);
            setFilteredFriends([]);
        }
    };

    const createOrGetDirectChat = async (friendId) => {
        try {
            setLoading(true);
            const response = await axios.post('/api/chat/rooms/direct', { friendId });
            const room = response.data;

            // Add to active rooms if not already present
            setActiveRooms(prev => {
                const exists = prev.find(r => r.id === room.id);
                if (exists) {
                    return prev.map(r => r.id === room.id ? room : r);
                }
                return [room, ...prev];
            });

            setCurrentRoom(room);
            setMessages([]); // Clear current messages
            setLastMessageTime(Date.now()); // Reset polling timer

            return room;
        } catch (error) {
            console.error('Error creating/getting direct chat:', error);
            setError('Failed to start chat');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (message, messageType = 'text', replyToId = null) => {
        if (!currentRoom || !message.trim()) return;

        try {
            const response = await axios.post(`/api/chat/rooms/${currentRoom.id}/messages`, {
                message: message.trim(),
                messageType,
                replyToId
            });

            const newMessage = response.data;
            setMessages(prev => [...prev, newMessage]);
            setLastMessageTime(Date.now()); // Update polling timer

            // Update room's last message in active rooms
            setActiveRooms(prev =>
                prev.map(room =>
                    room.id === currentRoom.id
                        ? { ...room, last_message: newMessage.message, last_message_time: newMessage.created_at }
                        : room
                )
            );

            return newMessage;
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message');
            throw error;
        }
    };

    const selectRoom = async (room) => {
        setCurrentRoom(room);
        setMessages([]);
        setLastMessageTime(Date.now());

        // Load messages for the selected room
        try {
            const response = await axios.get(`/api/chat/rooms/${room.id}/messages`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading messages:', error);
            setError('Failed to load messages');
        }
    };

    const clearError = () => {
        setError('');
    };

    const refreshFriendsList = useCallback(async () => {
        try {
            await loadFriends();
        } catch (error) {
            console.error('Error refreshing friends list:', error);
        }
    }, [loadFriends]);

    const value = {
        // State
        activeRooms,
        friends,
        filteredFriends,
        currentRoom,
        messages,
        loading,
        error,
        searchQuery,

        // Actions
        createOrGetDirectChat,
        sendMessage,
        selectRoom,
        searchFriends,
        loadActiveRooms,
        loadFriends,
        refreshFriendsList,
        clearError,

        // Polling info
        pollingInterval,
        isActive
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

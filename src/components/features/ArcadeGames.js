import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiGrid, FiUsers, FiAward, FiPlay, FiPlus, FiCopy, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import TicTacToe from './TicTacToe';
import RockPaperScissors from './RockPaperScissors';
import './ArcadeGames.css';

const ArcadeGames = () => {
    const { user, refreshAuth } = useAuth();
    const [activeTab, setActiveTab] = useState('games');
    const [games, setGames] = useState([]);
    const [statistics, setStatistics] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);
    const [roomCode, setRoomCode] = useState('');
    const [currentRoom, setCurrentRoom] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchGames();
        fetchStatistics();
    }, []);

    const fetchGames = async () => {
        try {
            const response = await axios.get('/api/games');
            setGames(response.data);
        } catch (error) {
            console.error('Error fetching games:', error);
            setError('Failed to load games');
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await axios.get('/api/games/statistics');
            setStatistics(response.data);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchLeaderboard = async (gameId) => {
        try {
            const response = await axios.get(`/api/games/${gameId}/leaderboard?limit=10`);
            setLeaderboard(response.data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };

    const createRoom = async (gameId) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/games/rooms',
                { gameId }
            );

            setCurrentRoom(response.data);
            setSelectedGame(games.find(g => g.id === gameId));
            setActiveTab('play');
        } catch (error) {
            console.error('Error creating room:', error);
            if (error.response?.status === 429) {
                setError('Too many requests. Please wait a moment and try again.');
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to create room. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const joinRoom = async () => {
        if (!roomCode.trim()) {
            setError('Please enter a room code');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post(`/api/games/rooms/${roomCode.toUpperCase()}/join`,
                {}
            );

            console.log('Joined room successfully:', response.data);
            setCurrentRoom(response.data);
            setSelectedGame(games.find(g => g.id === response.data.gameId));
            setActiveTab('play');
        } catch (error) {
            console.error('Error joining room:', error);
            if (error.response?.status === 429) {
                setError('Too many requests. Please wait a moment and try again.');
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to join room. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const copyRoomCode = () => {
        if (currentRoom?.roomCode) {
            navigator.clipboard.writeText(currentRoom.roomCode);
            // You could add a toast notification here
        }
    };

    const leaveRoom = () => {
        setCurrentRoom(null);
        setSelectedGame(null);
        setActiveTab('games');
        // Refresh statistics when leaving a room (in case a game was completed)
        fetchStatistics();
    };

    const handleGameCompletion = () => {
        // Refresh statistics when a game is completed
        fetchStatistics();
    };

    const tabs = [
        { id: 'games', label: 'Games', icon: FiGrid },
        { id: 'stats', label: 'Statistics', icon: FiAward },
        { id: 'play', label: 'Play', icon: FiPlay }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'games':
                return (
                    <div className="games-grid">
                        {games.map((game) => (
                            <motion.div
                                key={game.id}
                                className="game-card"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="game-icon">
                                    <FiGrid />
                                </div>
                                <h3>{game.name.replace('-', ' ').toUpperCase()}</h3>
                                <p>{game.description}</p>
                                <div className="game-actions">
                                    <button
                                        className="btn-primary"
                                        onClick={() => createRoom(game.id)}
                                        disabled={loading}
                                    >
                                        <FiPlus /> Create Room
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => fetchLeaderboard(game.id)}
                                    >
                                        <FiAward /> Leaderboard
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                );

            case 'stats':
                return (
                    <div className="stats-container">
                        <div className="stats-header">
                            <h3>Your Game Statistics</h3>
                            <button
                                className="btn-secondary"
                                onClick={fetchStatistics}
                                disabled={loading}
                            >
                                <FiRefreshCw className={loading ? 'spinning' : ''} />
                                Refresh Stats
                            </button>
                        </div>
                        <div className="stats-grid">
                            {statistics.length > 0 ? (
                                statistics.map((stat) => (
                                    <div key={stat.id} className="stat-card">
                                        <h3>{stat.game_name.replace('-', ' ').toUpperCase()}</h3>
                                        <div className="stat-numbers">
                                            <div className="stat-item">
                                                <span className="stat-value">{stat.wins}</span>
                                                <span className="stat-label">Wins</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-value">{stat.losses}</span>
                                                <span className="stat-label">Losses</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-value">{stat.draws}</span>
                                                <span className="stat-label">Draws</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-value">{stat.total_games}</span>
                                                <span className="stat-label">Total</span>
                                            </div>
                                        </div>
                                        <div className="win-rate">
                                            Win Rate: {stat.total_games > 0 ? Math.round((stat.wins / stat.total_games) * 100) : 0}%
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-stats">
                                    <p>No game statistics yet. Play some games to see your stats here!</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'play':
                if (currentRoom && selectedGame) {
                    // Render the appropriate game component based on game type
                    if (selectedGame.name === 'rock-paper-scissors') {
                        return (
                            <RockPaperScissors
                                room={currentRoom}
                                game={selectedGame}
                                user={user}
                                onLeaveRoom={leaveRoom}
                                onGameCompletion={handleGameCompletion}
                            />
                        );
                    } else {
                        // Default to TicTacToe for other games
                        return (
                            <TicTacToe
                                room={currentRoom}
                                game={selectedGame}
                                user={user}
                                onLeaveRoom={leaveRoom}
                                onGameCompletion={handleGameCompletion}
                            />
                        );
                    }
                }
                return (
                    <div className="play-container">
                        <div className="join-room-section">
                            <h3>Join a Game Room</h3>
                            <div className="room-input-group">
                                <input
                                    type="text"
                                    placeholder="Enter room code"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                />
                                <button
                                    className="btn-primary"
                                    onClick={joinRoom}
                                    disabled={loading}
                                >
                                    <FiPlay /> Join Room
                                </button>
                            </div>
                            {error && <div className="error-message">{error}</div>}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="arcade-games-container">
            <div className="arcade-header">
                <h2>🎮 ARCADE GAMES</h2>
                <p>Challenge your friends and climb the leaderboards in our gaming universe!</p>
            </div>

            <div className="arcade-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="arcade-content">
                {renderTabContent()}
            </div>

            {leaderboard.length > 0 && (
                <div className="leaderboard-modal">
                    <div className="leaderboard-content">
                        <h3>🏆 Leaderboard</h3>
                        <div className="leaderboard-list">
                            {leaderboard.map((player, index) => (
                                <div key={player.user_id} className="leaderboard-item">
                                    <div className="rank">#{index + 1}</div>
                                    <div className="player-info">
                                        <div className="player-name">
                                            {player.firstName} {player.lastName}
                                        </div>
                                        <div className="player-stats">
                                            {player.wins}W - {player.losses}L - {player.draws}D
                                        </div>
                                    </div>
                                    <div className="points">{player.points} pts</div>
                                </div>
                            ))}
                        </div>
                        <button
                            className="btn-secondary"
                            onClick={() => setLeaderboard([])}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArcadeGames;

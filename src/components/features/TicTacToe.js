import React, { useState, useEffect } from 'react';
import { FiX, FiCopy, FiRefreshCw, FiUsers } from 'react-icons/fi';
import axios from 'axios';
import './TicTacToe.css';

const TicTacToe = ({ room, game, user, onLeaveRoom, onGameComplete }) => {
    const [gameState, setGameState] = useState({
        board: Array(9).fill(null),
        currentPlayer: 'X',
        gameStatus: 'waiting'
    });
    const [roomDetails, setRoomDetails] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRoomDetails();
        const interval = setInterval(fetchRoomDetails, 500);
        return () => clearInterval(interval);
    }, [room.roomCode]);

    const fetchRoomDetails = async () => {
        try {
            const response = await axios.get(`/api/games/rooms/${room.roomCode}`);
            setRoomDetails(response.data);
            setGameState(response.data.gameState);
            setPlayers(response.data.players);

            // Debug logging and trigger statistics refresh
            if (response.data.gameState.gameStatus === 'finished') {
                console.log('Game finished:', {
                    winner: response.data.gameState.winner,
                    winner_id: response.data.winner_id,
                    gameState: response.data.gameState
                });
                // Trigger statistics refresh when game finishes
                if (onGameComplete) {
                    onGameComplete();
                }
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
            if (error.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
            }
        }
    };

    const makeMove = async (position) => {
        if (gameState.board[position] !== null || gameState.gameStatus !== 'playing') {
            return;
        }

        const playerSymbol = getPlayerSymbol();

        if (gameState.currentPlayer !== playerSymbol) {
            setError(`Not your turn! It's ${gameState.currentPlayer}'s turn, you are ${playerSymbol}`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post(`/api/games/rooms/${room.roomCode}/move`, {
                position,
                playerSymbol
            });

            setGameState(response.data.gameState);
            setError('');
        } catch (error) {
            console.error('Error making move:', error);
            if (error.response?.status === 429) {
                setError('Too many requests. Please wait a moment and try again.');
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to make move. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const getPlayerSymbol = () => {
        const player = players.find(p => p.id === user.id);
        return player ? player.player_symbol : null;
    };

    const getCurrentPlayerName = () => {
        const currentPlayer = players.find(p => p.player_symbol === gameState.currentPlayer);
        return currentPlayer ? `${currentPlayer.firstName} ${currentPlayer.lastName}` : 'Unknown';
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(room.roomCode);
        // You could add a toast notification here
    };

    const renderCell = (index) => {
        const value = gameState.board[index];
        const playerSymbol = getPlayerSymbol();
        const isClickable = value === null && gameState.gameStatus === 'playing' && gameState.currentPlayer === playerSymbol;

        return (
            <button
                key={index}
                className={`cell ${isClickable ? 'clickable' : ''} ${value ? 'filled' : ''}`}
                onClick={() => {
                    if (isClickable) {
                        makeMove(index);
                    }
                }}
                disabled={!isClickable || loading}
            >
                {value === 'X' && <FiX className="symbol x-symbol" />}
                {value === 'O' && <span className="symbol o-symbol">O</span>}
            </button>
        );
    };

    const getGameStatusMessage = () => {
        if (gameState.gameStatus === 'waiting') {
            return 'Waiting for another player...';
        } else if (gameState.gameStatus === 'playing') {
            return 'Game in Progress';
        } else if (gameState.gameStatus === 'finished') {
            if (gameState.winner === 'draw') {
                return "It's a Draw!";
            } else if (roomDetails?.winner_id) {
                const winner = players.find(p => p.id === roomDetails.winner_id);
                if (winner && winner.id === user.id) {
                    return '🎉 You Won!';
                } else {
                    return `🏆 ${winner ? `${winner.firstName} ${winner.lastName}` : 'Someone'} Won!`;
                }
            } else {
                // Fallback: check if current user's symbol won
                const playerSymbol = getPlayerSymbol();
                if (gameState.winner === playerSymbol) {
                    return '🎉 You Won!';
                } else {
                    return `🏆 ${gameState.winner} Won!`;
                }
            }
        }
        return '';
    };

    const canStartNewGame = () => {
        return gameState.gameStatus === 'finished' && players.length >= 2 && !loading;
    };

    const startNewGame = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(`/api/games/rooms/${room.roomCode}/reset`);
            console.log('Game reset successfully:', response.data);
            setGameState(response.data.gameState);
            setError('');
        } catch (error) {
            console.error('Error starting new game:', error);
            if (error.response?.status === 429) {
                setError('Too many requests. Please wait a moment and try again.');
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to start new game. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tic-tac-toe-container">
            <div className="game-header">
                <div className="room-info">
                    <h3>🎮 {game.name.replace('-', ' ').toUpperCase()}</h3>
                    <div className="room-code-section">
                        <span>Room Code: </span>
                        <span className="code">{room.roomCode}</span>
                        <button
                            className="copy-btn"
                            onClick={copyRoomCode}
                            title="Copy room code"
                        >
                            <FiCopy />
                        </button>
                    </div>
                </div>
                <button className="close-btn" onClick={onLeaveRoom} title="Exit Room">
                    <FiX />
                    <span>Exit Room</span>
                </button>
            </div>

            <div className="game-content">
                <div className="players-section">
                    <h4><FiUsers /> Players ({players.length}/2)</h4>
                    <div className="players-list">
                        {players.map((player) => (
                            <div key={player.id} className={`player-item ${player.id === user.id ? 'current-user' : ''}`}>
                                <div className="player-avatar">
                                    {player.firstName.charAt(0).toUpperCase()}
                                </div>
                                <div className="player-info">
                                    <div className="player-name">{player.firstName} {player.lastName}</div>
                                    <div className="player-symbol">Symbol: {player.player_symbol}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="game-area">
                    <div className="turn-indicator">
                        {gameState.gameStatus === 'playing' && (
                            <div className={`turn-badge ${gameState.currentPlayer === getPlayerSymbol() ? 'your-turn' : 'opponent-turn'}`}>
                                {gameState.currentPlayer === getPlayerSymbol() ? (
                                    <>🎯 Your Turn ({gameState.currentPlayer})</>
                                ) : (
                                    <>⏳ {getCurrentPlayerName()}'s Turn ({gameState.currentPlayer})</>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="game-board">
                        {Array.from({ length: 9 }, (_, index) => renderCell(index))}
                    </div>

                    <div className="game-status">
                        <h3>{getGameStatusMessage()}</h3>
                    </div>

                    {canStartNewGame() && (
                        <div className="new-game-section">
                            <button
                                className="btn-primary"
                                onClick={startNewGame}
                                disabled={loading}
                            >
                                <FiRefreshCw className={loading ? 'spinning' : ''} />
                                {loading ? 'Resetting Game...' : 'Start New Game'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default TicTacToe;
import React, { useState, useEffect } from 'react';
import { FiX, FiCopy, FiRefreshCw, FiUsers, FiTarget } from 'react-icons/fi';
import axios from 'axios';
import './RockPaperScissors.css';

const RockPaperScissors = ({ room, game, user, onLeaveRoom, onGameComplete }) => {
    const [gameState, setGameState] = useState({
        player1Choice: null,
        player2Choice: null,
        player1Score: 0,
        player2Score: 0,
        currentRound: 1,
        maxRounds: 15,
        gameStatus: 'waiting',
        roundResult: null,
        gameResult: null
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
                    winner: response.data.gameState.gameResult,
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

    const makeChoice = async (choice) => {
        if (gameState.gameStatus !== 'playing') {
            return;
        }

        const playerSymbol = getPlayerSymbol();
        const isPlayer1 = playerSymbol === 'X';

        // Check if player has already made a choice this round
        if ((isPlayer1 && gameState.player1Choice !== null) ||
            (!isPlayer1 && gameState.player2Choice !== null)) {
            setError('You have already made your choice for this round!');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post(`/api/games/rooms/${room.roomCode}/move`, {
                choice,
                playerSymbol
            });

            setGameState(response.data.gameState);
            setError('');
        } catch (error) {
            console.error('Error making choice:', error);
            if (error.response?.status === 429) {
                setError('Too many requests. Please wait a moment and try again.');
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to make choice. Please try again.');
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
        const currentPlayer = players.find(p => p.player_symbol === 'X');
        return currentPlayer ? `${currentPlayer.firstName} ${currentPlayer.lastName}` : 'Player 1';
    };

    const getOpponentName = () => {
        const opponent = players.find(p => p.player_symbol === 'O');
        return opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Player 2';
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(room.roomCode);
        // You could add a toast notification here
    };

    const getChoiceEmoji = (choice) => {
        switch (choice) {
            case 'rock': return '🪨';
            case 'paper': return '📄';
            case 'scissors': return '✂️';
            default: return '❓';
        }
    };

    const getChoiceName = (choice) => {
        switch (choice) {
            case 'rock': return 'Rock';
            case 'paper': return 'Paper';
            case 'scissors': return 'Scissors';
            default: return 'Unknown';
        }
    };

    const getGameStatusMessage = () => {
        if (gameState.gameStatus === 'waiting') {
            return 'Waiting for another player...';
        } else if (gameState.gameStatus === 'playing') {
            if (gameState.player1Choice === null || gameState.player2Choice === null) {
                const playerSymbol = getPlayerSymbol();
                const isPlayer1 = playerSymbol === 'X';
                const hasPlayer1Choice = gameState.player1Choice !== null;
                const hasPlayer2Choice = gameState.player2Choice !== null;

                if (isPlayer1 && !hasPlayer1Choice) {
                    return '🎯 Your turn - Choose your weapon!';
                } else if (!isPlayer1 && !hasPlayer2Choice) {
                    return '🎯 Your turn - Choose your weapon!';
                } else {
                    return '⏳ Waiting for opponent to choose...';
                }
            } else {
                return 'Round Complete - Results below!';
            }
        } else if (gameState.gameStatus === 'finished') {
            // Check game result from game state
            if (gameState.gameResult) {
                const playerSymbol = getPlayerSymbol();
                const isPlayer1 = playerSymbol === 'X';

                if (gameState.gameResult === 'draw') {
                    return '🤝 It\'s a Draw!';
                } else if ((gameState.gameResult === 'player1' && isPlayer1) ||
                    (gameState.gameResult === 'player2' && !isPlayer1)) {
                    return '🎉 You Won the Match!';
                } else {
                    return '😔 You Lost the Match!';
                }
            }

            // Fallback to winner_id logic
            if (roomDetails?.winner_id) {
                const winner = players.find(p => p.id === roomDetails.winner_id);
                if (winner && winner.id === user.id) {
                    return '🎉 You Won the Match!';
                } else {
                    return `🏆 ${winner ? `${winner.firstName} ${winner.lastName}` : 'Someone'} Won the Match!`;
                }
            } else {
                return '🏁 Match Complete!';
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

    const renderChoiceButton = (choice) => {
        const playerSymbol = getPlayerSymbol();
        const isPlayer1 = playerSymbol === 'X';
        const hasPlayer1Choice = gameState.player1Choice !== null;
        const hasPlayer2Choice = gameState.player2Choice !== null;
        const canMakeChoice = gameState.gameStatus === 'playing' &&
            ((isPlayer1 && !hasPlayer1Choice) || (!isPlayer1 && !hasPlayer2Choice));

        return (
            <button
                key={choice}
                className={`choice-btn ${choice} ${canMakeChoice ? 'clickable' : ''}`}
                onClick={() => {
                    if (canMakeChoice) {
                        makeChoice(choice);
                    }
                }}
                disabled={!canMakeChoice || loading}
                title={getChoiceName(choice)}
            >
                <span className="choice-emoji">{getChoiceEmoji(choice)}</span>
                <span className="choice-name">{getChoiceName(choice)}</span>
            </button>
        );
    };

    const getRoundResultText = () => {
        if (!gameState.roundResult) return '';

        switch (gameState.roundResult) {
            case 'player1': return `${getCurrentPlayerName()} wins this round!`;
            case 'player2': return `${getOpponentName()} wins this round!`;
            case 'draw': return "It's a draw!";
            default: return '';
        }
    };

    return (
        <div className="rock-paper-scissors-container">
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
                    <div className="score-board">
                        <div className="score-item">
                            <div className="player-name">{getCurrentPlayerName()}</div>
                            <div className="score">{gameState.player1Score}</div>
                        </div>
                        <div className="vs">VS</div>
                        <div className="score-item">
                            <div className="player-name">{getOpponentName()}</div>
                            <div className="score">{gameState.player2Score}</div>
                        </div>
                    </div>

                    <div className="round-info">
                        <div className="round-counter">
                            Round {gameState.currentRound} of {gameState.maxRounds}
                        </div>
                        <div className="target-score">
                            <FiTarget /> First to 5 wins!
                        </div>
                    </div>

                    <div className="game-status">
                        <h3>{getGameStatusMessage()}</h3>
                    </div>

                    {gameState.gameStatus === 'playing' && (
                        <div className="choices-section">
                            <div className="choices-grid">
                                {['rock', 'paper', 'scissors'].map(choice => renderChoiceButton(choice))}
                            </div>
                        </div>
                    )}

                    {gameState.player1Choice !== null && gameState.player2Choice !== null && (
                        <div className="round-results">
                            <div className="choices-display">
                                <div className="choice-display">
                                    <div className="player-label">{getCurrentPlayerName()}</div>
                                    <div className="choice-result">
                                        <span className="choice-emoji">{getChoiceEmoji(gameState.player1Choice)}</span>
                                        <span className="choice-name">{getChoiceName(gameState.player1Choice)}</span>
                                    </div>
                                </div>
                                <div className="vs-small">VS</div>
                                <div className="choice-display">
                                    <div className="player-label">{getOpponentName()}</div>
                                    <div className="choice-result">
                                        <span className="choice-emoji">{getChoiceEmoji(gameState.player2Choice)}</span>
                                        <span className="choice-name">{getChoiceName(gameState.player2Choice)}</span>
                                    </div>
                                </div>
                            </div>
                            {gameState.roundResult && (
                                <div className="round-result-text">
                                    {getRoundResultText()}
                                </div>
                            )}
                        </div>
                    )}

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

export default RockPaperScissors;

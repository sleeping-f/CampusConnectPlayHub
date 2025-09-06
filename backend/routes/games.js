const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// More generous rate limiter for games API
const gamesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Allow 500 requests per 15 minutes for games
    message: 'Too many game requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply the games rate limiter to all game routes
// TEMPORARILY DISABLED FOR DEVELOPMENT - UNCOMMENT FOR PRODUCTION
// router.use(gamesLimiter);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Generate room code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Get all available games
router.get('/games', authenticateToken, async (req, res) => {
    try {
        const [games] = await req.db.execute(
            'SELECT * FROM games WHERE is_active = TRUE ORDER BY name'
        );
        res.json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ message: 'Failed to fetch games' });
    }
});

// Create a new game room
router.post('/games/rooms', authenticateToken, async (req, res) => {
    try {
        const { gameId } = req.body;
        const userId = req.user.id;

        // Verify game exists
        const [games] = await req.db.execute(
            'SELECT * FROM games WHERE id = ? AND is_active = TRUE',
            [gameId]
        );

        if (games.length === 0) {
            return res.status(400).json({ message: 'Game not found or inactive' });
        }

        // Generate unique room code
        let roomCode;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            roomCode = generateRoomCode();
            const [existingRooms] = await req.db.execute(
                'SELECT id FROM game_rooms WHERE room_code = ?',
                [roomCode]
            );
            isUnique = existingRooms.length === 0;
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({ message: 'Failed to generate unique room code' });
        }

        // Create room
        const [result] = await req.db.execute(
            'INSERT INTO game_rooms (room_code, game_id, creator_id, current_player_id) VALUES (?, ?, ?, ?)',
            [roomCode, gameId, userId, userId]
        );

        const roomId = result.insertId;

        // Add creator as first player
        await req.db.execute(
            'INSERT INTO game_room_players (room_id, player_id, player_symbol) VALUES (?, ?, ?)',
            [roomId, userId, 'X']
        );

        // Initialize game state based on game type
        let gameState;
        if (games[0].name === 'rock-paper-scissors') {
            gameState = {
                player1Choice: null,
                player2Choice: null,
                player1Score: 0,
                player2Score: 0,
                currentRound: 1,
                maxRounds: 15,
                gameStatus: 'waiting',
                roundResult: null,
                gameResult: null
            };
        } else {
            // Default to tic-tac-toe
            gameState = {
                board: Array(9).fill(null),
                currentPlayer: 'X',
                gameStatus: 'waiting'
            };
        }

        console.log('Created room:', roomCode, 'with game state:', gameState);

        await req.db.execute(
            'UPDATE game_rooms SET game_state = ? WHERE id = ?',
            [JSON.stringify(gameState), roomId]
        );

        res.json({
            roomId,
            roomCode,
            gameId,
            status: 'waiting',
            gameState
        });
    } catch (error) {
        console.error('Error creating game room:', error);
        res.status(500).json({ message: 'Failed to create game room' });
    }
});

// Join a game room
router.post('/games/rooms/:roomCode/join', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const userId = req.user.id;

        // Get room details
        const [rooms] = await req.db.execute(
            `SELECT gr.*, g.name as game_name, g.max_players 
       FROM game_rooms gr 
       JOIN games g ON gr.game_id = g.id 
       WHERE gr.room_code = ?`,
            [roomCode]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = rooms[0];

        if (room.status !== 'waiting') {
            return res.status(400).json({ message: 'Room is not accepting new players' });
        }

        // Check if user is already in the room
        const [existingPlayers] = await req.db.execute(
            'SELECT * FROM game_room_players WHERE room_id = ? AND player_id = ?',
            [room.id, userId]
        );

        if (existingPlayers.length > 0) {
            return res.json({
                roomId: room.id,
                roomCode: room.room_code,
                gameId: room.game_id,
                status: room.status,
                gameState: JSON.parse(room.game_state || '{}')
            });
        }

        // Check if room is full
        const [players] = await req.db.execute(
            'SELECT COUNT(*) as count FROM game_room_players WHERE room_id = ?',
            [room.id]
        );

        if (players[0].count >= room.max_players) {
            return res.status(400).json({ message: 'Room is full' });
        }

        // Add player to room
        const playerSymbol = players[0].count === 0 ? 'X' : 'O';
        await req.db.execute(
            'INSERT INTO game_room_players (room_id, player_id, player_symbol) VALUES (?, ?, ?)',
            [room.id, userId, playerSymbol]
        );

        // If room is now full, start the game
        let finalGameState = JSON.parse(room.game_state || '{}');
        let finalStatus = 'waiting';

        if (players[0].count + 1 >= room.max_players) {
            console.log(`Room ${roomCode}: Starting game - room is full`);
            finalGameState.gameStatus = 'playing';

            // Set current player based on game type
            if (room.game_name === 'rock-paper-scissors') {
                // For RPS, both players can make choices simultaneously
                finalGameState.currentRound = 1;
                finalGameState.player1Score = 0;
                finalGameState.player2Score = 0;
                finalGameState.player1Choice = null;
                finalGameState.player2Choice = null;
                finalGameState.roundResult = null;
                finalGameState.gameResult = null;
            } else {
                // Default to tic-tac-toe
                finalGameState.currentPlayer = 'X';
            }

            finalStatus = 'playing';

            await req.db.execute(
                'UPDATE game_rooms SET status = ?, game_state = ? WHERE id = ?',
                ['playing', JSON.stringify(finalGameState), room.id]
            );
        }

        res.json({
            roomId: room.id,
            roomCode: room.room_code,
            gameId: room.game_id,
            status: finalStatus,
            gameState: finalGameState
        });
    } catch (error) {
        console.error('Error joining game room:', error);
        res.status(500).json({ message: 'Failed to join game room' });
    }
});

// Get room details
router.get('/games/rooms/:roomCode', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const userId = req.user.id;

        const [rooms] = await req.db.execute(
            `SELECT gr.*, g.name as game_name, g.max_players 
       FROM game_rooms gr 
       JOIN games g ON gr.game_id = g.id 
       WHERE gr.room_code = ?`,
            [roomCode]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = rooms[0];

        // Get players in the room
        const [players] = await req.db.execute(
            `SELECT u.id, u.firstName, u.lastName, u.profileImage, grp.player_symbol, grp.joined_at
       FROM game_room_players grp
       JOIN users u ON grp.player_id = u.id
       WHERE grp.room_id = ?
       ORDER BY grp.joined_at`,
            [room.id]
        );

        res.json({
            roomId: room.id,
            roomCode: room.room_code,
            gameId: room.game_id,
            gameName: room.game_name,
            status: room.status,
            gameState: JSON.parse(room.game_state || '{}'),
            players: players,
            isPlayer: players.some(p => p.id === userId)
        });
    } catch (error) {
        console.error('Error fetching room details:', error);
        res.status(500).json({ message: 'Failed to fetch room details' });
    }
});

// Make a move in any game
router.post('/games/rooms/:roomCode/move', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { position, choice, playerSymbol } = req.body;
        const userId = req.user.id;

        // Get room details with game name
        const [rooms] = await req.db.execute(
            `SELECT gr.*, g.name as game_name 
             FROM game_rooms gr 
             JOIN games g ON gr.game_id = g.id 
             WHERE gr.room_code = ?`,
            [roomCode]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = rooms[0];

        if (room.status !== 'playing') {
            return res.status(400).json({ message: 'Game is not in playing state' });
        }

        // Get player details
        const [players] = await req.db.execute(
            'SELECT * FROM game_room_players WHERE room_id = ? AND player_id = ?',
            [room.id, userId]
        );

        if (players.length === 0) {
            return res.status(403).json({ message: 'You are not a player in this room' });
        }

        const player = players[0];
        const gameState = JSON.parse(room.game_state || '{}');

        // Handle different game types
        if (room.game_name === 'rock-paper-scissors') {
            return await handleRockPaperScissorsMove(req, res, room, gameState, player, choice);
        } else {
            // Default to tic-tac-toe
            return await handleTicTacToeMove(req, res, room, gameState, player, position);
        }
    } catch (error) {
        console.error('Error making move:', error);
        res.status(500).json({ message: 'Failed to make move' });
    }
});

// Handle Tic Tac Toe moves
const handleTicTacToeMove = async (req, res, room, gameState, player, position) => {
    const { roomCode } = req.params;
    const userId = req.user.id;

    console.log(`Tic Tac Toe move attempt - Room: ${roomCode}, User: ${userId}, Current Player: ${gameState.currentPlayer}, Player Symbol: ${player.player_symbol}`);

    // Validate move
    if (gameState.currentPlayer !== player.player_symbol) {
        console.log(`Move rejected - Not user's turn. Current: ${gameState.currentPlayer}, User: ${player.player_symbol}`);
        return res.status(400).json({ message: `Not your turn. It's ${gameState.currentPlayer}'s turn, you are ${player.player_symbol}` });
    }

    if (gameState.board[position] !== null) {
        return res.status(400).json({ message: 'Position already taken' });
    }

    // Make the move
    gameState.board[position] = player.player_symbol;

    // Check for win condition
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6] // diagonals
    ];

    let winner = null;
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (gameState.board[a] && gameState.board[a] === gameState.board[b] && gameState.board[a] === gameState.board[c]) {
            winner = gameState.board[a];
            break;
        }
    }

    if (winner) {
        gameState.gameStatus = 'finished';
        gameState.winner = winner;

        // Find the winner's user ID
        const [winnerPlayer] = await req.db.execute(
            'SELECT player_id FROM game_room_players WHERE room_id = ? AND player_symbol = ?',
            [room.id, winner]
        );

        const winnerId = winnerPlayer.length > 0 ? winnerPlayer[0].player_id : null;

        // Update room status
        await req.db.execute(
            'UPDATE game_rooms SET status = ?, winner_id = ?, game_state = ? WHERE id = ?',
            ['finished', winnerId, JSON.stringify(gameState), room.id]
        );

        // Update statistics
        await updateGameStatistics(room.id, winner, req.db);
    } else if (gameState.board.every(cell => cell !== null)) {
        // Draw
        gameState.gameStatus = 'finished';
        gameState.winner = 'draw';

        await req.db.execute(
            'UPDATE game_rooms SET status = ?, game_state = ? WHERE id = ?',
            ['finished', JSON.stringify(gameState), room.id]
        );

        // Update statistics for draw
        await updateGameStatistics(room.id, 'draw', req.db);
    } else {
        // Switch player
        const oldPlayer = gameState.currentPlayer;
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
        console.log(`Switching player from ${oldPlayer} to ${gameState.currentPlayer}`);

        await req.db.execute(
            'UPDATE game_rooms SET game_state = ? WHERE id = ?',
            [JSON.stringify(gameState), room.id]
        );
    }

    res.json({
        gameState,
        winner: gameState.winner,
        gameStatus: gameState.gameStatus
    });
};

// Handle Rock Paper Scissors moves
const handleRockPaperScissorsMove = async (req, res, room, gameState, player, choice) => {
    const { roomCode } = req.params;
    const userId = req.user.id;

    console.log(`Rock Paper Scissors move attempt - Room: ${roomCode}, User: ${userId}, Choice: ${choice}, Player Symbol: ${player.player_symbol}`);

    // Validate choice
    if (!['rock', 'paper', 'scissors'].includes(choice)) {
        return res.status(400).json({ message: 'Invalid choice. Must be rock, paper, or scissors.' });
    }

    const isPlayer1 = player.player_symbol === 'X';
    const choiceKey = isPlayer1 ? 'player1Choice' : 'player2Choice';

    // Check if player has already made a choice this round
    if (gameState[choiceKey] !== null) {
        return res.status(400).json({ message: 'You have already made your choice for this round!' });
    }

    // Make the choice
    gameState[choiceKey] = choice;

    // Check if both players have made their choices
    if (gameState.player1Choice !== null && gameState.player2Choice !== null) {
        // Determine round winner
        const result = determineRockPaperScissorsWinner(gameState.player1Choice, gameState.player2Choice);
        gameState.roundResult = result;

        // Update scores
        if (result === 'player1') {
            gameState.player1Score++;
        } else if (result === 'player2') {
            gameState.player2Score++;
        }

        // Check for game end conditions
        if (gameState.player1Score >= 5 || gameState.player2Score >= 5 || gameState.currentRound >= gameState.maxRounds) {
            // Game finished
            gameState.gameStatus = 'finished';

            if (gameState.player1Score > gameState.player2Score) {
                gameState.gameResult = 'player1';
            } else if (gameState.player2Score > gameState.player1Score) {
                gameState.gameResult = 'player2';
            } else {
                gameState.gameResult = 'draw';
            }

            // Find the winner's user ID
            let winnerId = null;
            if (gameState.gameResult === 'player1') {
                const [winnerPlayer] = await req.db.execute(
                    'SELECT player_id FROM game_room_players WHERE room_id = ? AND player_symbol = ?',
                    [room.id, 'X']
                );
                winnerId = winnerPlayer.length > 0 ? winnerPlayer[0].player_id : null;
            } else if (gameState.gameResult === 'player2') {
                const [winnerPlayer] = await req.db.execute(
                    'SELECT player_id FROM game_room_players WHERE room_id = ? AND player_symbol = ?',
                    [room.id, 'O']
                );
                winnerId = winnerPlayer.length > 0 ? winnerPlayer[0].player_id : null;
            }

            // Update room status
            await req.db.execute(
                'UPDATE game_rooms SET status = ?, winner_id = ?, game_state = ? WHERE id = ?',
                ['finished', winnerId, JSON.stringify(gameState), room.id]
            );

            // Update statistics
            await updateGameStatistics(room.id, gameState.gameResult, req.db);
        } else {
            // Next round
            gameState.currentRound++;
            gameState.player1Choice = null;
            gameState.player2Choice = null;
            gameState.roundResult = null;

            await req.db.execute(
                'UPDATE game_rooms SET game_state = ? WHERE id = ?',
                [JSON.stringify(gameState), room.id]
            );
        }
    } else {
        // Update game state with current choice
        await req.db.execute(
            'UPDATE game_rooms SET game_state = ? WHERE id = ?',
            [JSON.stringify(gameState), room.id]
        );
    }

    res.json({
        gameState,
        gameStatus: gameState.gameStatus
    });
};

// Determine Rock Paper Scissors winner
const determineRockPaperScissorsWinner = (choice1, choice2) => {
    if (choice1 === choice2) {
        return 'draw';
    }

    if (
        (choice1 === 'rock' && choice2 === 'scissors') ||
        (choice1 === 'paper' && choice2 === 'rock') ||
        (choice1 === 'scissors' && choice2 === 'paper')
    ) {
        return 'player1';
    }

    return 'player2';
};

// Update game statistics
const updateGameStatistics = async (roomId, result, db) => {
    try {
        const [players] = await db.execute(
            'SELECT player_id, player_symbol FROM game_room_players WHERE room_id = ?',
            [roomId]
        );

        const [room] = await db.execute(
            'SELECT game_id FROM game_rooms WHERE id = ?',
            [roomId]
        );

        const gameId = room[0].game_id;

        for (const player of players) {
            const { player_id, player_symbol } = player;

            // Check if stats exist
            const [existingStats] = await db.execute(
                'SELECT * FROM game_statistics WHERE user_id = ? AND game_id = ?',
                [player_id, gameId]
            );

            if (existingStats.length === 0) {
                // Create new stats record
                await db.execute(
                    'INSERT INTO game_statistics (user_id, game_id, wins, losses, draws, total_games) VALUES (?, ?, 0, 0, 0, 0)',
                    [player_id, gameId]
                );
            }

            // Update stats
            if (result === 'draw') {
                await db.execute(
                    'UPDATE game_statistics SET draws = draws + 1, total_games = total_games + 1 WHERE user_id = ? AND game_id = ?',
                    [player_id, gameId]
                );
            } else if (result === player_symbol || (result === 'player1' && player_symbol === 'X') || (result === 'player2' && player_symbol === 'O')) {
                await db.execute(
                    'UPDATE game_statistics SET wins = wins + 1, total_games = total_games + 1 WHERE user_id = ? AND game_id = ?',
                    [player_id, gameId]
                );
            } else {
                await db.execute(
                    'UPDATE game_statistics SET losses = losses + 1, total_games = total_games + 1 WHERE user_id = ? AND game_id = ?',
                    [player_id, gameId]
                );
            }
        }
    } catch (error) {
        console.error('Error updating game statistics:', error);
    }
};

// Get user game statistics
router.get('/games/statistics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [stats] = await req.db.execute(
            `SELECT gs.*, g.name as game_name 
       FROM game_statistics gs 
       JOIN games g ON gs.game_id = g.id 
       WHERE gs.user_id = ? 
       ORDER BY gs.total_games DESC`,
            [userId]
        );

        res.json(stats);
    } catch (error) {
        console.error('Error fetching game statistics:', error);
        res.status(500).json({ message: 'Failed to fetch game statistics' });
    }
});

// Get leaderboard for a specific game
router.get('/games/:gameId/leaderboard', authenticateToken, async (req, res) => {
    try {
        const { gameId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const [leaderboard] = await req.db.execute(
            `SELECT gs.*, u.firstName, u.lastName, u.profileImage,
              (gs.wins * 3 + gs.draws) as points
       FROM game_statistics gs
       JOIN users u ON gs.user_id = u.id
       WHERE gs.game_id = ? AND gs.total_games > 0
       ORDER BY points DESC, gs.wins DESC, gs.total_games ASC
       LIMIT ?`,
            [gameId, limit]
        );

        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
});

// Debug endpoint to check room state
router.get('/games/rooms/:roomCode/debug', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;

        const [rooms] = await req.db.execute(
            'SELECT * FROM game_rooms WHERE room_code = ?',
            [roomCode]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const [players] = await req.db.execute(
            'SELECT * FROM game_room_players WHERE room_id = ?',
            [rooms[0].id]
        );

        res.json({
            room: rooms[0],
            players: players,
            playerCount: players.length,
            gameState: JSON.parse(rooms[0].game_state || '{}')
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ message: 'Debug failed' });
    }
});

// Reset game state in current room
router.post('/games/rooms/:roomCode/reset', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.params;
        const userId = req.user.id;

        // Get room details with game name
        const [rooms] = await req.db.execute(
            `SELECT gr.*, g.name as game_name 
             FROM game_rooms gr 
             JOIN games g ON gr.game_id = g.id 
             WHERE gr.room_code = ?`,
            [roomCode]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = rooms[0];

        // Check if user is a player in this room
        const [players] = await req.db.execute(
            'SELECT * FROM game_room_players WHERE room_id = ? AND player_id = ?',
            [room.id, userId]
        );

        if (players.length === 0) {
            return res.status(403).json({ message: 'You are not a player in this room' });
        }

        // Reset game state based on game type
        let newGameState;
        if (room.game_name === 'rock-paper-scissors') {
            newGameState = {
                player1Choice: null,
                player2Choice: null,
                player1Score: 0,
                player2Score: 0,
                currentRound: 1,
                maxRounds: 15,
                gameStatus: 'playing',
                roundResult: null,
                gameResult: null
            };
        } else {
            // Default to tic-tac-toe
            newGameState = {
                board: Array(9).fill(null),
                currentPlayer: 'X',
                gameStatus: 'playing'
            };
        }

        // Update room status and game state
        await req.db.execute(
            'UPDATE game_rooms SET status = ?, game_state = ?, winner_id = NULL WHERE id = ?',
            ['playing', JSON.stringify(newGameState), room.id]
        );

        console.log(`Room ${roomCode}: Game reset by user ${userId}`);

        res.json({
            gameState: newGameState,
            status: 'playing'
        });
    } catch (error) {
        console.error('Error resetting game:', error);
        res.status(500).json({ message: 'Failed to reset game' });
    }
});

module.exports = router;

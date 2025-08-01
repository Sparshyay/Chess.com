const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');
const { validateMove, makeMove, getGameResult } = require('../utils/moveValidator');
const { calculateGameRatings } = require('../utils/eloSystem');

// Store active connections
const activeConnections = new Map();
const gameRooms = new Map();

/**
 * Authenticate socket connection
 * @param {string} token - JWT token
 * @returns {object|null} User object or null
 */
const authenticateSocket = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
};

/**
 * Join game room
 * @param {string} gameId - Game ID
 * @param {string} userId - User ID
 * @param {string} socketId - Socket ID
 */
const joinGameRoom = (gameId, userId, socketId) => {
  if (!gameRooms.has(gameId)) {
    gameRooms.set(gameId, new Set());
  }
  
  gameRooms.get(gameId).add(socketId);
  activeConnections.set(socketId, { gameId, userId });
};

/**
 * Leave game room
 * @param {string} socketId - Socket ID
 */
const leaveGameRoom = (socketId) => {
  const connection = activeConnections.get(socketId);
  if (connection) {
    const { gameId } = connection;
    const room = gameRooms.get(gameId);
    
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        gameRooms.delete(gameId);
      }
    }
    
    activeConnections.delete(socketId);
  }
};

/**
 * Emit to game room
 * @param {object} io - Socket.io instance
 * @param {string} gameId - Game ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
const emitToGameRoom = (io, gameId, event, data) => {
  const room = gameRooms.get(gameId);
  if (room) {
    room.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  }
};

/**
 * Setup Socket.io game handlers
 * @param {object} io - Socket.io instance
 */
const gameSocket = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const user = await authenticateSocket(token);
    if (!user) {
      return next(new Error('Authentication error'));
    }
    
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected: ${socket.id}`);
    
    // Update user's last seen
    User.findByIdAndUpdate(socket.user._id, { lastSeen: new Date() }).exec();

    /**
     * Join a game room
     */
    socket.on('join_game', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId })
          .populate('white.player', 'username rating')
          .populate('black.player', 'username rating');
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Check if user is a player or spectator
        const isPlayer = game.white.player._id.toString() === socket.user._id.toString() || 
                        (game.black.player && game.black.player._id.toString() === socket.user._id.toString());
        const isSpectator = game.settings.allowSpectators && !isPlayer;

        if (!isPlayer && !isSpectator) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Join socket room
        socket.join(gameId);
        joinGameRoom(gameId, socket.user._id, socket.id);

        // Add spectator if not a player
        if (isSpectator) {
          await game.addSpectator(socket.user._id);
        }

        // Update player connection status
        if (isPlayer) {
          if (game.white.player._id.toString() === socket.user._id.toString()) {
            game.white.isConnected = true;
          } else if (game.black.player && game.black.player._id.toString() === socket.user._id.toString()) {
            game.black.isConnected = true;
          }
          await game.save();
        }

        // Emit game state to the joining user
        socket.emit('game_joined', {
          game,
          isPlayer,
          isSpectator
        });

        // Notify other players
        socket.to(gameId).emit('player_joined', {
          user: {
            _id: socket.user._id,
            username: socket.user.username
          },
          isSpectator
        });

      } catch (error) {
        console.error('Join game error:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    /**
     * Make a move
     */
    socket.on('make_move', async (data) => {
      try {
        const { gameId, from, to, promotion } = data;
        
        const game = await Game.findOne({ gameId });
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.status !== 'playing') {
          socket.emit('error', { message: 'Game is not in playing state' });
          return;
        }

        // Check if it's the player's turn
        const isWhitePlayer = game.white.player.toString() === socket.user._id.toString();
        const isBlackPlayer = game.black.player.toString() === socket.user._id.toString();

        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        const currentTurn = game.currentTurn;
        const playerColor = isWhitePlayer ? 'w' : 'b';

        if (currentTurn !== playerColor) {
          socket.emit('error', { message: 'Not your turn' });
          return;
        }

        // Validate move
        const moveValidation = validateMove(game.chess.fen, from, to, promotion);

        if (!moveValidation.isValid) {
          socket.emit('move_error', {
            message: 'Invalid move',
            data: moveValidation
          });
          return;
        }

        // Make the move
        const moveResult = makeMove(game.chess.fen, from, to, promotion);

        if (!moveResult.success) {
          socket.emit('move_error', {
            message: 'Move failed',
            error: moveResult.error
          });
          return;
        }

        // Update game state
        game.chess.fen = moveResult.fen;
        game.chess.pgn = moveResult.pgn;
        game.chess.moves.push({
          from: moveResult.move.from,
          to: moveResult.move.to,
          piece: moveResult.move.piece,
          color: moveResult.move.color,
          san: moveResult.move.san,
          flags: moveResult.move.flags,
          promotion: moveResult.move.promotion,
          timestamp: new Date()
        });

        game.chess.isCheck = moveResult.isCheck;
        game.chess.isCheckmate = moveResult.isCheckmate;
        game.chess.isStalemate = moveResult.isStalemate;
        game.chess.isDraw = moveResult.isDraw;
        game.chess.isGameOver = moveResult.isGameOver;

        // Check for game end
        if (moveResult.isGameOver) {
          const result = getGameResult(moveResult.fen);
          game.status = result;
          game.result = result;
          game.endedAt = new Date();

          // Determine reason
          if (moveResult.isCheckmate) {
            game.reason = 'checkmate';
          } else if (moveResult.isStalemate) {
            game.reason = 'stalemate';
          } else if (moveResult.isDraw) {
            game.reason = 'insufficient_material';
          }

          // Update ratings if game was rated
          if (game.settings.rated && game.result !== 'draw') {
            const whitePlayer = await User.findById(game.white.player);
            const blackPlayer = await User.findById(game.black.player);

            if (whitePlayer && blackPlayer) {
              const ratingChanges = calculateGameRatings(
                {
                  rating: game.white.rating.before,
                  gamesPlayed: whitePlayer.stats.gamesPlayed
                },
                {
                  rating: game.black.rating.before,
                  gamesPlayed: blackPlayer.stats.gamesPlayed
                },
                game.result,
                game.gameType
              );

              // Update game with new ratings
              game.white.rating.after = ratingChanges.white.after;
              game.black.rating.after = ratingChanges.black.after;

              // Update player ratings and stats
              await whitePlayer.updateRating(game.gameType, ratingChanges.white.after);
              await blackPlayer.updateRating(game.gameType, ratingChanges.black.after);

              // Update game stats
              const gameDuration = Math.round((game.endedAt - game.startedAt) / 60);
              await whitePlayer.updateGameStats(ratingChanges.white.result, game.gameType, gameDuration);
              await blackPlayer.updateGameStats(ratingChanges.black.result, game.gameType, gameDuration);
            }
          }
        }

        await game.save();

        // Emit move to all players in the room
        io.to(gameId).emit('move_made', {
          move: moveResult.move,
          game: game,
          isGameOver: moveResult.isGameOver
        });

      } catch (error) {
        console.error('Make move error:', error);
        socket.emit('error', { message: 'Failed to make move' });
      }
    });

    /**
     * Send chat message
     */
    socket.on('chat_message', async (data) => {
      try {
        const { gameId, message } = data;
        
        const game = await Game.findOne({ gameId });
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (!game.settings.allowChat) {
          socket.emit('error', { message: 'Chat is disabled in this game' });
          return;
        }

        // Check if user is a player or spectator
        const isPlayer = game.white.player.toString() === socket.user._id.toString() || 
                        game.black.player.toString() === socket.user._id.toString();
        const isSpectator = game.spectators.some(s => s.user.toString() === socket.user._id.toString());

        if (!isPlayer && !isSpectator) {
          socket.emit('error', { message: 'You are not a player or spectator in this game' });
          return;
        }

        // Add message to chat
        await game.addChatMessage(socket.user._id, message);

        // Emit chat message to all players in the room
        io.to(gameId).emit('chat_message', {
          user: {
            _id: socket.user._id,
            username: socket.user.username
          },
          message,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Resign game
     */
    socket.on('resign_game', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId });
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.status !== 'playing') {
          socket.emit('error', { message: 'Game is not in playing state' });
          return;
        }

        const isWhitePlayer = game.white.player.toString() === socket.user._id.toString();
        const isBlackPlayer = game.black.player.toString() === socket.user._id.toString();

        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        // Determine result
        const result = isWhitePlayer ? 'black_win' : 'white_win';
        game.status = result;
        game.result = result;
        game.reason = 'resignation';
        game.endedAt = new Date();

        // Update ratings if game was rated
        if (game.settings.rated) {
          const whitePlayer = await User.findById(game.white.player);
          const blackPlayer = await User.findById(game.black.player);

          if (whitePlayer && blackPlayer) {
            const ratingChanges = calculateGameRatings(
              {
                rating: game.white.rating.before,
                gamesPlayed: whitePlayer.stats.gamesPlayed
              },
              {
                rating: game.black.rating.before,
                gamesPlayed: blackPlayer.stats.gamesPlayed
              },
              result,
              game.gameType
            );

            // Update game with new ratings
            game.white.rating.after = ratingChanges.white.after;
            game.black.rating.after = ratingChanges.black.after;

            // Update player ratings and stats
            await whitePlayer.updateRating(game.gameType, ratingChanges.white.after);
            await blackPlayer.updateRating(game.gameType, ratingChanges.black.after);

            // Update game stats
            const gameDuration = Math.round((game.endedAt - game.startedAt) / 60);
            await whitePlayer.updateGameStats(ratingChanges.white.result, game.gameType, gameDuration);
            await blackPlayer.updateGameStats(ratingChanges.black.result, game.gameType, gameDuration);
          }
        }

        await game.save();

        // Emit resignation to all players in the room
        io.to(gameId).emit('game_resigned', {
          game,
          resignedBy: socket.user.username
        });

      } catch (error) {
        console.error('Resign game error:', error);
        socket.emit('error', { message: 'Failed to resign game' });
      }
    });

    /**
     * Offer draw
     */
    socket.on('offer_draw', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId });
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.status !== 'playing') {
          socket.emit('error', { message: 'Game is not in playing state' });
          return;
        }

        if (!game.settings.allowDrawOffers) {
          socket.emit('error', { message: 'Draw offers are not allowed in this game' });
          return;
        }

        const isWhitePlayer = game.white.player.toString() === socket.user._id.toString();
        const isBlackPlayer = game.black.player.toString() === socket.user._id.toString();

        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        // Emit draw offer to all players in the room
        io.to(gameId).emit('draw_offered', {
          offeredBy: socket.user.username,
          gameId
        });

      } catch (error) {
        console.error('Offer draw error:', error);
        socket.emit('error', { message: 'Failed to offer draw' });
      }
    });

    /**
     * Accept draw offer
     */
    socket.on('accept_draw', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId });
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.status !== 'playing') {
          socket.emit('error', { message: 'Game is not in playing state' });
          return;
        }

        const isWhitePlayer = game.white.player.toString() === socket.user._id.toString();
        const isBlackPlayer = game.black.player.toString() === socket.user._id.toString();

        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        // End game as draw
        game.status = 'draw';
        game.result = 'draw';
        game.reason = 'agreement';
        game.endedAt = new Date();

        await game.save();

        // Emit draw accepted to all players in the room
        io.to(gameId).emit('draw_accepted', {
          game,
          acceptedBy: socket.user.username
        });

      } catch (error) {
        console.error('Accept draw error:', error);
        socket.emit('error', { message: 'Failed to accept draw' });
      }
    });

    /**
     * Decline draw offer
     */
    socket.on('decline_draw', (data) => {
      const { gameId } = data;
      
      // Emit draw declined to all players in the room
      io.to(gameId).emit('draw_declined', {
        declinedBy: socket.user.username,
        gameId
      });
    });

    /**
     * Leave game room
     */
    socket.on('leave_game', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId });
        
        if (game) {
          // Update player connection status
          if (game.white.player.toString() === socket.user._id.toString()) {
            game.white.isConnected = false;
          } else if (game.black.player && game.black.player.toString() === socket.user._id.toString()) {
            game.black.isConnected = false;
          } else {
            // Remove spectator
            await game.removeSpectator(socket.user._id);
          }
          
          await game.save();
        }

        // Leave socket room
        socket.leave(gameId);
        leaveGameRoom(socket.id);

        // Notify other players
        socket.to(gameId).emit('player_left', {
          user: {
            _id: socket.user._id,
            username: socket.user.username
          }
        });

      } catch (error) {
        console.error('Leave game error:', error);
      }
    });

    /**
     * Ping for connection health
     */
    socket.on('ping', () => {
      socket.emit('pong');
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected: ${socket.id}`);
      
      // Update user's last seen
      await User.findByIdAndUpdate(socket.user._id, { lastSeen: new Date() }).exec();

      // Handle game room cleanup
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const { gameId } = connection;
        
        const game = await Game.findOne({ gameId });
        if (game) {
          // Update player connection status
          if (game.white.player.toString() === socket.user._id.toString()) {
            game.white.isConnected = false;
          } else if (game.black.player && game.black.player.toString() === socket.user._id.toString()) {
            game.black.isConnected = false;
          } else {
            // Remove spectator
            await game.removeSpectator(socket.user._id);
          }
          
          await game.save();
        }

        // Notify other players
        socket.to(gameId).emit('player_disconnected', {
          user: {
            _id: socket.user._id,
            username: socket.user.username
          }
        });
      }

      leaveGameRoom(socket.id);
    });
  });
};

module.exports = gameSocket; 
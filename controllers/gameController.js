const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const User = require('../models/User');
const RatingHistory = require('../models/RatingHistory');
const { calculateGameRatings } = require('../utils/eloSystem');
const { validateMove, makeMove, getGameResult } = require('../utils/moveValidator');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @desc    Create a new game
 * @route   POST /api/games
 * @access  Private
 */
const createGame = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const {
    gameType = 'rapid',
    timeControl = 900,
    increment = 0,
    rated = true,
    allowSpectators = true,
    allowChat = true,
    allowTakebacks = false,
    allowDrawOffers = true,
    isPublic = true
  } = req.body;

  // Validate game type
  const validGameTypes = ['blitz', 'rapid', 'classical', 'bullet'];
  if (!validGameTypes.includes(gameType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid game type'
    });
  }

  // Create game
  const game = await Game.create({
    gameId: uuidv4(),
    white: {
      player: req.user._id,
      rating: { before: req.user.rating[gameType] },
      timeRemaining: timeControl
    },
    black: {
      player: null,
      rating: { before: 1200 },
      timeRemaining: timeControl
    },
    gameType,
    timeControl: {
      initial: timeControl,
      increment
    },
    settings: {
      rated,
      allowSpectators,
      allowChat,
      allowTakebacks,
      allowDrawOffers
    },
    metadata: {
      createdBy: req.user._id,
      isPublic
    }
  });

  await game.populate('white.player', 'username rating');

  res.status(201).json({
    success: true,
    message: 'Game created successfully',
    data: {
      game
    }
  });
});

/**
 * @desc    Get all games (with filtering and pagination)
 * @route   GET /api/games
 * @access  Public
 */
const getGames = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { status, gameType, result, player } = req.query;

  // Build filter
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (gameType) {
    filter.gameType = gameType;
  }

  if (result) {
    filter.result = result;
  }

  if (player) {
    filter.$or = [
      { 'white.player': player },
      { 'black.player': player }
    ];
  }

  const games = await Game.find(filter)
    .populate('white.player', 'username rating')
    .populate('black.player', 'username rating')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Game.countDocuments(filter);

  res.json({
    success: true,
    data: {
      games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get game by ID
 * @route   GET /api/games/:id
 * @access  Public
 */
const getGameById = asyncHandler(async (req, res, next) => {
  const game = await Game.findOne({ gameId: req.params.id })
    .populate('white.player', 'username rating profile')
    .populate('black.player', 'username rating profile')
    .populate('chat.player', 'username')
    .populate('spectators.user', 'username');

  if (!game) {
    return next(new AppError('Game not found', 404));
  }

  res.json({
    success: true,
    data: {
      game
    }
  });
});

/**
 * @desc    Join a game
 * @route   POST /api/games/:id/join
 * @access  Private
 */
const joinGame = asyncHandler(async (req, res, next) => {
  const game = await Game.findOne({ gameId: req.params.id });

  if (!game) {
    return next(new AppError('Game not found', 404));
  }

  if (game.status !== 'waiting') {
    return res.status(400).json({
      success: false,
      message: 'Game is not available for joining'
    });
  }

  if (game.white.player.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot join your own game'
    });
  }

  // Update game with black player
  game.black.player = req.user._id;
  game.black.rating.before = req.user.rating[game.gameType];
  game.status = 'playing';
  game.startedAt = new Date();

  await game.save();

  await game.populate('white.player', 'username rating');
  await game.populate('black.player', 'username rating');

  res.json({
    success: true,
    message: 'Joined game successfully',
    data: {
      game
    }
  });
});

/**
 * @desc    Make a move
 * @route   POST /api/games/:id/move
 * @access  Private
 */
const makeGameMove = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { from, to, promotion } = req.body;

  const game = await Game.findOne({ gameId: req.params.id });

  if (!game) {
    return next(new AppError('Game not found', 404));
  }

  if (game.status !== 'playing') {
    return res.status(400).json({
      success: false,
      message: 'Game is not in playing state'
    });
  }

  // Check if it's the player's turn
  const isWhitePlayer = game.white.player.toString() === req.user._id.toString();
  const isBlackPlayer = game.black.player.toString() === req.user._id.toString();

  if (!isWhitePlayer && !isBlackPlayer) {
    return res.status(403).json({
      success: false,
      message: 'You are not a player in this game'
    });
  }

  const currentTurn = game.currentTurn;
  const playerColor = isWhitePlayer ? 'w' : 'b';

  if (currentTurn !== playerColor) {
    return res.status(400).json({
      success: false,
      message: 'Not your turn'
    });
  }

  // Validate move
  const moveValidation = validateMove(game.chess.fen, from, to, promotion);

  if (!moveValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid move',
      data: moveValidation
    });
  }

  // Make the move
  const moveResult = makeMove(game.chess.fen, from, to, promotion);

  if (!moveResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Move failed',
      error: moveResult.error
    });
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
        const gameDuration = Math.round((game.endedAt - game.startedAt) / 60); // in minutes
        await whitePlayer.updateGameStats(ratingChanges.white.result, game.gameType, gameDuration);
        await blackPlayer.updateGameStats(ratingChanges.black.result, game.gameType, gameDuration);

        // Create rating history records
        await RatingHistory.create([
          {
            user: whitePlayer._id,
            game: game._id,
            gameType: game.gameType,
            rating: {
              before: ratingChanges.white.before,
              after: ratingChanges.white.after,
              change: ratingChanges.white.change
            },
            opponent: {
              user: blackPlayer._id,
              rating: game.black.rating.before
            },
            result: ratingChanges.white.result,
            expectedScore: ratingChanges.white.expectedScore,
            actualScore: ratingChanges.white.actualScore,
            kFactor: ratingChanges.white.kFactor
          },
          {
            user: blackPlayer._id,
            game: game._id,
            gameType: game.gameType,
            rating: {
              before: ratingChanges.black.before,
              after: ratingChanges.black.after,
              change: ratingChanges.black.change
            },
            opponent: {
              user: whitePlayer._id,
              rating: game.white.rating.before
            },
            result: ratingChanges.black.result,
            expectedScore: ratingChanges.black.expectedScore,
            actualScore: ratingChanges.black.actualScore,
            kFactor: ratingChanges.black.kFactor
          }
        ]);
      }
    }
  }

  await game.save();

  await game.populate('white.player', 'username rating');
  await game.populate('black.player', 'username rating');

  res.json({
    success: true,
    message: 'Move made successfully',
    data: {
      game,
      move: moveResult.move
    }
  });
});

/**
 * @desc    Resign game
 * @route   POST /api/games/:id/resign
 * @access  Private
 */
const resignGame = asyncHandler(async (req, res, next) => {
  const game = await Game.findOne({ gameId: req.params.id });

  if (!game) {
    return next(new AppError('Game not found', 404));
  }

  if (game.status !== 'playing') {
    return res.status(400).json({
      success: false,
      message: 'Game is not in playing state'
    });
  }

  const isWhitePlayer = game.white.player.toString() === req.user._id.toString();
  const isBlackPlayer = game.black.player.toString() === req.user._id.toString();

  if (!isWhitePlayer && !isBlackPlayer) {
    return res.status(403).json({
      success: false,
      message: 'You are not a player in this game'
    });
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

      // Create rating history records
      await RatingHistory.create([
        {
          user: whitePlayer._id,
          game: game._id,
          gameType: game.gameType,
          rating: {
            before: ratingChanges.white.before,
            after: ratingChanges.white.after,
            change: ratingChanges.white.change
          },
          opponent: {
            user: blackPlayer._id,
            rating: game.black.rating.before
          },
          result: ratingChanges.white.result,
          expectedScore: ratingChanges.white.expectedScore,
          actualScore: ratingChanges.white.actualScore,
          kFactor: ratingChanges.white.kFactor
        },
        {
          user: blackPlayer._id,
          game: game._id,
          gameType: game.gameType,
          rating: {
            before: ratingChanges.black.before,
            after: ratingChanges.black.after,
            change: ratingChanges.black.change
          },
          opponent: {
            user: whitePlayer._id,
            rating: game.white.rating.before
          },
          result: ratingChanges.black.result,
          expectedScore: ratingChanges.black.expectedScore,
          actualScore: ratingChanges.black.actualScore,
          kFactor: ratingChanges.black.kFactor
        }
      ]);
    }
  }

  await game.save();

  await game.populate('white.player', 'username rating');
  await game.populate('black.player', 'username rating');

  res.json({
    success: true,
    message: 'Game resigned successfully',
    data: {
      game
    }
  });
});

/**
 * @desc    Offer draw
 * @route   POST /api/games/:id/draw-offer
 * @access  Private
 */
const offerDraw = asyncHandler(async (req, res, next) => {
  const game = await Game.findOne({ gameId: req.params.id });

  if (!game) {
    return next(new AppError('Game not found', 404));
  }

  if (game.status !== 'playing') {
    return res.status(400).json({
      success: false,
      message: 'Game is not in playing state'
    });
  }

  if (!game.settings.allowDrawOffers) {
    return res.status(400).json({
      success: false,
      message: 'Draw offers are not allowed in this game'
    });
  }

  const isWhitePlayer = game.white.player.toString() === req.user._id.toString();
  const isBlackPlayer = game.black.player.toString() === req.user._id.toString();

  if (!isWhitePlayer && !isBlackPlayer) {
    return res.status(403).json({
      success: false,
      message: 'You are not a player in this game'
    });
  }

  // For now, we'll just return success
  // In a real implementation, you'd need to handle draw offer acceptance/rejection
  res.json({
    success: true,
    message: 'Draw offer sent'
  });
});

/**
 * @desc    Get game chat
 * @route   GET /api/games/:id/chat
 * @access  Public
 */
const getGameChat = asyncHandler(async (req, res, next) => {
  const game = await Game.findOne({ gameId: req.params.id })
    .populate('chat.player', 'username');

  if (!game) {
    return next(new AppError('Game not found', 404));
  }

  res.json({
    success: true,
    data: {
      chat: game.chat
    }
  });
});

/**
 * @desc    Send chat message
 * @route   POST /api/games/:id/chat
 * @access  Private
 */
const sendChatMessage = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { message } = req.body;

  const game = await Game.findOne({ gameId: req.params.id });

  if (!game) {
    return next(new AppError('Game not found', 404));
  }

  if (!game.settings.allowChat) {
    return res.status(400).json({
      success: false,
      message: 'Chat is disabled in this game'
    });
  }

  // Check if user is a player or spectator
  const isPlayer = game.white.player.toString() === req.user._id.toString() || 
                   game.black.player.toString() === req.user._id.toString();
  const isSpectator = game.spectators.some(s => s.user.toString() === req.user._id.toString());

  if (!isPlayer && !isSpectator) {
    return res.status(403).json({
      success: false,
      message: 'You are not a player or spectator in this game'
    });
  }

  // Add message to chat
  await game.addChatMessage(req.user._id, message);

  await game.populate('chat.player', 'username');

  res.json({
    success: true,
    message: 'Message sent successfully',
    data: {
      chat: game.chat
    }
  });
});

module.exports = {
  createGame,
  getGames,
  getGameById,
  joinGame,
  makeGameMove,
  resignGame,
  offerDraw,
  getGameChat,
  sendChatMessage
}; 
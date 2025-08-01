const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  white: {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      before: { type: Number, required: true },
      after: { type: Number, default: null }
    },
    timeRemaining: { type: Number, required: true }, // in seconds
    isConnected: { type: Boolean, default: false }
  },
  black: {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      before: { type: Number, required: true },
      after: { type: Number, default: null }
    },
    timeRemaining: { type: Number, required: true }, // in seconds
    isConnected: { type: Boolean, default: false }
  },
  gameType: {
    type: String,
    enum: ['blitz', 'rapid', 'classical', 'bullet'],
    required: true
  },
  timeControl: {
    initial: { type: Number, required: true }, // in seconds
    increment: { type: Number, default: 0 } // in seconds
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'draw', 'white_win', 'black_win', 'abandoned', 'timeout'],
    default: 'waiting'
  },
  result: {
    type: String,
    enum: ['white_win', 'black_win', 'draw', 'abandoned', 'timeout', null],
    default: null
  },
  reason: {
    type: String,
    enum: ['checkmate', 'stalemate', 'insufficient_material', 'threefold_repetition', 'fifty_move_rule', 'resignation', 'timeout', 'abandoned', null],
    default: null
  },
  chess: {
    fen: {
      type: String,
      default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    },
    pgn: {
      type: String,
      default: ''
    },
    moves: [{
      from: { type: String, required: true },
      to: { type: String, required: true },
      piece: { type: String, required: true },
      color: { type: String, enum: ['w', 'b'], required: true },
      san: { type: String, required: true },
      flags: { type: String, default: '' },
      promotion: { type: String, default: null },
      timestamp: { type: Date, default: Date.now }
    }],
    isCheck: { type: Boolean, default: false },
    isCheckmate: { type: Boolean, default: false },
    isStalemate: { type: Boolean, default: false },
    isDraw: { type: Boolean, default: false },
    isGameOver: { type: Boolean, default: false }
  },
  chat: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [200, 'Message cannot exceed 200 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  spectators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    rated: { type: Boolean, default: true },
    allowSpectators: { type: Boolean, default: true },
    allowChat: { type: Boolean, default: true },
    allowTakebacks: { type: Boolean, default: false },
    allowDrawOffers: { type: Boolean, default: true }
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPublic: { type: Boolean, default: true },
    isTournament: { type: Boolean, default: false },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
    opening: {
      name: { type: String, default: null },
      eco: { type: String, default: null }
    },
    gameLength: { type: Number, default: 0 }, // in seconds
    moveCount: { type: Number, default: 0 }
  },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  lastMoveAt: { type: Date, default: null },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for game duration
gameSchema.virtual('duration').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / 1000); // in seconds
  }
  return 0;
});

// Virtual for current player's turn
gameSchema.virtual('currentTurn').get(function() {
  if (this.chess.fen) {
    return this.chess.fen.split(' ')[1]; // 'w' or 'b'
  }
  return 'w';
});

// Virtual for game URL
gameSchema.virtual('gameUrl').get(function() {
  return `/game/${this.gameId}`;
});

// Indexes
gameSchema.index({ gameId: 1 });
gameSchema.index({ 'white.player': 1 });
gameSchema.index({ 'black.player': 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ gameType: 1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ 'metadata.tournamentId': 1 });
gameSchema.index({ 'metadata.isPublic': 1 });

// Pre-save middleware to update game length
gameSchema.pre('save', function(next) {
  if (this.startedAt && this.endedAt) {
    this.metadata.gameLength = Math.round((this.endedAt - this.startedAt) / 1000);
  }
  if (this.chess.moves) {
    this.metadata.moveCount = this.chess.moves.length;
  }
  next();
});

// Method to add move
gameSchema.methods.addMove = function(move) {
  this.chess.moves.push(move);
  this.lastMoveAt = new Date();
  this.metadata.moveCount = this.chess.moves.length;
  return this.save();
};

// Method to add chat message
gameSchema.methods.addChatMessage = function(playerId, message) {
  this.chat.push({
    player: playerId,
    message: message,
    timestamp: new Date()
  });
  return this.save();
};

// Method to add spectator
gameSchema.methods.addSpectator = function(userId) {
  const existingSpectator = this.spectators.find(s => s.user.toString() === userId.toString());
  if (!existingSpectator) {
    this.spectators.push({
      user: userId,
      joinedAt: new Date()
    });
  }
  return this.save();
};

// Method to remove spectator
gameSchema.methods.removeSpectator = function(userId) {
  this.spectators = this.spectators.filter(s => s.user.toString() !== userId.toString());
  return this.save();
};

// Method to end game
gameSchema.methods.endGame = function(result, reason) {
  this.status = result;
  this.result = result;
  this.reason = reason;
  this.endedAt = new Date();
  this.chess.isGameOver = true;
  
  // Set specific flags based on reason
  switch (reason) {
    case 'checkmate':
      this.chess.isCheckmate = true;
      break;
    case 'stalemate':
      this.chess.isStalemate = true;
      break;
    case 'insufficient_material':
    case 'threefold_repetition':
    case 'fifty_move_rule':
      this.chess.isDraw = true;
      break;
  }
  
  return this.save();
};

// Static method to find active games for a user
gameSchema.statics.findActiveGames = function(userId) {
  return this.find({
    $or: [
      { 'white.player': userId },
      { 'black.player': userId }
    ],
    status: { $in: ['waiting', 'playing'] }
  }).populate('white.player', 'username rating').populate('black.player', 'username rating');
};

// Static method to find recent games for a user
gameSchema.statics.findRecentGames = function(userId, limit = 10) {
  return this.find({
    $or: [
      { 'white.player': userId },
      { 'black.player': userId }
    ],
    status: { $in: ['draw', 'white_win', 'black_win', 'abandoned', 'timeout'] }
  })
  .sort({ endedAt: -1 })
  .limit(limit)
  .populate('white.player', 'username rating')
  .populate('black.player', 'username rating');
};

module.exports = mongoose.model('Game', gameSchema); 
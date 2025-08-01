const mongoose = require('mongoose');

const ratingHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  gameType: {
    type: String,
    enum: ['blitz', 'rapid', 'classical', 'bullet'],
    required: true
  },
  rating: {
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    change: { type: Number, required: true }
  },
  opponent: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: { type: Number, required: true }
  },
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true
  },
  expectedScore: { type: Number, required: true }, // ELO expected score
  actualScore: { type: Number, required: true }, // 1 for win, 0.5 for draw, 0 for loss
  kFactor: { type: Number, required: true }, // ELO K-factor
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for rating change direction
ratingHistorySchema.virtual('ratingChangeDirection').get(function() {
  return this.rating.change > 0 ? 'gain' : this.rating.change < 0 ? 'loss' : 'no_change';
});

// Virtual for absolute rating change
ratingHistorySchema.virtual('absoluteRatingChange').get(function() {
  return Math.abs(this.rating.change);
});

// Indexes
ratingHistorySchema.index({ user: 1, gameType: 1, timestamp: -1 });
ratingHistorySchema.index({ game: 1 });
ratingHistorySchema.index({ timestamp: -1 });
ratingHistorySchema.index({ 'opponent.user': 1 });

// Static method to get rating history for a user
ratingHistorySchema.statics.getUserHistory = function(userId, gameType = null, limit = 50) {
  const query = { user: userId };
  if (gameType) {
    query.gameType = gameType;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('game', 'gameId white black status result reason')
    .populate('opponent.user', 'username');
};

// Static method to get recent rating changes
ratingHistorySchema.statics.getRecentChanges = function(userId, gameType = null, days = 30) {
  const query = { 
    user: userId,
    timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
  };
  
  if (gameType) {
    query.gameType = gameType;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .populate('game', 'gameId status result')
    .populate('opponent.user', 'username');
};

// Static method to get rating statistics
ratingHistorySchema.statics.getRatingStats = function(userId, gameType = null, days = 30) {
  const query = { 
    user: userId,
    timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
  };
  
  if (gameType) {
    query.gameType = gameType;
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        totalRatingChange: { $sum: '$rating.change' },
        averageRatingChange: { $avg: '$rating.change' },
        maxGain: { $max: '$rating.change' },
        maxLoss: { $min: '$rating.change' },
        wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
        draws: { $sum: { $cond: [{ $eq: ['$result', 'draw'] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ['$result', 'loss'] }, 1, 0] } },
        averageExpectedScore: { $avg: '$expectedScore' },
        averageActualScore: { $avg: '$actualScore' }
      }
    }
  ]);
};

// Static method to get rating progression
ratingHistorySchema.statics.getRatingProgression = function(userId, gameType = null, limit = 100) {
  const query = { user: userId };
  if (gameType) {
    query.gameType = gameType;
  }
  
  return this.find(query)
    .sort({ timestamp: 1 })
    .limit(limit)
    .select('rating.after timestamp')
    .lean();
};

// Static method to get best rating performance
ratingHistorySchema.statics.getBestPerformance = function(userId, gameType = null, days = 30) {
  const query = { 
    user: userId,
    timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
  };
  
  if (gameType) {
    query.gameType = gameType;
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        bestRating: { $max: '$rating.after' },
        worstRating: { $min: '$rating.after' },
        currentRating: { $last: '$rating.after' },
        peakRating: { $max: '$rating.after' }
      }
    }
  ]);
};

// Static method to get opponent statistics
ratingHistorySchema.statics.getOpponentStats = function(userId, gameType = null) {
  const query = { user: userId };
  if (gameType) {
    query.gameType = gameType;
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$opponent.user',
        gamesPlayed: { $sum: 1 },
        wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
        draws: { $sum: { $cond: [{ $eq: ['$result', 'draw'] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ['$result', 'loss'] }, 1, 0] } },
        totalRatingChange: { $sum: '$rating.change' },
        averageOpponentRating: { $avg: '$opponent.rating' }
      }
    },
    {
      $addFields: {
        winRate: { $multiply: [{ $divide: ['$wins', '$gamesPlayed'] }, 100] }
      }
    },
    { $sort: { gamesPlayed: -1 } }
  ]);
};

module.exports = mongoose.model('RatingHistory', ratingHistorySchema); 
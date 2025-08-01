const User = require('../models/User');
const Game = require('../models/Game');
const RatingHistory = require('../models/RatingHistory');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get global leaderboard
 * @route   GET /api/leaderboard
 * @access  Public
 */
const getGlobalLeaderboard = asyncHandler(async (req, res, next) => {
  const { gameType = 'rapid', limit = 100, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  // Validate game type
  const validGameTypes = ['blitz', 'rapid', 'classical', 'bullet'];
  if (!validGameTypes.includes(gameType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid game type'
    });
  }

  // Get users sorted by rating for the specified game type
  const users = await User.find({ isActive: true })
    .select(`username rating.${gameType} stats.gamesPlayed stats.winRate profile.country profile.title`)
    .sort({ [`rating.${gameType}`]: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments({ isActive: true });

  // Add rank to each user
  const rankedUsers = users.map((user, index) => ({
    rank: skip + index + 1,
    username: user.username,
    rating: user.rating[gameType],
    gamesPlayed: user.stats.gamesPlayed,
    winRate: user.stats.winRate,
    country: user.profile.country,
    title: user.profile.title
  }));

  res.json({
    success: true,
    data: {
      leaderboard: rankedUsers,
      gameType,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get country leaderboard
 * @route   GET /api/leaderboard/country/:country
 * @access  Public
 */
const getCountryLeaderboard = asyncHandler(async (req, res, next) => {
  const { gameType = 'rapid', limit = 50 } = req.query;
  const { country } = req.params;

  // Validate game type
  const validGameTypes = ['blitz', 'rapid', 'classical', 'bullet'];
  if (!validGameTypes.includes(gameType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid game type'
    });
  }

  const users = await User.find({
    'profile.country': { $regex: country, $options: 'i' },
    isActive: true
  })
    .select(`username rating.${gameType} stats.gamesPlayed stats.winRate profile.country profile.title`)
    .sort({ [`rating.${gameType}`]: -1 })
    .limit(parseInt(limit));

  const rankedUsers = users.map((user, index) => ({
    rank: index + 1,
    username: user.username,
    rating: user.rating[gameType],
    gamesPlayed: user.stats.gamesPlayed,
    winRate: user.stats.winRate,
    country: user.profile.country,
    title: user.profile.title
  }));

  res.json({
    success: true,
    data: {
      leaderboard: rankedUsers,
      country,
      gameType,
      count: rankedUsers.length
    }
  });
});

/**
 * @desc    Get top players by different criteria
 * @route   GET /api/leaderboard/top
 * @access  Public
 */
const getTopPlayers = asyncHandler(async (req, res, next) => {
  const { criteria = 'rating', gameType = 'rapid', limit = 10 } = req.query;

  let sortField;
  let selectFields;

  switch (criteria) {
    case 'rating':
      sortField = `rating.${gameType}`;
      selectFields = `username rating.${gameType} stats.gamesPlayed profile.country profile.title`;
      break;
    case 'games':
      sortField = 'stats.gamesPlayed';
      selectFields = 'username stats.gamesPlayed stats.winRate profile.country profile.title';
      break;
    case 'winrate':
      sortField = 'stats.winRate';
      selectFields = 'username stats.winRate stats.gamesPlayed profile.country profile.title';
      break;
    case 'streak':
      sortField = 'stats.longestStreak';
      selectFields = 'username stats.longestStreak stats.gamesPlayed profile.country profile.title';
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid criteria'
      });
  }

  const users = await User.find({ isActive: true })
    .select(selectFields)
    .sort({ [sortField]: -1 })
    .limit(parseInt(limit));

  const rankedUsers = users.map((user, index) => ({
    rank: index + 1,
    username: user.username,
    rating: user.rating?.[gameType],
    gamesPlayed: user.stats.gamesPlayed,
    winRate: user.stats.winRate,
    longestStreak: user.stats.longestStreak,
    country: user.profile.country,
    title: user.profile.title
  }));

  res.json({
    success: true,
    data: {
      leaderboard: rankedUsers,
      criteria,
      gameType,
      count: rankedUsers.length
    }
  });
});

/**
 * @desc    Get recent activity
 * @route   GET /api/leaderboard/activity
 * @access  Public
 */
const getRecentActivity = asyncHandler(async (req, res, next) => {
  const { limit = 20 } = req.query;

  // Get recent games
  const recentGames = await Game.find({
    status: { $in: ['white_win', 'black_win', 'draw'] }
  })
    .populate('white.player', 'username rating')
    .populate('black.player', 'username rating')
    .sort({ endedAt: -1 })
    .limit(parseInt(limit));

  const activity = recentGames.map(game => ({
    gameId: game.gameId,
    white: {
      username: game.white.player.username,
      rating: game.white.rating.after || game.white.rating.before
    },
    black: {
      username: game.black.player.username,
      rating: game.black.rating.after || game.black.rating.before
    },
    result: game.result,
    reason: game.reason,
    gameType: game.gameType,
    endedAt: game.endedAt,
    duration: game.duration
  }));

  res.json({
    success: true,
    data: {
      activity,
      count: activity.length
    }
  });
});

/**
 * @desc    Get rating distribution
 * @route   GET /api/leaderboard/distribution
 * @access  Public
 */
const getRatingDistribution = asyncHandler(async (req, res, next) => {
  const { gameType = 'rapid' } = req.query;

  // Validate game type
  const validGameTypes = ['blitz', 'rapid', 'classical', 'bullet'];
  if (!validGameTypes.includes(gameType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid game type'
    });
  }

  // Define rating ranges
  const ranges = [
    { min: 0, max: 999, label: '0-999' },
    { min: 1000, max: 1199, label: '1000-1199' },
    { min: 1200, max: 1399, label: '1200-1399' },
    { min: 1400, max: 1599, label: '1400-1599' },
    { min: 1600, max: 1799, label: '1600-1799' },
    { min: 1800, max: 1999, label: '1800-1999' },
    { min: 2000, max: 2199, label: '2000-2199' },
    { min: 2200, max: 2399, label: '2200-2399' },
    { min: 2400, max: 2599, label: '2400-2599' },
    { min: 2600, max: 2799, label: '2600-2799' },
    { min: 2800, max: 9999, label: '2800+' }
  ];

  const distribution = [];

  for (const range of ranges) {
    const count = await User.countDocuments({
      [`rating.${gameType}`]: { $gte: range.min, $lte: range.max },
      isActive: true
    });

    distribution.push({
      range: range.label,
      min: range.min,
      max: range.max,
      count,
      percentage: 0 // Will be calculated below
    });
  }

  const total = distribution.reduce((sum, item) => sum + item.count, 0);

  // Calculate percentages
  distribution.forEach(item => {
    item.percentage = total > 0 ? Math.round((item.count / total) * 100 * 100) / 100 : 0;
  });

  res.json({
    success: true,
    data: {
      distribution,
      gameType,
      total
    }
  });
});

/**
 * @desc    Get player rankings around a specific user
 * @route   GET /api/leaderboard/around/:userId
 * @access  Public
 */
const getRankingsAroundUser = asyncHandler(async (req, res, next) => {
  const { gameType = 'rapid', range = 5 } = req.query;
  const { userId } = req.params;

  // Validate game type
  const validGameTypes = ['blitz', 'rapid', 'classical', 'bullet'];
  if (!validGameTypes.includes(gameType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid game type'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const userRating = user.rating[gameType];

  // Get users with higher ratings
  const higherUsers = await User.find({
    [`rating.${gameType}`]: { $gt: userRating },
    isActive: true
  })
    .select(`username rating.${gameType} stats.gamesPlayed profile.country profile.title`)
    .sort({ [`rating.${gameType}`]: -1 })
    .limit(parseInt(range));

  // Get users with lower ratings
  const lowerUsers = await User.find({
    [`rating.${gameType}`]: { $lt: userRating },
    isActive: true
  })
    .select(`username rating.${gameType} stats.gamesPlayed profile.country profile.title`)
    .sort({ [`rating.${gameType}`]: -1 })
    .limit(parseInt(range));

  // Calculate user's rank
  const userRank = await User.countDocuments({
    [`rating.${gameType}`]: { $gt: userRating },
    isActive: true
  }) + 1;

  const rankings = [
    ...higherUsers.map((u, index) => ({
      rank: userRank - higherUsers.length + index,
      username: u.username,
      rating: u.rating[gameType],
      gamesPlayed: u.stats.gamesPlayed,
      country: u.profile.country,
      title: u.profile.title
    })),
    {
      rank: userRank,
      username: user.username,
      rating: userRating,
      gamesPlayed: user.stats.gamesPlayed,
      country: user.profile.country,
      title: user.profile.title,
      isCurrentUser: true
    },
    ...lowerUsers.map((u, index) => ({
      rank: userRank + index + 1,
      username: u.username,
      rating: u.rating[gameType],
      gamesPlayed: u.stats.gamesPlayed,
      country: u.profile.country,
      title: u.profile.title
    }))
  ];

  res.json({
    success: true,
    data: {
      rankings,
      gameType,
      userRank,
      totalPlayers: await User.countDocuments({ isActive: true })
    }
  });
});

/**
 * @desc    Get tournament leaderboard (placeholder for future tournaments)
 * @route   GET /api/leaderboard/tournament/:tournamentId
 * @access  Public
 */
const getTournamentLeaderboard = asyncHandler(async (req, res, next) => {
  const { tournamentId } = req.params;

  // This is a placeholder for tournament functionality
  // In a real implementation, you would query tournament-specific data
  
  res.json({
    success: true,
    message: 'Tournament leaderboard functionality coming soon',
    data: {
      tournamentId,
      leaderboard: []
    }
  });
});

module.exports = {
  getGlobalLeaderboard,
  getCountryLeaderboard,
  getTopPlayers,
  getRecentActivity,
  getRatingDistribution,
  getRankingsAroundUser,
  getTournamentLeaderboard
}; 
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Game = require('../models/Game');
const RatingHistory = require('../models/RatingHistory');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get all users (with pagination and filtering)
 * @route   GET /api/users
 * @access  Public
 */
const getUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, country, minRating, maxRating, sortBy = 'username', sortOrder = 'asc' } = req.query;

  // Build filter object
  const filter = { isActive: true };
  
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }

  if (country) {
    filter['profile.country'] = { $regex: country, $options: 'i' };
  }

  if (minRating || maxRating) {
    filter.$or = [
      { 'rating.blitz': { $gte: parseInt(minRating) || 0, $lte: parseInt(maxRating) || 3000 } },
      { 'rating.rapid': { $gte: parseInt(minRating) || 0, $lte: parseInt(maxRating) || 3000 } },
      { 'rating.classical': { $gte: parseInt(minRating) || 0, $lte: parseInt(maxRating) || 3000 } },
      { 'rating.bullet': { $gte: parseInt(minRating) || 0, $lte: parseInt(maxRating) || 3000 } }
    ];
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const users = await User.find(filter)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
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
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Public
 */
const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * @desc    Get user profile
 * @route   GET /api/users/:id/profile
 * @access  Public
 */
const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('profile');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get recent games
  const recentGames = await Game.findRecentGames(user._id, 5);

  // Get rating history
  const ratingHistory = await RatingHistory.getUserHistory(user._id, null, 10);

  res.json({
    success: true,
    data: {
      user,
      recentGames,
      ratingHistory
    }
  });
});

/**
 * @desc    Get user statistics
 * @route   GET /api/users/:id/stats
 * @access  Public
 */
const getUserStats = asyncHandler(async (req, res, next) => {
  const { gameType } = req.query;
  const userId = req.params.id;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get rating statistics
  const ratingStats = await RatingHistory.getRatingStats(userId, gameType, 30);

  // Get best performance
  const bestPerformance = await RatingHistory.getBestPerformance(userId, gameType, 30);

  // Get opponent statistics
  const opponentStats = await RatingHistory.getOpponentStats(userId, gameType);

  // Get rating progression
  const ratingProgression = await RatingHistory.getRatingProgression(userId, gameType, 50);

  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        username: user.username,
        rating: user.rating,
        stats: user.stats
      },
      ratingStats: ratingStats[0] || {},
      bestPerformance: bestPerformance[0] || {},
      opponentStats,
      ratingProgression
    }
  });
});

/**
 * @desc    Get user games
 * @route   GET /api/users/:id/games
 * @access  Public
 */
const getUserGames = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { status, gameType, result } = req.query;

  const userId = req.params.id;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Build filter
  const filter = {
    $or: [
      { 'white.player': userId },
      { 'black.player': userId }
    ]
  };

  if (status) {
    filter.status = status;
  }

  if (gameType) {
    filter.gameType = gameType;
  }

  if (result) {
    filter.result = result;
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
 * @desc    Update user (admin only)
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { role, isActive, isVerified } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Update fields
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (isVerified !== undefined) user.isVerified = isVerified;

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user
    }
  });
});

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if user has active games
  const activeGames = await Game.findActiveGames(user._id);
  
  if (activeGames.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete user with active games'
    });
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * @desc    Get online users
 * @route   GET /api/users/online
 * @access  Public
 */
const getOnlineUsers = asyncHandler(async (req, res, next) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const onlineUsers = await User.find({
    lastSeen: { $gte: fiveMinutesAgo },
    isActive: true
  })
  .select('username rating lastSeen')
  .sort({ lastSeen: -1 })
  .limit(50);

  res.json({
    success: true,
    data: {
      onlineUsers,
      count: onlineUsers.length
    }
  });
});

/**
 * @desc    Search users
 * @route   GET /api/users/search
 * @access  Public
 */
const searchUsers = asyncHandler(async (req, res, next) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { 'profile.firstName': { $regex: q, $options: 'i' } },
      { 'profile.lastName': { $regex: q, $options: 'i' } }
    ],
    isActive: true
  })
  .select('username profile.firstName profile.lastName rating')
  .limit(parseInt(limit));

  res.json({
    success: true,
    data: {
      users
    }
  });
});

/**
 * @desc    Get user achievements
 * @route   GET /api/users/:id/achievements
 * @access  Public
 */
const getUserAchievements = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Calculate achievements based on user stats
  const achievements = [];

  // Rating achievements
  Object.entries(user.rating).forEach(([timeControl, rating]) => {
    if (rating >= 2800) achievements.push({ type: 'rating', timeControl, level: 'super_grandmaster', value: rating });
    else if (rating >= 2500) achievements.push({ type: 'rating', timeControl, level: 'grandmaster', value: rating });
    else if (rating >= 2200) achievements.push({ type: 'rating', timeControl, level: 'master', value: rating });
    else if (rating >= 2000) achievements.push({ type: 'rating', timeControl, level: 'expert', value: rating });
    else if (rating >= 1800) achievements.push({ type: 'rating', timeControl, level: 'advanced', value: rating });
    else if (rating >= 1600) achievements.push({ type: 'rating', timeControl, level: 'intermediate', value: rating });
  });

  // Game count achievements
  if (user.stats.gamesPlayed >= 1000) achievements.push({ type: 'games', level: 'veteran', value: user.stats.gamesPlayed });
  else if (user.stats.gamesPlayed >= 500) achievements.push({ type: 'games', level: 'experienced', value: user.stats.gamesPlayed });
  else if (user.stats.gamesPlayed >= 100) achievements.push({ type: 'games', level: 'regular', value: user.stats.gamesPlayed });

  // Win rate achievements
  if (user.stats.winRate >= 70) achievements.push({ type: 'winrate', level: 'excellent', value: user.stats.winRate });
  else if (user.stats.winRate >= 60) achievements.push({ type: 'winrate', level: 'good', value: user.stats.winRate });

  // Streak achievements
  if (user.stats.longestStreak >= 10) achievements.push({ type: 'streak', level: 'amazing', value: user.stats.longestStreak });
  else if (user.stats.longestStreak >= 5) achievements.push({ type: 'streak', level: 'impressive', value: user.stats.longestStreak });

  res.json({
    success: true,
    data: {
      achievements
    }
  });
});

module.exports = {
  getUsers,
  getUserById,
  getUserProfile,
  getUserStats,
  getUserGames,
  updateUser,
  deleteUser,
  getOnlineUsers,
  searchUsers,
  getUserAchievements
}; 
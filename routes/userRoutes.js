const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/userController');
const { authenticateToken, isAdmin, isAdminOrModerator } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const updateUserValidation = [
  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean')
];

// Public routes
router.get('/', getUsers);
router.get('/online', getOnlineUsers);
router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.get('/:id/profile', getUserProfile);
router.get('/:id/stats', getUserStats);
router.get('/:id/games', getUserGames);
router.get('/:id/achievements', getUserAchievements);

// Admin routes
router.put('/:id', authenticateToken, isAdmin, updateUserValidation, updateUser);
router.delete('/:id', authenticateToken, isAdmin, deleteUser);

module.exports = router; 
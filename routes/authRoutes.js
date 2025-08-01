const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} = require('../controllers/authController');
const { authenticateToken, authRateLimit } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .optional()
    .isLength({ max: 30 })
    .withMessage('First name cannot exceed 30 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Last name cannot exceed 30 characters'),
  body('country')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Country name cannot exceed 50 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('firstName')
    .optional()
    .isLength({ max: 30 })
    .withMessage('First name cannot exceed 30 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Last name cannot exceed 30 characters'),
  body('country')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Country name cannot exceed 50 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('title')
    .optional()
    .isIn(['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM'])
    .withMessage('Invalid title')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
];

const resetPasswordValidation = [
  body('resetToken')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Routes
router.post('/register', authRateLimit, registerValidation, register);
router.post('/login', authRateLimit, loginValidation, login);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfileValidation, updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, changePassword);
router.post('/forgot-password', authRateLimit, forgotPasswordValidation, forgotPassword);
router.post('/reset-password', authRateLimit, resetPasswordValidation, resetPassword);
router.post('/refresh', authenticateToken, refreshToken);
router.post('/logout', authenticateToken, logout);

module.exports = router; 
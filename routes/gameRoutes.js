const express = require('express');
const { body } = require('express-validator');
const {
  createGame,
  getGames,
  getGameById,
  joinGame,
  makeGameMove,
  resignGame,
  offerDraw,
  getGameChat,
  sendChatMessage
} = require('../controllers/gameController');
const { 
  authenticateToken, 
  gameCreationRateLimit, 
  chatRateLimit 
} = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const createGameValidation = [
  body('gameType')
    .optional()
    .isIn(['blitz', 'rapid', 'classical', 'bullet'])
    .withMessage('Invalid game type'),
  body('timeControl')
    .optional()
    .isInt({ min: 30, max: 7200 })
    .withMessage('Time control must be between 30 and 7200 seconds'),
  body('increment')
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage('Increment must be between 0 and 60 seconds'),
  body('rated')
    .optional()
    .isBoolean()
    .withMessage('Rated must be a boolean'),
  body('allowSpectators')
    .optional()
    .isBoolean()
    .withMessage('Allow spectators must be a boolean'),
  body('allowChat')
    .optional()
    .isBoolean()
    .withMessage('Allow chat must be a boolean'),
  body('allowTakebacks')
    .optional()
    .isBoolean()
    .withMessage('Allow takebacks must be a boolean'),
  body('allowDrawOffers')
    .optional()
    .isBoolean()
    .withMessage('Allow draw offers must be a boolean'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('Is public must be a boolean')
];

const moveValidation = [
  body('from')
    .matches(/^[a-h][1-8]$/)
    .withMessage('From square must be in algebraic notation (e.g., e2)'),
  body('to')
    .matches(/^[a-h][1-8]$/)
    .withMessage('To square must be in algebraic notation (e.g., e4)'),
  body('promotion')
    .optional()
    .isIn(['q', 'r', 'b', 'n'])
    .withMessage('Promotion piece must be q, r, b, or n')
];

const chatMessageValidation = [
  body('message')
    .isLength({ min: 1, max: 200 })
    .withMessage('Message must be between 1 and 200 characters')
    .trim()
    .escape()
];

// Public routes
router.get('/', getGames);
router.get('/:id', getGameById);
router.get('/:id/chat', getGameChat);

// Private routes
router.post('/', authenticateToken, gameCreationRateLimit, createGameValidation, createGame);
router.post('/:id/join', authenticateToken, joinGame);
router.post('/:id/move', authenticateToken, moveValidation, makeGameMove);
router.post('/:id/resign', authenticateToken, resignGame);
router.post('/:id/draw-offer', authenticateToken, offerDraw);
router.post('/:id/chat', authenticateToken, chatRateLimit, chatMessageValidation, sendChatMessage);

module.exports = router; 
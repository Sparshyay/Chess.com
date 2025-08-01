const express = require('express');
const {
  getGlobalLeaderboard,
  getCountryLeaderboard,
  getTopPlayers,
  getRecentActivity,
  getRatingDistribution,
  getRankingsAroundUser,
  getTournamentLeaderboard
} = require('../controllers/leaderboardController');

const router = express.Router();

// All leaderboard routes are public
router.get('/', getGlobalLeaderboard);
router.get('/country/:country', getCountryLeaderboard);
router.get('/top', getTopPlayers);
router.get('/activity', getRecentActivity);
router.get('/distribution', getRatingDistribution);
router.get('/around/:userId', getRankingsAroundUser);
router.get('/tournament/:tournamentId', getTournamentLeaderboard);

module.exports = router; 
/**
 * ELO Rating System Implementation
 * Based on the standard ELO formula with configurable K-factors
 */

// K-factor configuration based on rating and game type
const K_FACTORS = {
  blitz: {
    default: 32,
    provisional: 64, // For players with < 30 games
    high_rating: 16  // For players with rating > 2400
  },
  rapid: {
    default: 32,
    provisional: 64,
    high_rating: 16
  },
  classical: {
    default: 24,
    provisional: 48,
    high_rating: 12
  },
  bullet: {
    default: 32,
    provisional: 64,
    high_rating: 16
  }
};

// Provisional game thresholds
const PROVISIONAL_GAMES = 30;
const HIGH_RATING_THRESHOLD = 2400;

/**
 * Calculate the expected score for a player
 * @param {number} playerRating - Player's current rating
 * @param {number} opponentRating - Opponent's rating
 * @returns {number} Expected score (0-1)
 */
const calculateExpectedScore = (playerRating, opponentRating) => {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
};

/**
 * Calculate the K-factor for a player
 * @param {string} gameType - Type of game (blitz, rapid, classical, bullet)
 * @param {number} playerRating - Player's current rating
 * @param {number} gamesPlayed - Number of games played by the player
 * @returns {number} K-factor
 */
const calculateKFactor = (gameType, playerRating, gamesPlayed = 0) => {
  const kFactors = K_FACTORS[gameType];
  
  if (!kFactors) {
    throw new Error(`Invalid game type: ${gameType}`);
  }

  // Provisional players get higher K-factor
  if (gamesPlayed < PROVISIONAL_GAMES) {
    return kFactors.provisional;
  }

  // High-rated players get lower K-factor
  if (playerRating >= HIGH_RATING_THRESHOLD) {
    return kFactors.high_rating;
  }

  return kFactors.default;
};

/**
 * Calculate new rating for a player
 * @param {number} currentRating - Player's current rating
 * @param {number} opponentRating - Opponent's rating
 * @param {number} actualScore - Actual score (1 for win, 0.5 for draw, 0 for loss)
 * @param {string} gameType - Type of game
 * @param {number} gamesPlayed - Number of games played by the player
 * @returns {object} Rating calculation result
 */
const calculateNewRating = (currentRating, opponentRating, actualScore, gameType, gamesPlayed = 0) => {
  const expectedScore = calculateExpectedScore(currentRating, opponentRating);
  const kFactor = calculateKFactor(gameType, currentRating, gamesPlayed);
  
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
  const newRating = Math.max(100, currentRating + ratingChange); // Minimum rating of 100

  return {
    before: currentRating,
    after: newRating,
    change: ratingChange,
    expectedScore: Math.round(expectedScore * 100) / 100,
    actualScore,
    kFactor
  };
};

/**
 * Calculate rating changes for both players in a game
 * @param {object} whitePlayer - White player data
 * @param {object} blackPlayer - Black player data
 * @param {string} result - Game result ('white_win', 'black_win', 'draw')
 * @param {string} gameType - Type of game
 * @returns {object} Rating changes for both players
 */
const calculateGameRatings = (whitePlayer, blackPlayer, result, gameType) => {
  // Determine actual scores
  let whiteScore, blackScore;
  
  switch (result) {
    case 'white_win':
      whiteScore = 1;
      blackScore = 0;
      break;
    case 'black_win':
      whiteScore = 0;
      blackScore = 1;
      break;
    case 'draw':
      whiteScore = 0.5;
      blackScore = 0.5;
      break;
    default:
      throw new Error(`Invalid game result: ${result}`);
  }

  // Calculate new ratings
  const whiteRating = calculateNewRating(
    whitePlayer.rating,
    blackPlayer.rating,
    whiteScore,
    gameType,
    whitePlayer.gamesPlayed
  );

  const blackRating = calculateNewRating(
    blackPlayer.rating,
    whitePlayer.rating,
    blackScore,
    gameType,
    blackPlayer.gamesPlayed
  );

  return {
    white: {
      ...whiteRating,
      result: whiteScore === 1 ? 'win' : whiteScore === 0.5 ? 'draw' : 'loss'
    },
    black: {
      ...blackRating,
      result: blackScore === 1 ? 'win' : blackScore === 0.5 ? 'draw' : 'loss'
    }
  };
};

/**
 * Calculate performance rating (used for tournaments)
 * @param {Array} opponents - Array of opponent ratings
 * @param {number} score - Total score achieved
 * @returns {number} Performance rating
 */
const calculatePerformanceRating = (opponents, score) => {
  if (opponents.length === 0) return 0;
  
  const averageOpponentRating = opponents.reduce((sum, rating) => sum + rating, 0) / opponents.length;
  const expectedScore = score / opponents.length;
  
  // Convert expected score to rating difference
  const ratingDifference = -400 * Math.log10(1 / expectedScore - 1);
  
  return Math.round(averageOpponentRating + ratingDifference);
};

/**
 * Calculate rating confidence interval
 * @param {number} rating - Player's rating
 * @param {number} gamesPlayed - Number of games played
 * @param {number} standardDeviation - Standard deviation of rating changes
 * @returns {object} Confidence interval
 */
const calculateRatingConfidence = (rating, gamesPlayed, standardDeviation = 200) => {
  if (gamesPlayed < 10) {
    return {
      lower: rating - 400,
      upper: rating + 400,
      confidence: 'low'
    };
  }

  const marginOfError = standardDeviation / Math.sqrt(gamesPlayed);
  const confidenceLevel = 0.95; // 95% confidence interval
  const zScore = 1.96; // Z-score for 95% confidence

  return {
    lower: Math.round(rating - zScore * marginOfError),
    upper: Math.round(rating + zScore * marginOfError),
    confidence: gamesPlayed > 30 ? 'high' : 'medium'
  };
};

/**
 * Validate rating calculation parameters
 * @param {object} params - Parameters to validate
 * @returns {boolean} True if valid
 */
const validateRatingParams = (params) => {
  const { currentRating, opponentRating, actualScore, gameType } = params;
  
  if (typeof currentRating !== 'number' || currentRating < 0) {
    throw new Error('Invalid current rating');
  }
  
  if (typeof opponentRating !== 'number' || opponentRating < 0) {
    throw new Error('Invalid opponent rating');
  }
  
  if (typeof actualScore !== 'number' || actualScore < 0 || actualScore > 1) {
    throw new Error('Invalid actual score');
  }
  
  if (!K_FACTORS[gameType]) {
    throw new Error('Invalid game type');
  }
  
  return true;
};

module.exports = {
  calculateExpectedScore,
  calculateKFactor,
  calculateNewRating,
  calculateGameRatings,
  calculatePerformanceRating,
  calculateRatingConfidence,
  validateRatingParams,
  K_FACTORS,
  PROVISIONAL_GAMES,
  HIGH_RATING_THRESHOLD
}; 
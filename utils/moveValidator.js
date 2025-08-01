const { Chess } = require('chess.js');

/**
 * Chess Move Validator using chess.js
 * Handles move validation, game state checking, and move generation
 */

/**
 * Create a new chess instance from FEN or PGN
 * @param {string} fen - FEN string (optional, defaults to starting position)
 * @param {string} pgn - PGN string (optional)
 * @returns {Chess} Chess instance
 */
const createChessInstance = (fen = null, pgn = null) => {
  const chess = new Chess();
  
  if (pgn) {
    try {
      chess.loadPgn(pgn);
    } catch (error) {
      throw new Error(`Invalid PGN: ${error.message}`);
    }
  } else if (fen) {
    try {
      chess.load(fen);
    } catch (error) {
      throw new Error(`Invalid FEN: ${error.message}`);
    }
  }
  
  return chess;
};

/**
 * Validate a chess move
 * @param {string} fen - Current FEN position
 * @param {string} from - From square (e.g., 'e2')
 * @param {string} to - To square (e.g., 'e4')
 * @param {string} promotion - Promotion piece (optional, e.g., 'q', 'r', 'b', 'n')
 * @returns {object} Move validation result
 */
const validateMove = (fen, from, to, promotion = null) => {
  try {
    const chess = createChessInstance(fen);
    
    // Check if it's the player's turn
    const currentTurn = chess.turn();
    
    // Generate all legal moves
    const legalMoves = chess.moves({ square: from, verbose: true });
    const targetMove = legalMoves.find(move => 
      move.to === to && (!promotion || move.promotion === promotion)
    );
    
    if (!targetMove) {
      return {
        isValid: false,
        error: 'Invalid move',
        legalMoves: legalMoves.map(move => ({
          from: move.from,
          to: move.to,
          piece: move.piece,
          promotion: move.promotion,
          san: move.san
        }))
      };
    }
    
    return {
      isValid: true,
      move: targetMove,
      currentTurn,
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isGameOver: chess.isGameOver()
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Make a move and return the new game state
 * @param {string} fen - Current FEN position
 * @param {string} from - From square
 * @param {string} to - To square
 * @param {string} promotion - Promotion piece (optional)
 * @returns {object} Game state after move
 */
const makeMove = (fen, from, to, promotion = null) => {
  try {
    const chess = createChessInstance(fen);
    
    const move = chess.move({
      from,
      to,
      promotion
    });
    
    if (!move) {
      throw new Error('Invalid move');
    }
    
    return {
      success: true,
      move: {
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        san: move.san,
        flags: move.flags,
        promotion: move.promotion,
        captured: move.captured
      },
      fen: chess.fen(),
      pgn: chess.pgn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isGameOver: chess.isGameOver(),
      turn: chess.turn(),
      moveNumber: chess.moveNumber()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get all legal moves for a position
 * @param {string} fen - Current FEN position
 * @param {string} square - Specific square to get moves for (optional)
 * @returns {object} Legal moves information
 */
const getLegalMoves = (fen, square = null) => {
  try {
    const chess = createChessInstance(fen);
    
    const options = square ? { square, verbose: true } : { verbose: true };
    const moves = chess.moves(options);
    
    return {
      success: true,
      moves: moves.map(move => ({
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        san: move.san,
        flags: move.flags,
        promotion: move.promotion,
        captured: move.captured
      })),
      totalMoves: moves.length,
      turn: chess.turn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isGameOver: chess.isGameOver()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Analyze a position
 * @param {string} fen - Current FEN position
 * @returns {object} Position analysis
 */
const analyzePosition = (fen) => {
  try {
    const chess = createChessInstance(fen);
    
    return {
      success: true,
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: chess.turn(),
      moveNumber: chess.moveNumber(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isGameOver: chess.isGameOver(),
      isThreefoldRepetition: chess.isThreefoldRepetition(),
      isInsufficientMaterial: chess.isInsufficientMaterial(),
      history: chess.history({ verbose: true }),
      legalMoves: chess.moves({ verbose: true }).length,
      material: {
        white: getMaterialCount(chess, 'w'),
        black: getMaterialCount(chess, 'b')
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get material count for a color
 * @param {Chess} chess - Chess instance
 * @param {string} color - Color ('w' or 'b')
 * @returns {object} Material count
 */
const getMaterialCount = (chess, color) => {
  const board = chess.board();
  const pieces = {
    p: 0, // pawns
    n: 0, // knights
    b: 0, // bishops
    r: 0, // rooks
    q: 0, // queens
    k: 0  // kings
  };
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.color === color) {
        pieces[piece.type]++;
      }
    }
  }
  
  return pieces;
};

/**
 * Check if a position is a draw
 * @param {string} fen - Current FEN position
 * @returns {object} Draw analysis
 */
const checkDrawConditions = (fen) => {
  try {
    const chess = createChessInstance(fen);
    
    return {
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),
      isInsufficientMaterial: chess.isInsufficientMaterial(),
      isThreefoldRepetition: chess.isThreefoldRepetition(),
      isFiftyMoveRule: chess.isFiftyMoveRule()
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
};

/**
 * Convert SAN (Standard Algebraic Notation) to coordinates
 * @param {string} fen - Current FEN position
 * @param {string} san - SAN move (e.g., 'e4', 'Nf3')
 * @returns {object} Move coordinates
 */
const sanToCoordinates = (fen, san) => {
  try {
    const chess = createChessInstance(fen);
    const move = chess.move(san);
    
    if (!move) {
      throw new Error('Invalid SAN move');
    }
    
    return {
      success: true,
      from: move.from,
      to: move.to,
      piece: move.piece,
      color: move.color,
      san: move.san,
      flags: move.flags,
      promotion: move.promotion
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Convert coordinates to SAN
 * @param {string} fen - Current FEN position
 * @param {string} from - From square
 * @param {string} to - To square
 * @param {string} promotion - Promotion piece (optional)
 * @returns {object} SAN move
 */
const coordinatesToSan = (fen, from, to, promotion = null) => {
  try {
    const chess = createChessInstance(fen);
    const move = chess.move({
      from,
      to,
      promotion
    });
    
    if (!move) {
      throw new Error('Invalid move coordinates');
    }
    
    return {
      success: true,
      san: move.san,
      piece: move.piece,
      color: move.color,
      flags: move.flags,
      promotion: move.promotion
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get the game result
 * @param {string} fen - Current FEN position
 * @returns {string} Game result
 */
const getGameResult = (fen) => {
  try {
    const chess = createChessInstance(fen);
    
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? 'black_win' : 'white_win';
    }
    
    if (chess.isDraw()) {
      return 'draw';
    }
    
    if (chess.isGameOver()) {
      return 'game_over';
    }
    
    return 'ongoing';
  } catch (error) {
    return 'error';
  }
};

/**
 * Validate FEN string
 * @param {string} fen - FEN string to validate
 * @returns {boolean} True if valid
 */
const isValidFen = (fen) => {
  try {
    const chess = new Chess();
    chess.load(fen);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate PGN string
 * @param {string} pgn - PGN string to validate
 * @returns {boolean} True if valid
 */
const isValidPgn = (pgn) => {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  createChessInstance,
  validateMove,
  makeMove,
  getLegalMoves,
  analyzePosition,
  getMaterialCount,
  checkDrawConditions,
  sanToCoordinates,
  coordinatesToSan,
  getGameResult,
  isValidFen,
  isValidPgn
}; 
// ===== CHESS GAME - COMPLETE IMPLEMENTATION =====
// Unicode chess pieces
const PIECES = {
    white: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// ===== GAME STATE =====
let gameState = {
    board: [],
    currentTurn: 'white',
    selectedSquare: null,
    legalMoves: [],
    gameStatus: 'active', // active, check, checkmate, stalemate
    moveHistory: [],
    enPassantTarget: null,
    castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
    },
    kingMoved: { white: false, black: false },
    rookMoved: {
        white: { kingSide: false, queenSide: false },
        black: { kingSide: false, queenSide: false }
    },
    gameMode: 'pvp', // 'pvp' or 'pvc' (player vs computer)
    aiDifficulty: 'medium', // 'easy', 'medium', 'hard'
    isAiThinking: false
};

// ===== INITIALIZE BOARD =====
function initializeBoard() {
    // Create empty 8x8 board
    gameState.board = Array(8).fill(null).map(() => Array(8).fill(null));

    // Setup black pieces (row 0-1)
    const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    for (let col = 0; col < 8; col++) {
        gameState.board[0][col] = { type: backRow[col], color: 'black' };
        gameState.board[1][col] = { type: 'pawn', color: 'black' };
        gameState.board[6][col] = { type: 'pawn', color: 'white' };
        gameState.board[7][col] = { type: backRow[col], color: 'white' };
    }
}

// ===== RENDER BOARD =====
function renderBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;

            const piece = gameState.board[row][col];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.className = `piece ${piece.color}-piece`;
                pieceSpan.textContent = PIECES[piece.color][piece.type];
                square.appendChild(pieceSpan);
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            chessboard.appendChild(square);
        }
    }

    updateGameStatus();
}

// ===== HANDLE SQUARE CLICK =====
function handleSquareClick(row, col) {
    if (gameState.gameStatus === 'checkmate' || gameState.gameStatus === 'stalemate') {
        return;
    }

    // Prevent player moves when AI is thinking
    if (gameState.isAiThinking) {
        return;
    }

    // In AI mode, prevent player from moving black pieces
    if (gameState.gameMode === 'pvc' && gameState.currentTurn === 'black') {
        return;
    }

    const clickedPiece = gameState.board[row][col];

    // If a piece is already selected
    if (gameState.selectedSquare !== null) {
        const [selectedRow, selectedCol] = gameState.selectedSquare;

        // Check if clicked square is a legal move
        const isLegalMove = gameState.legalMoves.some(
            move => move.row === row && move.col === col
        );

        if (isLegalMove) {
            makeMove(selectedRow, selectedCol, row, col);
            clearSelection();
            return;
        }

        // Deselect if clicking same square or empty square
        if ((selectedRow === row && selectedCol === col) || !clickedPiece) {
            clearSelection();
            return;
        }

        // Select different piece of same color
        if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
            selectSquare(row, col);
            return;
        }

        clearSelection();
    } else {
        // Select piece if it belongs to current player
        if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
            selectSquare(row, col);
        }
    }
}

// ===== SELECT SQUARE =====
function selectSquare(row, col) {
    gameState.selectedSquare = [row, col];
    gameState.legalMoves = getLegalMoves(row, col);
    highlightSquares();
}

// ===== CLEAR SELECTION =====
function clearSelection() {
    gameState.selectedSquare = null;
    gameState.legalMoves = [];
    removeHighlights();
}

// ===== HIGHLIGHT SQUARES =====
function highlightSquares() {
    removeHighlights();

    if (gameState.selectedSquare) {
        const [row, col] = gameState.selectedSquare;
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');

        gameState.legalMoves.forEach(move => {
            const moveSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (gameState.board[move.row][move.col]) {
                moveSquare.classList.add('legal-capture');
            } else {
                moveSquare.classList.add('legal-move');
            }
        });
    }
}

// ===== REMOVE HIGHLIGHTS =====
function removeHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'legal-move', 'legal-capture');
    });
}

// ===== GET LEGAL MOVES =====
function getLegalMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];

    let moves = [];

    switch (piece.type) {
        case 'pawn':
            moves = getPawnMoves(row, col, piece.color);
            break;
        case 'rook':
            moves = getRookMoves(row, col, piece.color);
            break;
        case 'knight':
            moves = getKnightMoves(row, col, piece.color);
            break;
        case 'bishop':
            moves = getBishopMoves(row, col, piece.color);
            break;
        case 'queen':
            moves = getQueenMoves(row, col, piece.color);
            break;
        case 'king':
            moves = getKingMoves(row, col, piece.color);
            break;
    }

    // Filter out moves that would put own king in check
    return moves.filter(move => !wouldBeInCheck(row, col, move.row, move.col, piece.color));
}

// ===== PAWN MOVES =====
function getPawnMoves(row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    // Move forward one square
    if (isValidSquare(row + direction, col) && !gameState.board[row + direction][col]) {
        moves.push({ row: row + direction, col });

        // Move forward two squares from starting position
        if (row === startRow && !gameState.board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col });
        }
    }

    // Capture diagonally
    [-1, 1].forEach(offset => {
        const newRow = row + direction;
        const newCol = col + offset;
        if (isValidSquare(newRow, newCol)) {
            const target = gameState.board[newRow][newCol];
            if (target && target.color !== color) {
                moves.push({ row: newRow, col: newCol });
            }

            // En passant
            if (gameState.enPassantTarget &&
                gameState.enPassantTarget.row === newRow &&
                gameState.enPassantTarget.col === newCol) {
                moves.push({ row: newRow, col: newCol, enPassant: true });
            }
        }
    });

    return moves;
}

// ===== ROOK MOVES =====
function getRookMoves(row, col, color) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    directions.forEach(([dRow, dCol]) => {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dRow * i;
            const newCol = col + dCol * i;

            if (!isValidSquare(newRow, newCol)) break;

            const target = gameState.board[newRow][newCol];
            if (!target) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    });

    return moves;
}

// ===== KNIGHT MOVES =====
function getKnightMoves(row, col, color) {
    const moves = [];
    const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    offsets.forEach(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (isValidSquare(newRow, newCol)) {
            const target = gameState.board[newRow][newCol];
            if (!target || target.color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });

    return moves;
}

// ===== BISHOP MOVES =====
function getBishopMoves(row, col, color) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    directions.forEach(([dRow, dCol]) => {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dRow * i;
            const newCol = col + dCol * i;

            if (!isValidSquare(newRow, newCol)) break;

            const target = gameState.board[newRow][newCol];
            if (!target) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    });

    return moves;
}

// ===== QUEEN MOVES =====
function getQueenMoves(row, col, color) {
    return [...getRookMoves(row, col, color), ...getBishopMoves(row, col, color)];
}

// ===== KING MOVES =====
function getKingMoves(row, col, color) {
    const moves = [];
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    offsets.forEach(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (isValidSquare(newRow, newCol)) {
            const target = gameState.board[newRow][newCol];
            if (!target || target.color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });

    // Castling
    const castlingMoves = getCastlingMoves(row, col, color);
    moves.push(...castlingMoves);

    return moves;
}

// ===== CASTLING MOVES =====
function getCastlingMoves(row, col, color) {
    const moves = [];

    // Check if king has moved
    if (gameState.kingMoved[color]) return moves;

    // Check if king is in check
    if (isKingInCheck(color)) return moves;

    const backRank = color === 'white' ? 7 : 0;

    // King-side castling
    if (gameState.castlingRights[color].kingSide && !gameState.rookMoved[color].kingSide) {
        if (!gameState.board[backRank][5] && !gameState.board[backRank][6]) {
            // Check if king passes through or ends up in check
            if (!isSquareUnderAttack(backRank, 5, color) &&
                !isSquareUnderAttack(backRank, 6, color)) {
                moves.push({ row: backRank, col: 6, castling: 'king-side' });
            }
        }
    }

    // Queen-side castling
    if (gameState.castlingRights[color].queenSide && !gameState.rookMoved[color].queenSide) {
        if (!gameState.board[backRank][1] &&
            !gameState.board[backRank][2] &&
            !gameState.board[backRank][3]) {
            // Check if king passes through or ends up in check
            if (!isSquareUnderAttack(backRank, 2, color) &&
                !isSquareUnderAttack(backRank, 3, color)) {
                moves.push({ row: backRank, col: 2, castling: 'queen-side' });
            }
        }
    }

    return moves;
}

// ===== MAKE MOVE =====
function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = gameState.board[fromRow][fromCol];
    const capturedPiece = gameState.board[toRow][toCol];
    const move = gameState.legalMoves.find(m => m.row === toRow && m.col === toCol);

    // Handle en passant
    if (move && move.enPassant) {
        const captureRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
        gameState.board[captureRow][toCol] = null;
    }

    // Handle castling
    if (move && move.castling) {
        const backRank = piece.color === 'white' ? 7 : 0;
        if (move.castling === 'king-side') {
            gameState.board[backRank][5] = gameState.board[backRank][7];
            gameState.board[backRank][7] = null;
        } else {
            gameState.board[backRank][3] = gameState.board[backRank][0];
            gameState.board[backRank][0] = null;
        }
    }

    // Move the piece
    gameState.board[toRow][toCol] = piece;
    gameState.board[fromRow][fromCol] = null;

    // Update en passant target
    gameState.enPassantTarget = null;
    if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
        gameState.enPassantTarget = {
            row: (fromRow + toRow) / 2,
            col: toCol
        };
    }

    // Track king and rook movements for castling
    if (piece.type === 'king') {
        gameState.kingMoved[piece.color] = true;
    }

    if (piece.type === 'rook') {
        const backRank = piece.color === 'white' ? 7 : 0;
        if (fromRow === backRank) {
            if (fromCol === 0) {
                gameState.rookMoved[piece.color].queenSide = true;
            } else if (fromCol === 7) {
                gameState.rookMoved[piece.color].kingSide = true;
            }
        }
    }

    // Handle pawn promotion
    if (piece.type === 'pawn') {
        const promotionRow = piece.color === 'white' ? 0 : 7;
        if (toRow === promotionRow) {
            gameState.board[toRow][toCol] = { type: 'queen', color: piece.color };
            showAlert('Pawn promoted to Queen!', 'promotion');
        }
    }

    // Record move
    gameState.moveHistory.push({
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: piece,
        captured: capturedPiece
    });

    // Switch turns
    gameState.currentTurn = gameState.currentTurn === 'white' ? 'black' : 'white';

    // Check game status
    checkGameStatus();

    renderBoard();

    // Trigger AI move if in AI mode and it's AI's turn
    if (gameState.gameMode === 'pvc' &&
        gameState.currentTurn === 'black' &&
        gameState.gameStatus === 'active') {
        setTimeout(makeComputerMove, 500); // Delay for better UX
    }
}

// ===== CHECK IF MOVE WOULD PUT KING IN CHECK =====
function wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
    // Create temporary board state
    const tempBoard = gameState.board.map(row => [...row]);
    const tempPiece = tempBoard[fromRow][fromCol];

    // Make temporary move
    tempBoard[toRow][toCol] = tempPiece;
    tempBoard[fromRow][fromCol] = null;

    // Find king position
    let kingRow, kingCol;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = tempBoard[row][col];
            if (piece && piece.type === 'king' && piece.color === color) {
                kingRow = row;
                kingCol = col;
                break;
            }
        }
        if (kingRow !== undefined) break;
    }

    // Check if king is under attack
    return isSquareUnderAttackTemp(kingRow, kingCol, color, tempBoard);
}

// ===== CHECK IF SQUARE IS UNDER ATTACK =====
function isSquareUnderAttack(row, col, defenderColor) {
    return isSquareUnderAttackTemp(row, col, defenderColor, gameState.board);
}

function isSquareUnderAttackTemp(row, col, defenderColor, board) {
    const attackerColor = defenderColor === 'white' ? 'black' : 'white';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === attackerColor) {
                const attacks = getAttackSquares(r, c, piece, board);
                if (attacks.some(sq => sq.row === row && sq.col === col)) {
                    return true;
                }
            }
        }
    }

    return false;
}

// ===== GET ATTACK SQUARES (without castling or en passant) =====
function getAttackSquares(row, col, piece, board) {
    const moves = [];

    switch (piece.type) {
        case 'pawn':
            const direction = piece.color === 'white' ? -1 : 1;
            [-1, 1].forEach(offset => {
                const newRow = row + direction;
                const newCol = col + offset;
                if (isValidSquare(newRow, newCol)) {
                    moves.push({ row: newRow, col: newCol });
                }
            });
            break;
        case 'rook':
            moves.push(...getRookMovesTemp(row, col, piece.color, board));
            break;
        case 'knight':
            moves.push(...getKnightMovesTemp(row, col, piece.color, board));
            break;
        case 'bishop':
            moves.push(...getBishopMovesTemp(row, col, piece.color, board));
            break;
        case 'queen':
            moves.push(...getRookMovesTemp(row, col, piece.color, board));
            moves.push(...getBishopMovesTemp(row, col, piece.color, board));
            break;
        case 'king':
            const offsets = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1], [0, 1],
                [1, -1], [1, 0], [1, 1]
            ];
            offsets.forEach(([dRow, dCol]) => {
                const newRow = row + dRow;
                const newCol = col + dCol;
                if (isValidSquare(newRow, newCol)) {
                    moves.push({ row: newRow, col: newCol });
                }
            });
            break;
    }

    return moves;
}

// ===== TEMPORARY MOVE GENERATORS =====
function getRookMovesTemp(row, col, color, board) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    directions.forEach(([dRow, dCol]) => {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dRow * i;
            const newCol = col + dCol * i;

            if (!isValidSquare(newRow, newCol)) break;

            const target = board[newRow][newCol];
            if (!target) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    });

    return moves;
}

function getBishopMovesTemp(row, col, color, board) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    directions.forEach(([dRow, dCol]) => {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dRow * i;
            const newCol = col + dCol * i;

            if (!isValidSquare(newRow, newCol)) break;

            const target = board[newRow][newCol];
            if (!target) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    });

    return moves;
}

function getKnightMovesTemp(row, col, color, board) {
    const moves = [];
    const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    offsets.forEach(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (isValidSquare(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (!target || target.color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });

    return moves;
}

// ===== CHECK IF KING IS IN CHECK =====
function isKingInCheck(color) {
    // Find king position
    let kingRow, kingCol;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.type === 'king' && piece.color === color) {
                kingRow = row;
                kingCol = col;
                break;
            }
        }
        if (kingRow !== undefined) break;
    }

    return isSquareUnderAttack(kingRow, kingCol, color);
}

// ===== CHECK GAME STATUS =====
function checkGameStatus() {
    const currentColor = gameState.currentTurn;
    const inCheck = isKingInCheck(currentColor);
    const hasLegalMoves = playerHasLegalMoves(currentColor);

    if (inCheck) {
        if (!hasLegalMoves) {
            gameState.gameStatus = 'checkmate';
            const winner = currentColor === 'white' ? 'Black' : 'White';
            showAlert(`Checkmate! ${winner} wins!`, 'checkmate');
        } else {
            gameState.gameStatus = 'check';
            showAlert(`${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)} is in check!`, 'check');
        }
    } else {
        if (!hasLegalMoves) {
            gameState.gameStatus = 'stalemate';
            showAlert('Stalemate! Game is a draw.', 'stalemate');
        } else {
            gameState.gameStatus = 'active';
            clearAlerts();
        }
    }
}

// ===== CHECK IF PLAYER HAS LEGAL MOVES =====
function playerHasLegalMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.color === color) {
                const moves = getLegalMoves(row, col);
                if (moves.length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// ===== UPDATE GAME STATUS DISPLAY =====
function updateGameStatus() {
    const statusDisplay = document.getElementById('gameStatus');
    const currentTurnElement = document.getElementById('currentTurn');

    currentTurnElement.textContent = gameState.currentTurn.charAt(0).toUpperCase() +
        gameState.currentTurn.slice(1);

    // Update color classes
    statusDisplay.classList.remove('white-turn', 'black-turn');
    statusDisplay.classList.add(gameState.currentTurn === 'white' ? 'white-turn' : 'black-turn');
}

// ===== SHOW ALERT =====
function showAlert(message, type) {
    const alertsContainer = document.getElementById('gameAlerts');
    alertsContainer.innerHTML = `<div class="alert ${type}">${message}</div>`;
}

// ===== CLEAR ALERTS =====
function clearAlerts() {
    const alertsContainer = document.getElementById('gameAlerts');
    alertsContainer.innerHTML = '';
}

// ===== HELPER: CHECK IF SQUARE IS VALID =====
function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ===== AI OPPONENT LOGIC =====

// Piece values for material evaluation
const PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000
};

// Piece-square tables for positional evaluation
const PIECE_SQUARE_TABLES = {
    pawn: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    knight: [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    bishop: [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    rook: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    queen: [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    king: [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
    ]
};

// Evaluate board position
function evaluatePosition(board, color) {
    let score = 0;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!piece) continue;

            // Material value
            let pieceValue = PIECE_VALUES[piece.type];

            // Positional bonus
            const tableRow = piece.color === 'white' ? 7 - row : row;
            const positionBonus = PIECE_SQUARE_TABLES[piece.type][tableRow][col];

            const totalValue = pieceValue + positionBonus;

            if (piece.color === color) {
                score += totalValue;
            } else {
                score -= totalValue;
            }
        }
    }

    return score;
}

// Get all possible moves for a color
function getAllPossibleMoves(board, color) {
    const moves = [];

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const pieceMoves = getLegalMovesForBoard(board, row, col);
                pieceMoves.forEach(move => {
                    moves.push({
                        from: { row, col },
                        to: { row: move.row, col: move.col },
                        moveData: move
                    });
                });
            }
        }
    }

    return moves;
}

// Get legal moves for a piece on a specific board state
function getLegalMovesForBoard(board, row, col) {
    // Temporarily swap board to use existing move generation
    const originalBoard = gameState.board;
    gameState.board = board;

    const moves = getLegalMoves(row, col);

    gameState.board = originalBoard;
    return moves;
}

// Make a move on a board copy
function makeMoveOnBoard(board, fromRow, fromCol, toRow, toCol) {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[fromRow][fromCol];

    // Handle en passant (simplified - doesn't track en passant target)
    // Handle castling (simplified)

    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    return newBoard;
}

// Minimax algorithm with alpha-beta pruning
function minimax(board, depth, alpha, beta, isMaximizing, aiColor) {
    // Base case: depth 0 or game over
    if (depth === 0) {
        return evaluatePosition(board, aiColor);
    }

    const currentColor = isMaximizing ? aiColor : (aiColor === 'white' ? 'black' : 'white');
    const moves = getAllPossibleMoves(board, currentColor);

    if (moves.length === 0) {
        // Game over or no moves
        return evaluatePosition(board, aiColor);
    }

    if (isMaximizing) {
        let maxEval = -Infinity;

        for (const move of moves) {
            const newBoard = makeMoveOnBoard(board, move.from.row, move.from.col, move.to.row, move.to.col);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);

            if (beta <= alpha) {
                break; // Beta cutoff
            }
        }

        return maxEval;
    } else {
        let minEval = Infinity;

        for (const move of moves) {
            const newBoard = makeMoveOnBoard(board, move.from.row, move.from.col, move.to.row, move.to.col);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);

            if (beta <= alpha) {
                break; // Alpha cutoff
            }
        }

        return minEval;
    }
}

// Get best move for AI
function getBestMove() {
    const aiColor = 'black';
    const moves = getAllPossibleMoves(gameState.board, aiColor);

    if (moves.length === 0) return null;

    // Determine search depth based on difficulty
    let depth;
    switch (gameState.aiDifficulty) {
        case 'easy': depth = 2; break;
        case 'medium': depth = 3; break;
        case 'hard': depth = 4; break;
        default: depth = 3;
    }

    let bestMove = null;
    let bestValue = -Infinity;

    // Evaluate each possible move
    for (const move of moves) {
        const newBoard = makeMoveOnBoard(gameState.board, move.from.row, move.from.col, move.to.row, move.to.col);
        const moveValue = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiColor);

        if (moveValue > bestValue) {
            bestValue = moveValue;
            bestMove = move;
        }
    }

    return bestMove;
}

// Execute computer move
function makeComputerMove() {
    gameState.isAiThinking = true;
    showAlert('AI is thinking...', 'ai-thinking');

    // Use setTimeout to prevent UI freeze
    setTimeout(() => {
        const bestMove = getBestMove();

        if (bestMove) {
            // Select the piece
            gameState.selectedSquare = [bestMove.from.row, bestMove.from.col];
            gameState.legalMoves = getLegalMoves(bestMove.from.row, bestMove.from.col);

            // Make the move
            makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
            clearSelection();
        }

        gameState.isAiThinking = false;
    }, 100);
}

// ===== RESET GAME =====
function resetGame() {
    // Preserve game mode settings
    const currentGameMode = gameState.gameMode;
    const currentDifficulty = gameState.aiDifficulty;

    gameState = {
        board: [],
        currentTurn: 'white',
        selectedSquare: null,
        legalMoves: [],
        gameStatus: 'active',
        moveHistory: [],
        enPassantTarget: null,
        castlingRights: {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        },
        kingMoved: { white: false, black: false },
        rookMoved: {
            white: { kingSide: false, queenSide: false },
            black: { kingSide: false, queenSide: false }
        },
        gameMode: currentGameMode,
        aiDifficulty: currentDifficulty,
        isAiThinking: false
    };

    initializeBoard();
    renderBoard();
    clearAlerts();
}

// ===== INITIALIZE GAME =====
document.addEventListener('DOMContentLoaded', () => {
    initializeBoard();
    renderBoard();

    // Reset button handler
    document.getElementById('resetBtn').addEventListener('click', resetGame);

    // Game mode selection handlers
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    gameModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameState.gameMode = e.target.value;

            // Show/hide difficulty selector
            const difficultySection = document.getElementById('difficultySection');
            if (e.target.value === 'pvc') {
                difficultySection.style.display = 'block';
            } else {
                difficultySection.style.display = 'none';
            }

            // Reset game when mode changes
            resetGame();
        });
    });

    // Difficulty selection handlers
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    difficultyRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameState.aiDifficulty = e.target.value;
            // Reset game when difficulty changes
            resetGame();
        });
    });
});

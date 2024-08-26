// Game Page Main Component
"use client"
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Player, Move, Piece } from '../types';
import { motion } from 'framer-motion';

const Grid: React.FC = () => {
  const { id } = useParams(); // Gets the ID of the gane from the URL

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('A'); // Stores the current player
  const [playerSide, setPlayerSide] = useState<Player | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null); 
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isSpectator, setIsSpectator] = useState<boolean>(false);

  // Initialisation of the game, when the page is opened
  useEffect(() => {
    const socket = new WebSocket(`ws://${window.location.hostname}:3000`);
    setWs(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', gameId: id }));
    };
    // Recieves Messages from the server, Handles the states accordingly
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'joined') {
        setPlayerSide(data.player);
        setIsSpectator(false);
      } else if (data.type === 'spectate') {
        setIsSpectator(true);
        setCurrentPlayer(data.currentPlayer);
        setPieces(data.pieces);
      } else if (data.type === 'start' || data.type === 'update') {
        setCurrentPlayer(data.currentPlayer);
        setPieces(data.pieces);
        if (data.winner) {
          setWinner(data.winner);
        }
      } else if (data.type === 'full') {
        alert('Game is full, you are now spectating');
        setIsSpectator(true);
      } else if (data.type === 'opponent_left') {
        alert('Opponent left the game');
      } else if (data.type === 'player_left') {
        alert('A player left the game');
      }
    };

    return () => {
      socket.close();
    };
  }, [id]);

  const calculatePossibleMoves = (piece: Piece): Move[] => {
    const { type, position, player } = piece;
    const moves: Move[] = [];
    const row = Math.floor(position / 5);
    const col = position % 5;
  
    const addMove = (newRow: number, newCol: number, kills: number[] = []) => {
      if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
        const newPos = newRow * 5 + newCol;
        moves.push({ position: newPos, kills });
      }
    };
  
    const addMoveWithKill = (startRow: number, startCol: number, rowStep: number, colStep: number, maxSteps: number) => {
      let kills: number[] = [];
      for (let i = 1; i <= maxSteps; i++) {
        const newRow = startRow + rowStep * i;
        const newCol = startCol + colStep * i;
        if (newRow < 0 || newRow >= 5 || newCol < 0 || newCol >= 5) break;
       
        const newPos = newRow * 5 + newCol;
        const occupyingPiece = pieces.find(p => p.position === newPos);
       
        if (occupyingPiece) {
          if (occupyingPiece.player !== player) {
            kills.push(newPos);
            addMove(newRow, newCol, kills);
          }
          break;
        } else {
          addMove(newRow, newCol, kills);
        }
      }
    };
  
    switch (type) {
      case 'Pawn':
        // Pawn moves one block in any direction
        addMove(row - 1, col); // Up
        addMove(row + 1, col); // Down
        addMove(row, col - 1); // Left
        addMove(row, col + 1); // Right
        break;
  
      case 'Hero1':
        // Hero1 moves two blocks straight in any direction and kills any opponent in its path
        addMoveWithKill(row, col, -1, 0, 2); // Up
        addMoveWithKill(row, col, 1, 0, 2);  // Down
        addMoveWithKill(row, col, 0, -1, 2); // Left
        addMoveWithKill(row, col, 0, 1, 2);  // Right
        break;
  
      case 'Hero2':
        // Hero2 moves two blocks diagonally in any direction and kills any opponent in its path
        addMoveWithKill(row, col, -1, -1, 2); // Up-Left
        addMoveWithKill(row, col, -1, 1, 2);  // Up-Right
        addMoveWithKill(row, col, 1, -1, 2);  // Down-Left
        addMoveWithKill(row, col, 1, 1, 2);   // Down-Right
        break;
  
      case 'Hero3':
        // Hero3 moves 2 steps straight and one to the side, kills only at the landing position
        const hero3Moves = [
          [-2, -1], [-2, 1], [2, -1], [2, 1], // Vertical L shapes
          [-1, -2], [1, -2], [-1, 2], [1, 2]  // Horizontal L shapes
        ];
       
        hero3Moves.forEach(([rowStep, colStep]) => {
          const newRow = row + rowStep;
          const newCol = col + colStep;
          if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
            const newPos = newRow * 5 + newCol;
            const occupyingPiece = pieces.find(p => p.position === newPos);
            if (!occupyingPiece) {
              addMove(newRow, newCol);
            } else if (occupyingPiece.player !== player) {
              addMove(newRow, newCol, [newPos]);
            }
          }
        });
        break;
    }
  
    return moves;
  };

  const handlePieceClick = (piece: Piece) => {
    if (!isSpectator && piece.player === currentPlayer && piece.player === playerSide) {
      setSelectedPiece(piece);
      setPossibleMoves(calculatePossibleMoves(piece));
    }
  };

  const handleMoveClick = (move: Move) => {
    if (!isSpectator && selectedPiece && ws) {
      const newPieces = pieces.map(p =>
        p.id === selectedPiece.id ? { ...p, position: move.position } :
        (move.kills.includes(p.position) ? { ...p, position: -1 } : p)
      ).filter(p => p.position !== -1);
  
      const newCurrentPlayer = currentPlayer === 'A' ? 'B' : 'A';
  
      setPieces(newPieces);
      setCurrentPlayer(newCurrentPlayer);
      setSelectedPiece(null);
      setPossibleMoves([]);
  
      ws.send(JSON.stringify({
        type: 'move',
        gameId: id,
        pieces: newPieces,
        currentPlayer: newCurrentPlayer
      }));
    }
  };

  const renderCell = (index: number) => {
    const piece = pieces.find((p) => p.position === index);
    const possibleMove = possibleMoves.find(m => m.position === index);

    return (
      <motion.div
        key={index}
        className={`w-20 h-20 border-2 border-purple-400 flex items-center justify-center cursor-pointer rounded-lg
          ${piece ? (piece.player === 'A' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-red-400 to-red-600') : 'bg-gradient-to-br from-gray-700 to-gray-900'}
          ${selectedPiece?.position === index ? 'ring-4 ring-yellow-400' : ''}
          ${possibleMove ? (possibleMove.kills.length > 0 ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-yellow-300 to-yellow-500') : ''}`}
        onClick={() => piece ? handlePieceClick(piece) : possibleMove && handleMoveClick(possibleMove)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {piece && (
          <motion.div
            className="text-2xl font-bold text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            {getPieceEmoji(piece.type)}
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Added to make the game fun!
  const getPieceEmoji = (type: string) => {
    switch (type) {
      case 'Pawn': return '♟️';
      case 'Hero1': return '🦸';
      case 'Hero2': return '🦹';
      case 'Hero3': return '🧙';
      default: return '';
    }
  };

  const renderGameOverScreen = () => (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="bg-gradient-to-br from-purple-500 to-indigo-600 p-8 rounded-lg text-white text-center"
        initial={{ scale: 0.5, y: -100 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <h2 className="text-4xl mb-4 font-bold">Game Over</h2>
        <p className="text-2xl mb-6">
          {isSpectator ? `Player ${winner} Won!` : (winner === playerSide ? 'You Won! 🎉' : 'You Lost! 😢')}
        </p>
        <motion.button
          className="bg-yellow-400 text-black px-6 py-3 rounded-full text-xl font-bold"
          onClick={() => window.location.href = '/'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          Back to Home
        </motion.button>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 text-white min-h-screen p-8">
      <motion.div
        className="mb-6 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        Current Player: {currentPlayer}
      </motion.div>
      <motion.div
        className="mb-6 text-2xl font-semibold"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
      >
        {isSpectator ? 'Spectating' : `Your Side: ${playerSide || 'Waiting for opponent'}`}
      </motion.div>
      <motion.div
        className="grid grid-cols-5 gap-2 mb-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.4 }}
      >
        {[...Array(25)].map((_, i) => renderCell(i))}
      </motion.div>
      <motion.div
        className="mb-4 text-xl"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.6 }}
      >
        Selected: {selectedPiece ? getPieceEmoji(selectedPiece.type) : 'None'}
      </motion.div>
      {winner && renderGameOverScreen()}
    </div>
  );
};

export default Grid;
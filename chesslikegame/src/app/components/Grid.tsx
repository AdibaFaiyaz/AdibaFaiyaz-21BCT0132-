"use client"
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Player, Move, Piece } from '../types';

const Grid: React.FC = () => {
  const { id } = useParams();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('A');
  const [playerSide, setPlayerSide] = useState<Player | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isSpectator, setIsSpectator] = useState<boolean>(false);

  useEffect(() => {
    const socket = new WebSocket(`ws://${window.location.hostname}:3000`);
    setWs(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', gameId: id }));
    };

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
        const occupyingPiece = pieces.find(p => p.position === newPos);
        if (!occupyingPiece || (occupyingPiece.player !== player)) {
          moves.push({ position: newPos, kills: kills });
        }
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
  
    const addHero3Move = (newRow: number, newCol: number) => {
      if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
        const newPos = newRow * 5 + newCol;
        const occupyingPiece = pieces.find(p => p.position === newPos);
        if (!occupyingPiece) {
          addMove(newRow, newCol);
        } else if (occupyingPiece.player !== player) {
          addMove(newRow, newCol, [newPos]);
        }
      }
    };
  
    switch (type) {
      case 'Pawn':
        addMove(row - 1, col);
        addMove(row + 1, col);
        addMove(row, col - 1);
        addMove(row, col + 1);
        break;
      case 'Hero1':
        addMoveWithKill(row, col, -1, 0, 2); // Up
        addMoveWithKill(row, col, 1, 0, 2);  // Down
        addMoveWithKill(row, col, 0, -1, 2); // Left
        addMoveWithKill(row, col, 0, 1, 2);  // Right
        break;
      case 'Hero2':
        addMoveWithKill(row, col, -1, -1, 2); // Up-Left
        addMoveWithKill(row, col, -1, 1, 2);  // Up-Right
        addMoveWithKill(row, col, 1, -1, 2);  // Down-Left
        addMoveWithKill(row, col, 1, 1, 2);   // Down-Right
        break;
      case 'Hero3':
        // Vertical movements
        addHero3Move(row - 2, col - 1);
        addHero3Move(row - 2, col + 1);
        addHero3Move(row + 2, col - 1);
        addHero3Move(row + 2, col + 1);
        // Horizontal movements
        addHero3Move(row - 1, col - 2);
        addHero3Move(row + 1, col - 2);
        addHero3Move(row - 1, col + 2);
        addHero3Move(row + 1, col + 2);
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
      <div
        key={index}
        className={`w-16 h-16 border border-gray-600 flex items-center justify-center cursor-pointer
          ${piece ? (piece.player === 'A' ? 'bg-blue-500' : 'bg-red-500') : ''}
          ${selectedPiece?.position === index ? 'ring-2 ring-yellow-400' : ''}
          ${possibleMove ? (possibleMove.kills.length > 0 ? 'bg-red-300' : 'bg-green-300') : ''}`}
        onClick={() => piece ? handlePieceClick(piece) : possibleMove && handleMoveClick(possibleMove)}
      >
        {piece?.id}
      </div>
    );
  };

  const renderGameOverScreen = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg text-black text-center">
        <h2 className="text-3xl mb-4">Game Over</h2>
        <p className="text-xl mb-4">
          {isSpectator ? `Player ${winner} Won!` : (winner === playerSide ? 'You Won!' : 'You Lost!')}
        </p>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => window.location.href = '/'}
        >
          Back to Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 text-white min-h-screen">
      <div className="mb-4 text-xl">Current Player: {currentPlayer}</div>
      <div className="mb-4 text-xl">
        {isSpectator ? 'Spectating' : `Your Side: ${playerSide || 'Waiting for opponent'}`}
      </div>
      <div className="grid grid-cols-5 gap-1 mb-4">
        {[...Array(25)].map((_, i) => renderCell(i))}
      </div>
      <div className="mb-4">Selected: {selectedPiece?.id || 'None'}</div>
      {winner && renderGameOverScreen()}
    </div>
  );
};

export default Grid;
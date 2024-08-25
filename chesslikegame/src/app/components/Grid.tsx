"use client"
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Piece, Player, Move } from '../types';

const Grid: React.FC = () => {
  const { id } = useParams();

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('A');
  const [playerSide, setPlayerSide] = useState<Player | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);

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
      } else if (data.type === 'start' || data.type === 'update') {
        setCurrentPlayer(data.currentPlayer);
        setPieces(data.pieces);
      } else if (data.type === 'full') {
        alert('Game is full');
      } else if (data.type === 'opponent_left') {
        alert('Opponent left the game');
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
        const occupyingPiece = pieces.find((p) => p.position === newPos);
        if (!occupyingPiece || (type !== 'Pawn' && occupyingPiece.player !== player)) {
          moves.push({ position: newPos, kills });
        }
      }
    };
  
    const addMoveWithKill = (
      startRow: number,
      startCol: number,
      rowStep: number,
      colStep: number,
      maxSteps: number
    ) => {
      let kills: number[] = [];
      for (let i = 1; i <= maxSteps; i++) {
        const newRow = startRow + rowStep * i;
        const newCol = startCol + colStep * i;
        if (newRow < 0 || newRow >= 5 || newCol < 0 || newCol >= 5) break;
  
        const newPos = newRow * 5 + newCol;
        const occupyingPiece = pieces.find((p) => p.position === newPos);
  
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
        addMove(row - 1, col);
        addMove(row + 1, col);
        addMove(row, col - 1);
        addMove(row, col + 1);
        break;
      case 'Hero1':
        addMoveWithKill(row, col, -1, 0, 2); // Up
        addMoveWithKill(row, col, 1, 0, 2);  // Down
        break;
      case 'Hero2':
        addMoveWithKill(row, col, -1, -1, 2); // Up-Left
        addMoveWithKill(row, col, -1, 1, 2);  // Up-Right
        addMoveWithKill(row, col, 1, -1, 2);  // Down-Left
        addMoveWithKill(row, col, 1, 1, 2);   // Down-Right
        break;
    }
  
    return moves;
  };  

  const handlePieceClick = (piece: Piece) => {
    if (piece.player === currentPlayer && piece.player === playerSide) {
      setSelectedPiece(piece);
      setPossibleMoves(calculatePossibleMoves(piece));
    }
  };

  const handleMoveClick = (move: Move) => {
    if (selectedPiece && ws) {
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
    const possibleMove = possibleMoves.find((m) => m.position === index);
   
    return (
      <div
        key={index}
        className={`w-16 h-16 border border-gray-600 flex items-center justify-center cursor-pointer ${
          piece ? (piece.player === 'A' ? 'bg-blue-500' : 'bg-red-500') : ''
        } ${
          selectedPiece?.position === index ? 'ring-2 ring-yellow-400' : ''
        } ${
          possibleMove ? (possibleMove.kills.length > 0 ? 'bg-red-300' : 'bg-green-300') : ''
        }`}
        onClick={() =>
          piece ? handlePieceClick(piece) : possibleMove && handleMoveClick(possibleMove)
        }
      >
        {piece?.id}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 text-white min-h-screen">
      <div className="mb-4 text-xl">Current Player: {playerSide || 'Waiting for opponent'}</div>
      <div className="mb-4 text-xl">Your Side: {playerSide || 'Waiting for opponent'}</div>
      <div className="grid grid-cols-5 gap-1 mb-4">
        {[...Array(25)].map((_, i) => renderCell(i))}
      </div>
      <div className="mb-4">Selected: {selectedPiece?.id || 'None'}</div>
    </div>
  );
};

export default Grid;
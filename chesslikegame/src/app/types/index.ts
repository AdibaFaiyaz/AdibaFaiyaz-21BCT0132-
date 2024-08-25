export type Player = 'A' | 'B';
export type PieceType = 'Pawn' | 'Hero1' | 'Hero2';

export interface Piece {
  id: string;
  player: Player;
  type: PieceType;
  position: number;
}

export interface Move {
  position: number;
  kills: number[];
}
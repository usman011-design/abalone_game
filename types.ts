
export type Player = 'black' | 'white';

export interface AxialCoord {
  q: number;
  r: number;
}

export type BoardState = Map<string, Player>;

export interface Move {
  marbles: AxialCoord[];
  direction: AxialCoord;
  type: 'inline' | 'broadside';
}

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  score: {
    black: number; // Opponent marbles pushed off by black
    white: number; // Opponent marbles pushed off by white
  };
  winner: Player | null;
  history: Move[];
}

export const DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // North-East
  { q: 0, r: -1 },  // North-West
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // South-West
  { q: 0, r: 1 },   // South-East
];

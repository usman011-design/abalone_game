
import { Player, AxialCoord, BoardState, GameState, DIRECTIONS } from '../types';
import { coordToKey, addCoords, subCoords, isValidPos, areEqual } from '../utils/hexUtils';

export const INITIAL_SETUP: BoardState = new Map();

const setupMarbles = () => {
  // Traditional Abalone Standard Setup
  // Black: r=4, 3, 2
  for (let q = -4; q <= 0; q++) INITIAL_SETUP.set(coordToKey({ q, r: 4 }), 'black');
  for (let q = -4; q <= 1; q++) INITIAL_SETUP.set(coordToKey({ q, r: 3 }), 'black');
  for (let q = -1; q <= 1; q++) INITIAL_SETUP.set(coordToKey({ q, r: 2 }), 'black');

  // White: r=-4, -3, -2
  for (let q = 0; q <= 4; q++) INITIAL_SETUP.set(coordToKey({ q, r: -4 }), 'white');
  for (let q = -1; q <= 4; q++) INITIAL_SETUP.set(coordToKey({ q, r: -3 }), 'white');
  for (let q = -1; q <= 1; q++) INITIAL_SETUP.set(coordToKey({ q, r: -2 }), 'white');
};
setupMarbles();

export const validateMove = (
  state: GameState,
  marbles: AxialCoord[],
  target: AxialCoord
): { valid: boolean; error?: string; direction?: AxialCoord } => {
  if (marbles.length === 0) return { valid: false, error: 'No marbles selected' };
  if (marbles.length > 3) return { valid: false, error: 'Maximum 3 marbles' };

  // Find the direction from selection to target
  let direction: AxialCoord | null = null;
  let fromMarble: AxialCoord | null = null;

  for (const m of marbles) {
    const diff = subCoords(target, m);
    if (DIRECTIONS.some(d => areEqual(d, diff))) {
      direction = diff;
      fromMarble = m;
      break;
    }
  }

  if (!direction) return { valid: false, error: 'Target must be adjacent to selection' };

  // Check if selection is aligned with the direction vector (In-line movement)
  const isInline = marbles.length === 1 || marbles.every(m => {
    const diff = subCoords(m, fromMarble!);
    // A marble is in-line if its position relative to the move-leader is a multiple of the direction vector
    return (diff.q === 0 && diff.r === 0) ||
           (diff.q === direction!.q && diff.r === direction!.r) ||
           (diff.q === -direction!.q && diff.r === -direction!.r) ||
           (diff.q === 2 * direction!.q && diff.r === 2 * direction!.r) ||
           (diff.q === -2 * direction!.q && diff.r === -2 * direction!.r);
  });

  // ENFORCEMENT: Groups (2 or 3) MUST move in-line (along their own axis)
  if (marbles.length > 1 && !isInline) {
    return { valid: false, error: 'Columns can only move along their own axis' };
  }

  if (isInline) {
    // Sort to find the leading marble in the direction of movement
    const sorted = [...marbles].sort((a, b) => {
      const scoreA = a.q * direction!.q + a.r * direction!.r + (a.q + a.r) * (direction!.q + direction!.r);
      const scoreB = b.q * direction!.q + b.r * direction!.r + (b.q + b.r) * (direction!.q + direction!.r);
      return scoreB - scoreA;
    });

    const leader = sorted[0];
    const nextPos = addCoords(leader, direction);
    const occupant = state.board.get(coordToKey(nextPos));

    if (!occupant) return { valid: true, direction };
    if (occupant === state.currentPlayer) return { valid: false, error: 'Blocked by your own marble' };
    if (marbles.length === 1) return { valid: false, error: 'Single marble cannot push' };

    // Push (Sumito) logic
    let oppCount = 0;
    let scanPos = nextPos;
    const opponent = occupant;

    while (state.board.get(coordToKey(scanPos)) === opponent) {
      oppCount++;
      scanPos = addCoords(scanPos, direction);
    }

    if (oppCount >= marbles.length) return { valid: false, error: 'Need majority to push' };
    if (state.board.get(coordToKey(scanPos)) === state.currentPlayer) return { valid: false, error: 'Blocked by your own marble behind opponent' };
    
    return { valid: true, direction };
  } else {
    // Broadside - Only allowed for single marbles in this simplified model
    // or if you want to keep standard rules, but user explicitly asked to restrict them.
    const dest = addCoords(marbles[0], direction);
    if (!isValidPos(dest)) return { valid: false, error: 'Out of bounds' };
    if (state.board.has(coordToKey(dest))) return { valid: false, error: 'Space occupied' };
    return { valid: true, direction };
  }
};

export const applyMove = (state: GameState, marbles: AxialCoord[], target: AxialCoord): GameState => {
  const validation = validateMove(state, marbles, target);
  if (!validation.valid || !validation.direction) return state;

  const direction = validation.direction;
  const newBoard = new Map(state.board);
  const newScore = { ...state.score };

  const sorted = [...marbles].sort((a, b) => {
    const scoreA = a.q * direction.q + a.r * direction.r + (a.q + a.r) * (direction.q + direction.r);
    const scoreB = b.q * direction.q + b.r * direction.r + (b.q + b.r) * (direction.q + direction.r);
    return scoreB - scoreA;
  });

  const leader = sorted[0];
  const nextPos = addCoords(leader, direction);
  const firstOccupant = state.board.get(coordToKey(nextPos));

  if (firstOccupant && firstOccupant !== state.currentPlayer) {
    const oppMarbles: AxialCoord[] = [];
    let scanPos = nextPos;
    while (state.board.get(coordToKey(scanPos)) === firstOccupant) {
      oppMarbles.push({ ...scanPos });
      scanPos = addCoords(scanPos, direction);
    }
    [...oppMarbles].reverse().forEach(om => {
      newBoard.delete(coordToKey(om));
      const pushedTo = addCoords(om, direction);
      if (isValidPos(pushedTo)) {
        newBoard.set(coordToKey(pushedTo), firstOccupant);
      } else {
        newScore[state.currentPlayer]++;
      }
    });
  }

  marbles.forEach(m => newBoard.delete(coordToKey(m)));
  marbles.forEach(m => {
    newBoard.set(coordToKey(addCoords(m, direction)), state.currentPlayer);
  });

  const nextPlayer: Player = state.currentPlayer === 'black' ? 'white' : 'black';
  let winner: Player | null = null;
  if (newScore.black >= 6) winner = 'black';
  if (newScore.white >= 6) winner = 'white';

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    score: newScore,
    winner,
    history: [...state.history, { marbles, direction, type: 'inline' }]
  };
};

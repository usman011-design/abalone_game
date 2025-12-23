
import { Player, AxialCoord, BoardState, GameState, DIRECTIONS, Move } from '../types';
import { coordToKey, addCoords, subCoords, isValidPos, areEqual, getDistance } from '../utils/hexUtils';

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

  // Find which direction we are moving. 
  // Any marble in the selection must be adjacent to the target to define the direction.
  let direction: AxialCoord | null = null;
  let leader: AxialCoord | null = null;

  for (const marble of marbles) {
    const diff = subCoords(target, marble);
    if (DIRECTIONS.some(d => areEqual(d, diff))) {
      direction = diff;
      leader = marble;
      break;
    }
  }

  if (!direction || !leader) return { valid: false, error: 'Target must be adjacent to a selected marble' };

  // Check if it's an inline move: 
  // All marbles must be on the same line as the direction vector from each other.
  const isInline = marbles.length === 1 || marbles.every(m => {
    const diff = subCoords(m, leader!);
    // In-line if the difference is a multiple of the direction vector
    return (diff.q === 0 && diff.r === 0) || 
           (diff.q === direction!.q && diff.r === direction!.r) ||
           (diff.q === -direction!.q && diff.r === -direction!.r) ||
           (diff.q === 2 * direction!.q && diff.r === 2 * direction!.r) ||
           (diff.q === -2 * direction!.q && diff.r === -2 * direction!.r);
  });

  if (!isInline) {
    // Broadside (Side-step)
    for (const marble of marbles) {
      const nextPos = addCoords(marble, direction);
      if (!isValidPos(nextPos)) return { valid: false, error: 'Cannot side-step off board' };
      if (state.board.has(coordToKey(nextPos))) return { valid: false, error: 'All side-step targets must be empty' };
    }
    return { valid: true, direction };
  } else {
    // Inline move - find the "actual" lead marble relative to direction
    const sorted = [...marbles].sort((a, b) => {
      // Sort so that the marble furthest in 'direction' is first
      const valA = a.q * direction!.q + a.r * direction!.r + (a.q + a.r) * (direction!.q + direction!.r);
      const valB = b.q * direction!.q + b.r * direction!.r + (b.q + b.r) * (direction!.q + direction!.r);
      return valB - valA;
    });
    
    const trueLeader = sorted[0];
    const nextPos = addCoords(trueLeader, direction);

    // Rule: Single marble cannot push
    const occupant = state.board.get(coordToKey(nextPos));
    if (!occupant) return { valid: true, direction };
    
    if (occupant === state.currentPlayer) return { valid: false, error: 'Blocked by your own marble' };

    // Opponent marble - check Sumito power
    if (marbles.length === 1) return { valid: false, error: 'A single marble cannot push' };

    let oppCount = 0;
    let scanPos = nextPos;
    const opponent = occupant;

    while (state.board.get(coordToKey(scanPos)) === opponent) {
      oppCount++;
      scanPos = addCoords(scanPos, direction);
    }

    if (oppCount >= marbles.length) return { valid: false, error: 'Not enough power to push (need majority)' };
    
    // Check what's behind the opponent's line
    const afterOpp = state.board.get(coordToKey(scanPos));
    if (afterOpp === state.currentPlayer) return { valid: false, error: 'Blocked by your own marble behind opponent' };
    
    return { valid: true, direction };
  }
};

export const applyMove = (state: GameState, marbles: AxialCoord[], target: AxialCoord): GameState => {
  const validation = validateMove(state, marbles, target);
  if (!validation.valid || !validation.direction) return state;

  const direction = validation.direction;
  const newBoard = new Map(state.board);
  let newScore = { ...state.score };

  // Determine if it was an inline push
  // We re-sort to ensure we process from the "front" of the push
  const sorted = [...marbles].sort((a, b) => {
    const valA = a.q * direction.q + a.r * direction.r + (a.q + a.r) * (direction.q + direction.r);
    const valB = b.q * direction.q + b.r * direction.r + (b.q + b.r) * (direction.q + direction.r);
    return valB - valA;
  });

  const leader = sorted[0];
  const nextPos = addCoords(leader, direction);
  const occupant = state.board.get(coordToKey(nextPos));

  // If there's an opponent to push
  if (occupant && occupant !== state.currentPlayer) {
    let oppMarbles: AxialCoord[] = [];
    let scanPos = nextPos;
    while (state.board.get(coordToKey(scanPos)) === occupant) {
      oppMarbles.push(scanPos);
      scanPos = addCoords(scanPos, direction);
    }
    
    // Move opponent marbles from furthest to closest
    oppMarbles.reverse().forEach(om => {
      newBoard.delete(coordToKey(om));
      const pushTo = addCoords(om, direction);
      if (isValidPos(pushTo)) {
        newBoard.set(coordToKey(pushTo), occupant);
      } else {
        newScore[state.currentPlayer]++;
      }
    });
  }

  // Move own marbles
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
    history: [...state.history, { marbles, direction, type: 'inline' }] // Simplified history
  };
};

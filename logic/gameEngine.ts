import { Player, AxialCoord, BoardState, GameState, DIRECTIONS } from '../types';
import {
  coordToKey,
  addCoords,
  subCoords,
  isValidPos,
  areEqual
} from '../utils/hexUtils';

/* ----------------------------------
   INITIAL BOARD SETUP
---------------------------------- */

export const INITIAL_SETUP: BoardState = new Map();

const setupMarbles = () => {
  // Black
  for (let q = -4; q <= 0; q++) INITIAL_SETUP.set(coordToKey({ q, r: 4 }), 'black');
  for (let q = -4; q <= 1; q++) INITIAL_SETUP.set(coordToKey({ q, r: 3 }), 'black');
  for (let q = -1; q <= 1; q++) INITIAL_SETUP.set(coordToKey({ q, r: 2 }), 'black');

  // White
  for (let q = 0; q <= 4; q++) INITIAL_SETUP.set(coordToKey({ q, r: -4 }), 'white');
  for (let q = -1; q <= 4; q++) INITIAL_SETUP.set(coordToKey({ q, r: -3 }), 'white');
  for (let q = -1; q <= 1; q++) INITIAL_SETUP.set(coordToKey({ q, r: -2 }), 'white');
};

setupMarbles();

/* ----------------------------------
   HELPERS
---------------------------------- */

// STRICT group axis detection
const getGroupAxis = (marbles: AxialCoord[]): AxialCoord | null => {
  if (marbles.length < 2) return null;

  const base = marbles[0];
  const diffs = marbles.slice(1).map(m => subCoords(m, base));

  for (const d of DIRECTIONS) {
    const opposite = { q: -d.q, r: -d.r };
    const aligned = diffs.every(diff =>
      areEqual(diff, d) || areEqual(diff, opposite)
    );
    if (aligned) return d;
  }

  return null;
};

/* ----------------------------------
   MOVE VALIDATION
---------------------------------- */

export const validateMove = (
  state: GameState,
  marbles: AxialCoord[],
  target: AxialCoord
): { valid: boolean; error?: string; direction?: AxialCoord } => {

  if (marbles.length === 0)
    return { valid: false, error: 'No marbles selected' };

  if (marbles.length > 3)
    return { valid: false, error: 'Maximum 3 marbles allowed' };

  const groupAxis = getGroupAxis(marbles);

  // Detect move direction (must be adjacent)
  let direction: AxialCoord | null = null;
  for (const m of marbles) {
    const diff = subCoords(target, m);
    if (DIRECTIONS.some(d => areEqual(d, diff))) {
      direction = diff;
      break;
    }
  }

  if (!direction)
    return { valid: false, error: 'Target must be adjacent' };

  /* ----------------------------------
     🔒 HARD DIRECTION LOCK (FIX)
  ---------------------------------- */

  if (groupAxis) {
    const forward = groupAxis;
    const backward = { q: -groupAxis.q, r: -groupAxis.r };

    const allowed =
      areEqual(direction, forward) ||
      areEqual(direction, backward);

    if (!allowed) {
      return {
        valid: false,
        error: 'Marbles can move only along their alignment'
      };
    }
  }

  /* ----------------------------------
     INLINE / PUSH LOGIC ONLY
  ---------------------------------- */

  const sorted = [...marbles].sort((a, b) =>
    (b.q * direction.q + b.r * direction.r) -
    (a.q * direction.q + a.r * direction.r)
  );

  const leader = sorted[0];
  const nextPos = addCoords(leader, direction);
  const occupant = state.board.get(coordToKey(nextPos));

  // Empty → normal move
  if (!occupant)
    return { valid: true, direction };

  // Own marble blocking
  if (occupant === state.currentPlayer)
    return { valid: false, error: 'Blocked by your own marble' };

  // Cannot push with single marble
  if (marbles.length === 1)
    return { valid: false, error: 'Single marble cannot push' };

  // Count opponent marbles
  let oppCount = 0;
  let scan = nextPos;
  while (state.board.get(coordToKey(scan)) === occupant) {
    oppCount++;
    scan = addCoords(scan, direction);
  }

  if (oppCount >= marbles.length)
    return { valid: false, error: 'Not enough power to push' };

  if (state.board.get(coordToKey(scan)) === state.currentPlayer)
    return { valid: false, error: 'Blocked behind opponent' };

  return { valid: true, direction };
};

/* ----------------------------------
   APPLY MOVE
---------------------------------- */

export const applyMove = (
  state: GameState,
  marbles: AxialCoord[],
  target: AxialCoord
): GameState => {

  const validation = validateMove(state, marbles, target);
  if (!validation.valid || !validation.direction) return state;

  const direction = validation.direction;
  const newBoard = new Map(state.board);
  const newScore = { ...state.score };

  const sorted = [...marbles].sort((a, b) =>
    (b.q * direction.q + b.r * direction.r) -
    (a.q * direction.q + a.r * direction.r)
  );

  const leader = sorted[0];
  const nextPos = addCoords(leader, direction);
  const occupant = state.board.get(coordToKey(nextPos));

  // Push opponent
  if (occupant && occupant !== state.currentPlayer) {
    let opps: AxialCoord[] = [];
    let scan = nextPos;

    while (state.board.get(coordToKey(scan)) === occupant) {
      opps.push(scan);
      scan = addCoords(scan, direction);
    }

    opps.reverse().forEach(o => {
      newBoard.delete(coordToKey(o));
      const pushed = addCoords(o, direction);
      if (isValidPos(pushed)) {
        newBoard.set(coordToKey(pushed), occupant);
      } else {
        newScore[state.currentPlayer]++;
      }
    });
  }

  // Move own marbles
  marbles.forEach(m => newBoard.delete(coordToKey(m)));
  marbles.forEach(m =>
    newBoard.set(coordToKey(addCoords(m, direction)), state.currentPlayer)
  );

  const nextPlayer: Player =
    state.currentPlayer === 'black' ? 'white' : 'black';

  const winner =
    newScore.black >= 6 ? 'black' :
    newScore.white >= 6 ? 'white' : null;

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    score: newScore,
    winner,
    history: [...state.history, { marbles, direction, type: 'inline' }]
  };
};

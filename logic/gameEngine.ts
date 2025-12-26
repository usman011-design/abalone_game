import { Player, AxialCoord, BoardState, GameState, DIRECTIONS } from '../types';
import {
  coordToKey,
  addCoords,
  subCoords,
  isValidPos,
  areEqual
} from '../utils/hexUtils';

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

// Detect group axis (for 2–3 marbles)
const getGroupAxis = (marbles: AxialCoord[]): AxialCoord | null => {
  if (marbles.length < 2) return null;
  const diff = subCoords(marbles[1], marbles[0]);

  return (
    DIRECTIONS.find(d =>
      areEqual(d, diff) ||
      areEqual(d, { q: -diff.q, r: -diff.r })
    ) || null
  );
};

// Valid perpendicular sidestep directions ONLY
const getSideStepDirections = (axis: AxialCoord): AxialCoord[] => {
  return DIRECTIONS.filter(d =>
    !areEqual(d, axis) &&
    !areEqual(d, { q: -axis.q, r: -axis.r }) &&
    (d.q * axis.q + d.r * axis.r) === 0 // perpendicular in axial space
  );
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

  // Detect movement direction (must be adjacent)
  let direction: AxialCoord | null = null;
  for (const m of marbles) {
    const diff = subCoords(target, m);
    if (DIRECTIONS.some(d => areEqual(d, diff))) {
      direction = diff;
      break;
    }
  }

  if (!direction)
    return { valid: false, error: 'Target must be adjacent to a selected marble' };

  /* ----------------------------------
     DIRECTION LOCK (CRITICAL FIX)
  ---------------------------------- */

  if (groupAxis) {
    const inline =
      areEqual(direction, groupAxis) ||
      areEqual(direction, { q: -groupAxis.q, r: -groupAxis.r });

    if (!inline) {
      const sideSteps = getSideStepDirections(groupAxis);
      const validSideStep = sideSteps.some(d => areEqual(d, direction));

      if (!validSideStep)
        return { valid: false, error: 'Invalid side-step direction' };
    }
  }

  const isInlineMove =
    !groupAxis ||
    areEqual(direction, groupAxis) ||
    areEqual(direction, { q: -groupAxis.q, r: -groupAxis.r });

  /* ----------------------------------
     SIDE-STEP LOGIC
  ---------------------------------- */

  if (!isInlineMove) {
    for (const m of marbles) {
      const next = addCoords(m, direction);
      if (!isValidPos(next))
        return { valid: false, error: 'Cannot side-step off board' };
      if (state.board.has(coordToKey(next)))
        return { valid: false, error: 'All side-step target hexes must be empty' };
    }
    return { valid: true, direction };
  }

  /* ----------------------------------
     INLINE / PUSH LOGIC
  ---------------------------------- */

  const sorted = [...marbles].sort((a, b) =>
    (b.q * direction.q + b.r * direction.r) -
    (a.q * direction.q + a.r * direction.r)
  );

  const leader = sorted[0];
  const nextPos = addCoords(leader, direction);
  const occupant = state.board.get(coordToKey(nextPos));

  if (!occupant)
    return { valid: true, direction };

  if (occupant === state.currentPlayer)
    return { valid: false, error: 'Blocked by your own marble' };

  if (marbles.length === 1)
    return { valid: false, error: 'A single marble cannot push' };

  let oppCount = 0;
  let scan = nextPos;
  while (state.board.get(coordToKey(scan)) === occupant) {
    oppCount++;
    scan = addCoords(scan, direction);
  }

  if (oppCount >= marbles.length)
    return { valid: false, error: 'Not enough power to push' };

  if (state.board.get(coordToKey(scan)) === state.currentPlayer)
    return { valid: false, error: 'Blocked behind opponent marble' };

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
      if (isValidPos(pushed)) newBoard.set(coordToKey(pushed), occupant);
      else newScore[state.currentPlayer]++;
    });
  }

  marbles.forEach(m => newBoard.delete(coordToKey(m)));
  marbles.forEach(m =>
    newBoard.set(coordToKey(addCoords(m, direction)), state.currentPlayer)
  );

  const nextPlayer = state.currentPlayer === 'black' ? 'white' : 'black';
  const winner =
    newScore.black >= 6 ? 'black' :
    newScore.white >= 6 ? 'white' : null;

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    score: newScore,
    winner,
    history: [...state.history, { marbles, direction, type: 'move' }]
  };
};

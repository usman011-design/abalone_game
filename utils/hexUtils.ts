
import { AxialCoord, DIRECTIONS } from '../types';

export const coordToKey = (c: AxialCoord): string => `${c.q},${c.r}`;
export const keyToCoord = (key: string): AxialCoord => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

export const addCoords = (a: AxialCoord, b: AxialCoord): AxialCoord => ({
  q: a.q + b.q,
  r: a.r + b.r,
});

export const subCoords = (a: AxialCoord, b: AxialCoord): AxialCoord => ({
  q: a.q - b.q,
  r: a.r - b.r,
});

export const scaleCoord = (a: AxialCoord, s: number): AxialCoord => ({
  q: a.q * s,
  r: a.r * s,
});

export const getDistance = (a: AxialCoord, b: AxialCoord): number => {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

export const isValidPos = (coord: AxialCoord): boolean => {
  const radius = 4; // Distance from center 0,0 for side-length 5
  return getDistance({ q: 0, r: 0 }, coord) <= radius;
};

export const getNeighbor = (coord: AxialCoord, dirIdx: number): AxialCoord => {
  return addCoords(coord, DIRECTIONS[dirIdx]);
};

export const areEqual = (a: AxialCoord, b: AxialCoord): boolean => a.q === b.q && a.r === b.r;

export const getDirectionVector = (from: AxialCoord, to: AxialCoord): AxialCoord | null => {
  const diff = subCoords(to, from);
  for (const dir of DIRECTIONS) {
    if (dir.q === diff.q && dir.r === diff.r) return dir;
  }
  return null;
};

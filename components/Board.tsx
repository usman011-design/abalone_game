
import React, { useMemo } from 'react';
import { GameState, AxialCoord, Player } from '../types';
import { coordToKey, isValidPos, getNeighbor, areEqual } from '../utils/hexUtils';
import Marble from './Marble';

interface BoardProps {
  gameState: GameState;
  selectedMarbles: AxialCoord[];
  onHexClick: (coord: AxialCoord) => void;
}

const HEX_SIZE = 40;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

const Board: React.FC<BoardProps> = ({ gameState, selectedMarbles, onHexClick }) => {
  const hexes = useMemo(() => {
    const list: AxialCoord[] = [];
    for (let q = -4; q <= 4; q++) {
      for (let r = -4; r <= 4; r++) {
        const coord = { q, r };
        if (isValidPos(coord)) {
          list.push(coord);
        }
      }
    }
    return list;
  }, []);

  const getHexPixel = (q: number, r: number) => {
    const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = HEX_SIZE * (3 / 2) * r;
    return { x, y };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8 overflow-visible">
      <div 
        className="relative" 
        style={{ width: HEX_WIDTH * 9, height: HEX_HEIGHT * 7 }}
      >
        {/* Board Background (The Wooden Base) */}
        <div className="absolute inset-0 bg-[#3d2b1f] rounded-[20%] border-8 border-[#2d1e15] shadow-2xl opacity-90 scale-110" />

        {/* The Hex Grid */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {hexes.map((hex) => {
            const { x, y } = getHexPixel(hex.q, hex.r);
            const key = coordToKey(hex);
            const occupant = gameState.board.get(key);
            const isSelected = selectedMarbles.some(m => areEqual(m, hex));
            
            return (
              <div
                key={key}
                onClick={() => onHexClick(hex)}
                className="absolute transition-transform duration-500 hover:z-50"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  width: HEX_WIDTH,
                  height: HEX_HEIGHT,
                  marginTop: -HEX_HEIGHT / 2,
                  marginLeft: -HEX_WIDTH / 2,
                }}
              >
                {/* Hole / Socket */}
                <div className="absolute inset-0 flex items-center justify-center p-1">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${isSelected ? 'bg-amber-400/20' : 'bg-black/30'}
                    shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]
                    transition-colors duration-300 border border-white/5
                  `}>
                    {occupant && (
                      <Marble 
                        player={occupant} 
                        selected={isSelected} 
                        selectable={gameState.currentPlayer === occupant}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Board;

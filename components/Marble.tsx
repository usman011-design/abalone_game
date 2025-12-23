
import React from 'react';
import { Player } from '../types';

interface MarbleProps {
  player: Player;
  selected: boolean;
  selectable: boolean;
}

const Marble: React.FC<MarbleProps> = ({ player, selected, selectable }) => {
  const isBlack = player === 'black';
  
  return (
    <div className={`
      relative w-full h-full rounded-full transition-all duration-300
      ${selected ? 'scale-110' : 'scale-90'}
      ${selectable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
      shadow-xl
    `}>
      {/* 3D Sphere Effect */}
      <div className={`
        absolute inset-0 rounded-full
        ${isBlack 
          ? 'bg-gradient-to-br from-gray-700 via-gray-900 to-black' 
          : 'bg-gradient-to-br from-white via-gray-100 to-gray-400'}
        shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.5),inset_4px_4px_8px_rgba(255,255,255,0.2)]
      `} />
      
      {/* Shine */}
      <div className={`
        absolute top-[10%] left-[20%] w-[30%] h-[20%] rounded-[50%] blur-[2px] opacity-60
        ${isBlack ? 'bg-white/20' : 'bg-white/80'}
      `} />

      {/* Selection Ring */}
      {selected && (
        <div className="absolute -inset-2 border-2 border-amber-400 rounded-full animate-pulse" />
      )}
    </div>
  );
};

export default Marble;

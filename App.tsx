
import React, { useState, useCallback } from 'react';
import { GameState, AxialCoord, Player } from './types';
import { INITIAL_SETUP, validateMove, applyMove } from './logic/gameEngine';
import { coordToKey, areEqual, getDistance, subCoords } from './utils/hexUtils';
import Board from './components/Board';
import { Trophy, RefreshCw, Cpu, BookOpen, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: INITIAL_SETUP,
    currentPlayer: 'black',
    score: { black: 0, white: 0 },
    winner: null,
    history: []
  });

  const [selectedMarbles, setSelectedMarbles] = useState<AxialCoord[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const handleHexClick = (coord: AxialCoord) => {
    if (gameState.winner) return;
    setError(null);

    const key = coordToKey(coord);
    const occupant = gameState.board.get(key);

    if (occupant === gameState.currentPlayer) {
      const alreadySelected = selectedMarbles.find(m => areEqual(m, coord));
      
      if (alreadySelected) {
        setSelectedMarbles(prev => prev.filter(m => !areEqual(m, coord)));
      } else {
        if (selectedMarbles.length >= 3) {
          setSelectedMarbles([coord]);
          return;
        }

        if (selectedMarbles.length > 0) {
          const isAdjacent = selectedMarbles.some(m => getDistance(m, coord) === 1);
          if (!isAdjacent) {
             setSelectedMarbles([coord]);
             return;
          }
          if (selectedMarbles.length === 2) {
             const d1 = getDistance(selectedMarbles[0], coord);
             const d2 = getDistance(selectedMarbles[1], coord);
             // Must form a straight line
             if (!((d1 === 1 && d2 === 2) || (d1 === 2 && d2 === 1))) {
               setSelectedMarbles([coord]);
               return;
             }
          }
        }
        setSelectedMarbles(prev => [...prev, coord]);
      }
    } else {
      if (selectedMarbles.length > 0) {
        const validation = validateMove(gameState, selectedMarbles, coord);
        if (validation.valid) {
          const newState = applyMove(gameState, selectedMarbles, coord);
          setGameState(newState);
          setSelectedMarbles([]);
          setSuggestion(null);
        } else {
          setError(validation.error || 'Invalid move');
          // Clear error after a short delay
          setTimeout(() => setError(null), 3000);
        }
      }
    }
  };


  const resetGame = () => {
    setGameState({
      board: INITIAL_SETUP,
      currentPlayer: 'black',
      score: { black: 0, white: 0 },
      winner: null,
      history: []
    });
    setSelectedMarbles([]);
    setSuggestion(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0a0f1d] text-slate-100 overflow-hidden">
      <div className="w-full lg:w-96 p-6 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20">
            <Trophy className="w-6 h-6 text-slate-900" />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-white">Abalone Master</h1>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Current Turn</span>
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-500 ${gameState.currentPlayer === 'black' ? 'bg-slate-200 text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-800 text-white border border-white/10'}`}>
              {gameState.currentPlayer}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Black Pushes</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-xl font-bold">{gameState.score.black}</span>
              </div>
              <div className="mt-2 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(gameState.score.black / 6) * 100}%` }} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <p className="text-xs text-slate-500 mb-1">White Pushes</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white" />
                <span className="text-xl font-bold">{gameState.score.white}</span>
              </div>
              <div className="mt-2 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(gameState.score.white / 6) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <button 
            onClick={() => setShowRules(!showRules)}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium border border-white/5"
          >
            <BookOpen className="w-4 h-4" />
            Game Rules
          </button>
          <button 
            onClick={resetGame}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 transition-all text-sm font-medium border border-white/5"
          >
            <RefreshCw className="w-4 h-4" />
            New Game
          </button>
        </div>
      </div>

      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/10 blur-[120px] rounded-full" />
        </div>

        {gameState.winner && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in duration-500 p-6">
            <div className="text-center p-12 rounded-[2.5rem] bg-slate-900 border border-amber-500/40 shadow-[0_0_80px_rgba(245,158,11,0.15)] max-w-md w-full">
              <div className="w-24 h-24 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-12">
                <Trophy className="w-12 h-12 text-slate-900 -rotate-12" />
              </div>
              <h2 className="text-5xl font-serif font-bold mb-4 capitalize text-white">{gameState.winner} Victory!</h2>
              <p className="text-slate-400 mb-8 text-lg">A tactical masterpiece. Push 6 complete.</p>
              <button 
                onClick={resetGame}
                className="w-full py-4 rounded-2xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                Start New Match
              </button>
            </div>
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center select-none scale-90 md:scale-100">
          <Board 
            gameState={gameState} 
            selectedMarbles={selectedMarbles} 
            onHexClick={handleHexClick}
          />
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm animate-bounce">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="px-8 py-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-2xl pointer-events-none transition-all duration-300">
            <p className="text-sm font-medium tracking-wide">
              {selectedMarbles.length === 0 
                ? "Select 1 to 3 marbles of your color" 
                : `Pushing with ${selectedMarbles.length} marble${selectedMarbles.length > 1 ? 's' : ''}. Choose target.`}
            </p>
          </div>
        </div>

        {showRules && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 p-8 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-2xl mx-auto space-y-8 py-16 relative">
              <button 
                onClick={() => setShowRules(false)} 
                className="fixed top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors text-slate-400"
              >
                ✕
              </button>
              <h2 className="text-4xl font-serif font-bold text-white border-b border-white/10 pb-6">Abalone Official Rules</h2>
              <div className="grid gap-8 text-slate-300">
                <section className="space-y-3">
                  <h3 className="text-amber-500 font-bold text-xl uppercase tracking-widest">Objective</h3>
                  <p className="text-lg leading-relaxed">The first player to push 6 of their opponent's marbles into the board's rim wins the game.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-amber-500 font-bold text-xl uppercase tracking-widest">Moving Marbles</h3>
                  <p>You can move 1, 2, or 3 marbles of your color together as a unit.</p>
                  <ul className="space-y-3 mt-4">
                    <li className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <div><strong>In-line:</strong> Move the column along its own axis. This is the only way to push an opponent.</div>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <div><strong>Side-step:</strong> All marbles move sideways into adjacent empty spaces. All target spaces must be free.</div>
                    </li>
                  </ul>
                </section>
                <section className="space-y-3">
                  <h3 className="text-amber-500 font-bold text-xl uppercase tracking-widest">The Sumito (Pushing)</h3>
                  <p>You may push your opponent's marbles if your column is "In-line" and has a numerical majority.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-2xl font-bold text-white mb-1">3 vs 1</div>
                      <div className="text-xs text-slate-500 uppercase">Valid</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-2xl font-bold text-white mb-1">3 vs 2</div>
                      <div className="text-xs text-slate-500 uppercase">Valid</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-2xl font-bold text-white mb-1">2 vs 1</div>
                      <div className="text-xs text-slate-500 uppercase">Valid</div>
                    </div>
                  </div>
                </section>
              </div>
              <button 
                onClick={() => setShowRules(false)}
                className="mt-12 w-full py-4 rounded-2xl bg-white text-slate-900 font-bold hover:bg-slate-200 transition-all"
              >
                Understood, let's play
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default App;

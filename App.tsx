
import React, { useState, useCallback } from 'react';
import { GameState, AxialCoord, Player } from './types';
import { INITIAL_SETUP, validateMove, applyMove } from './logic/gameEngine';
import { coordToKey, areEqual, getDistance, areColinear } from './utils/hexUtils';
import Board from './components/Board';
import { Trophy, RefreshCw, Cpu, BookOpen, MessageSquare, ChevronRight, AlertCircle, Menu, X } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

        if (selectedMarbles.length === 1) {
          // Second marble must be adjacent to the first
          const dist = getDistance(selectedMarbles[0], coord);
          if (dist !== 1) {
            setSelectedMarbles([coord]);
            return;
          }
        }

        if (selectedMarbles.length === 2) {
          // Third marble must be adjacent to at least one AND form a straight line
          const dist1 = getDistance(selectedMarbles[0], coord);
          const dist2 = getDistance(selectedMarbles[1], coord);
          const isAdjacent = dist1 === 1 || dist2 === 1;
          const isLine = areColinear(selectedMarbles[0], selectedMarbles[1], coord);
          
          if (!isAdjacent || !isLine) {
            setSelectedMarbles([coord]);
            return;
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
          setTimeout(() => setError(null), 3000);
        }
      }
    }
  };

  const askGemini = async () => {
    setIsAiLoading(true);
    const advice = await getGeminiSuggestion(gameState);
    setSuggestion(advice);
    setIsAiLoading(false);
  };

  const resetGame = () => {
    if (confirm("Reset the match? Current progress will be lost.")) {
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
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-[#0a0f1d] text-slate-100 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900/80 border-b border-white/10 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-serif font-bold text-white">Abalone</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 lg:relative lg:inset-auto lg:w-96 lg:translate-x-0
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        bg-slate-950 lg:bg-slate-900/40 backdrop-blur-xl border-r border-white/10
        flex flex-col p-6 gap-6 overflow-y-auto
      `}>
        <div className="hidden lg:flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20">
            <Trophy className="w-6 h-6 text-slate-900" />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-white">Abalone Master</h1>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Turn</span>
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-500 ${gameState.currentPlayer === 'black' ? 'bg-slate-200 text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-800 text-white border border-white/10'}`}>
              {gameState.currentPlayer}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Black</p>
              <span className="text-xl font-bold">{gameState.score.black}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">White</p>
              <span className="text-xl font-bold">{gameState.score.white}</span>
            </div>
          </div>
        </div>

        {/* <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grandmaster Advice</h2>
            <button onClick={askGemini} disabled={isAiLoading} className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 disabled:opacity-50">
              {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-sm text-slate-300 italic min-h-[100px]">
            {suggestion || (isAiLoading ? "Calculating strategy..." : "Click the arrow to get strategic advice.")}
          </div>
        </div> */}

        <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
          <button onClick={() => { setShowRules(true); setIsMobileMenuOpen(false); }} className="p-3 rounded-xl bg-slate-800 text-sm font-medium">Rules</button>
          <button onClick={resetGame} className="p-3 rounded-xl bg-slate-800 text-sm font-medium hover:text-red-400">Reset</button>
        </div>
      </aside>

      {/* Main Game Area */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 bg-[#0c1222]">
        <Board gameState={gameState} selectedMarbles={selectedMarbles} onHexClick={handleHexClick} />
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 px-4 pointer-events-none">
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold animate-bounce pointer-events-auto">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
          <div className="px-6 py-3 rounded-full bg-slate-900/90 border border-white/10 backdrop-blur-md shadow-xl pointer-events-auto">
            <p className="text-[11px] md:text-sm font-semibold text-slate-300">
              {selectedMarbles.length === 0 ? "Select 1-3 marbles" : `Selection: ${selectedMarbles.length} | Move only along axis`}
            </p>
          </div>
        </div>
      </main>

      {/* Rules Modal */}
      {showRules && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 p-6 overflow-y-auto animate-in fade-in duration-300 flex items-center justify-center">
          <div className="max-w-md w-full space-y-6">
            <h2 className="text-3xl font-serif font-bold text-white text-center">Game Rules</h2>
            <div className="space-y-4 text-slate-300 text-sm">
              <p>• <strong>Push 6 marbles</strong> to win.</p>
              <p>• <strong>Groups (2 or 3)</strong> can only move forward/backward along their own line (In-line).</p>
              <p>• <strong>Pushes</strong> require a majority (3 vs 1, 3 vs 2, or 2 vs 1).</p>
              <p>• <strong>Single marbles</strong> can move to any adjacent empty space.</p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full py-3 rounded-xl bg-white text-slate-900 font-bold">Back to Match</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

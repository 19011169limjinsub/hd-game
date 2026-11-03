import React, { useEffect } from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onMainMenu,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onResume();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onMainMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResume, onMainMenu]);

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <h2 className="text-xl font-black text-white tracking-tight mb-1">PAUSED</h2>
        <p className="text-xs text-slate-400 mb-5">게임이 일시정지되었습니다.</p>

        <div className="w-full space-y-2">
          {/* 1. Resume */}
          <button
            onClick={onResume}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-sm transition-all duration-150 cursor-pointer"
          >
            <Play size={16} className="fill-white" />
            <span>RESUME</span>
          </button>

          {/* 2. Restart */}
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-sm transition-all duration-150 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>RESTART</span>
          </button>

          {/* 3. Main (Return to Title / Difficulty Setup) */}
          <button
            onClick={onMainMenu}
            className="w-full py-2.5 bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-amber-400 font-semibold rounded-xl border border-amber-500/30 hover:border-amber-500/60 flex items-center justify-center gap-2 text-sm transition-all duration-150 cursor-pointer"
          >
            <Home size={16} />
            <span>MAIN (난이도 설정)</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-500 mt-4 font-mono">
          Esc / P: 계속하기 · M: 메인으로
        </span>
      </div>
    </div>
  );
};

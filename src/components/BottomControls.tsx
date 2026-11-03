import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BottomControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  currentLane: number;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  currentLane,
}) => {
  const leftPressed = useRef(false);
  const rightPressed = useRef(false);

  const handleLeftTouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onMoveLeft();
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleRightTouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onMoveRight();
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  return (
    <footer className="w-full bg-slate-950/95 border-t border-slate-800/80 px-4 py-3 pb-safe z-20 shrink-0 select-none">
      {/* Visual Orbit Status Indicator */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-1">
        <span className="font-mono">KEY: A / ◄</span>
        <div className="flex items-center gap-2">
          <span className={currentLane === 0 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>1궤도</span>
          <span className="text-slate-700">·</span>
          <span className={currentLane === 1 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>2궤도</span>
          <span className="text-slate-700">·</span>
          <span className={currentLane === 2 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>3궤도</span>
        </div>
        <span className="font-mono">KEY: D / ►</span>
      </div>

      {/* Main Touch Buttons */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Left Touch Button */}
        <button
          type="button"
          onPointerDown={handleLeftTouch}
          disabled={currentLane === 0}
          aria-label="왼쪽 궤도 이동"
          className={`h-16 flex items-center justify-center gap-2 rounded-xl font-bold text-base transition-all duration-75 active:scale-95 active:bg-cyan-600/30 ${
            currentLane === 0
              ? 'bg-slate-900/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border border-slate-700/80 shadow-lg shadow-black/40 hover:border-slate-600 active:border-cyan-500 active:text-cyan-300'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <ChevronLeft size={24} className={currentLane === 0 ? 'text-slate-600' : 'text-cyan-400'} />
          <span className="tracking-wide text-sm font-semibold">LEFT</span>
        </button>

        {/* Right Touch Button */}
        <button
          type="button"
          onPointerDown={handleRightTouch}
          disabled={currentLane === 2}
          aria-label="오른쪽 궤도 이동"
          className={`h-16 flex items-center justify-center gap-2 rounded-xl font-bold text-base transition-all duration-75 active:scale-95 active:bg-cyan-600/30 ${
            currentLane === 2
              ? 'bg-slate-900/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border border-slate-700/80 shadow-lg shadow-black/40 hover:border-slate-600 active:border-cyan-500 active:text-cyan-300'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <span className="tracking-wide text-sm font-semibold">RIGHT</span>
          <ChevronRight size={24} className={currentLane === 2 ? 'text-slate-600' : 'text-cyan-400'} />
        </button>
      </div>
    </footer>
  );
};

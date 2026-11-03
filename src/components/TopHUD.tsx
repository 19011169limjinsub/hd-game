import React from 'react';
import { Volume2, VolumeX, Pause, Play, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { DifficultyLevel, getEffectiveDifficulty, AugmentsState, AUGMENT_MAP, AugmentId } from '../types.ts';

interface TopHUDProps {
  timeLeft: number;
  survivalTime: number;
  score: number;
  bestScore: number;
  isPaused: boolean;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  comboStreak: number;
  difficulty: DifficultyLevel;
  augments: AugmentsState;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  timeLeft,
  survivalTime,
  score,
  bestScore,
  isPaused,
  onTogglePause,
  isMuted,
  onToggleMute,
  comboStreak,
  difficulty,
  augments,
}) => {
  const isHell = difficulty === 'HELL';
  const elapsed = isHell ? survivalTime : Math.max(0, 60 - timeLeft);
  const effective = getEffectiveDifficulty(difficulty, elapsed);
  const isTimeCritical = !isHell && timeLeft <= 10 && timeLeft > 0;

  // Format survival time MM:SS
  const formatSurvivalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Next augment in HELL mode (every 10s: 10, 20, 30...)
  const nextAugmentSeconds = isHell ? (10 - (survivalTime % 10)) : 0;
  const progressToNext = isHell ? ((survivalTime % 10) / 10) * 100 : 0;

  // Active augments list
  const activeAugmentKeys = (Object.keys(augments) as AugmentId[]).filter(
    (id) => (augments[id] || 0) > 0
  );

  return (
    <header className="w-full bg-slate-950/95 backdrop-blur-md text-white border-b border-slate-800/80 px-3 py-1.5 flex flex-col select-none z-20 shrink-0">
      <div className="flex items-center justify-between">
        {/* Left: Score & Difficulty Badge */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-cyan-400">EVADED</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors duration-300 ${effective.badgeColor}`}>
              {effective.badgeLabel}
            </span>
            {comboStreak > 1 && (
              <span className="text-[10px] font-bold text-amber-400 tracking-tight animate-pulse">
                {comboStreak}x
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono tabular-nums tracking-tight text-white drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]">
              {score}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-slate-500">
              BEST {bestScore}
            </span>
          </div>
        </div>

        {/* Center: Mission Countdown (Normal) OR Survival Endless Timer (HELL) */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-400">
              {isHell ? 'SURVIVAL TIME' : 'MISSION TIME'}
            </span>
            {isHell && <InfinityIcon size={11} className="text-purple-400 animate-pulse" />}
          </div>

          {isHell ? (
            <div className="flex items-baseline gap-1 font-mono font-black text-xl tabular-nums text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]">
              <span>{formatSurvivalTime(survivalTime)}</span>
            </div>
          ) : (
            <div
              className={`flex items-baseline gap-0.5 font-mono font-black text-xl tabular-nums transition-colors duration-200 ${
                isTimeCritical ? 'text-red-500 scale-105 animate-pulse' : 'text-amber-400'
              }`}
            >
              <span>{timeLeft.toString().padStart(2, '0')}</span>
              <span className="text-xs font-semibold text-slate-500">s</span>
            </div>
          )}
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? '음소거 해제' : '음소거'}
            className="p-1.5 text-slate-400 hover:text-white active:scale-95 transition-transform rounded-lg hover:bg-slate-800/80"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={onTogglePause}
            aria-label={isPaused ? '게임 재개' : '일시정지'}
            className="p-1.5 text-slate-400 hover:text-white active:scale-95 transition-transform rounded-lg hover:bg-slate-800/80"
          >
            {isPaused ? <Play size={16} className="text-amber-400 fill-amber-400" /> : <Pause size={16} />}
          </button>
        </div>
      </div>

      {/* Hell Mode Augment Progress Bar & Active Augment Badges */}
      {isHell && (
        <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
          {/* Next Augment countdown */}
          <div className="flex items-center gap-1 text-slate-400 font-mono">
            <Sparkles size={11} className="text-purple-400" />
            <span className="text-[9px] text-purple-300 font-bold">NEXT AUGMENT:</span>
            <span className="font-bold text-amber-300 tabular-nums">{nextAugmentSeconds === 0 ? 10 : nextAugmentSeconds}s</span>
            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-300"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>

          {/* Active Augments mini chips */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[155px] no-scrollbar py-0.5">
            {activeAugmentKeys.length === 0 ? (
              <span className="text-[9px] text-slate-500 font-mono">10초마다 증강 획득</span>
            ) : (
              activeAugmentKeys.map((id) => {
                const aug = AUGMENT_MAP[id];
                const level = augments[id] || 0;
                return (
                  <div
                    key={id}
                    title={`${aug.nameKr} Lv.${level} - ${aug.desc}`}
                    className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-950/80 border border-purple-500/40 text-[9px] font-bold text-purple-200 shrink-0"
                  >
                    <span>{aug.nameKr.slice(0, 3)}</span>
                    <span className="text-amber-300 text-[8px] font-mono">x{level}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </header>
  );
};

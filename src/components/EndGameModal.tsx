import React, { useEffect } from 'react';
import { RotateCcw, Trophy, AlertTriangle, Infinity as InfinityIcon } from 'lucide-react';
import { sound } from '../utils/sound.ts';
import { DifficultyLevel, DIFFICULTY_SETTINGS, AugmentsState, AUGMENT_MAP, AugmentId } from '../types.ts';

interface EndGameModalProps {
  type: 'TIME_CLEAR' | 'GAME_OVER';
  score: number;
  bestScore: number;
  difficulty: DifficultyLevel;
  survivalTime: number;
  augments: AugmentsState;
  onRestart: () => void;
  onChangeDifficulty: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  type,
  score,
  bestScore,
  difficulty,
  survivalTime,
  augments,
  onRestart,
  onChangeDifficulty,
}) => {
  const isClear = type === 'TIME_CLEAR';
  const isNewBest = score > 0 && score >= bestScore;
  const diffConfig = DIFFICULTY_SETTINGS[difficulty];
  const isHell = difficulty === 'HELL';

  const formatSurvivalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeAugmentKeys = (Object.keys(augments) as AugmentId[]).filter(
    (id) => (augments[id] || 0) > 0
  );

  useEffect(() => {
    if (isClear) {
      sound.playVictory();
    } else {
      sound.playGameOver();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        sound.playStart();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClear, onRestart]);

  const handleRestartClick = () => {
    sound.playStart();
    onRestart();
  };

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-5 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-[320px] bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center text-center max-h-[92%] overflow-y-auto no-scrollbar">
        {/* Modal Status Icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border ${
            isClear
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}
        >
          {isClear ? (
            <Trophy size={24} className="animate-bounce" />
          ) : (
            <AlertTriangle size={24} />
          )}
        </div>

        {/* Modal Title */}
        <h2
          className={`text-xl font-black tracking-tight mb-0.5 ${
            isClear ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-red-500'
          }`}
        >
          {isHell
            ? 'HELL DRIFT CONCLUDED'
            : isClear
            ? 'MISSION ACCOMPLISHED!'
            : 'HULL COMPROMISED'}
        </h2>

        {/* Subtitle with Difficulty Badge */}
        <div className="flex items-center gap-1.5 justify-center mb-3 text-xs text-slate-400">
          <span>{isHell ? '지옥 무제한 생존 기록' : isClear ? '60초 궤도 탈출 성공!' : '외계 UFO와 충돌 발생!'}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${diffConfig.color}`}>
            {diffConfig.nameKr} ({diffConfig.labelEn})
          </span>
        </div>

        {/* Score Readout Box */}
        <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-3">
          {/* If HELL mode, show Survival Time first */}
          {isHell && (
            <div className="mb-2 pb-2 border-b border-slate-800/70 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <span>생존 시간 (Survival)</span>
                <InfinityIcon size={12} />
              </span>
              <span className="text-xl font-black font-mono text-purple-300">
                {formatSurvivalTime(survivalTime)}
              </span>
            </div>
          )}

          <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-0.5">
            회피/격추한 UFO (Evaded)
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-white mb-2 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]">
            {score}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs text-slate-400">
            <span>BEST ({diffConfig.nameKr})</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              {bestScore} {isNewBest && '(NEW!)'}
            </span>
          </div>
        </div>

        {/* Hell Mode Collected Augments Display */}
        {isHell && activeAugmentKeys.length > 0 && (
          <div className="w-full bg-purple-950/30 border border-purple-500/30 rounded-xl p-2.5 mb-3 text-left">
            <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>획득 누적 증강 (Augments Stacked)</span>
              <span className="text-amber-300 font-mono">총 {activeAugmentKeys.length}종</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar">
              {activeAugmentKeys.map((id) => {
                const aug = AUGMENT_MAP[id];
                const level = augments[id] || 0;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-purple-500/40 text-[10px] font-medium text-slate-200"
                  >
                    <span>{aug.nameKr}</span>
                    <span className="font-mono font-bold text-amber-400 text-[9px]">Lv.{level}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          <button
            onClick={handleRestartClick}
            className={`w-full py-2.5 active:scale-95 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all duration-150 cursor-pointer ${
              isHell
                ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                : isClear
                ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
                : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
            }`}
          >
            <RotateCcw size={15} />
            <span>미션 재도전 (RETRY MISSION)</span>
          </button>

          <button
            onClick={onChangeDifficulty}
            className="w-full py-2 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold rounded-xl border border-slate-700/80 text-xs transition-all cursor-pointer"
          >
            난이도 변경
          </button>
        </div>

        <span className="text-[9px] text-slate-500 mt-2 font-mono">
          Press Space or Enter to Restart
        </span>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { Play, Shield, Timer, Award, Rocket, Flame } from 'lucide-react';
import { sound } from '../utils/sound.ts';
import { DifficultyLevel, DIFFICULTY_SETTINGS } from '../types.ts';

interface TitleScreenProps {
  onStart: () => void;
  bestScore: number;
  difficulty: DifficultyLevel;
  onSelectDifficulty: (d: DifficultyLevel) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  bestScore,
  difficulty,
  onSelectDifficulty,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        sound.playStart();
        onStart();
      } else if (e.key === '1') {
        onSelectDifficulty('EASY');
      } else if (e.key === '2') {
        onSelectDifficulty('MEDIUM');
      } else if (e.key === '3') {
        onSelectDifficulty('HARD');
      } else if (e.key === '4') {
        onSelectDifficulty('HELL');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, onSelectDifficulty]);

  const handleStartClick = () => {
    sound.playStart();
    onStart();
  };

  const currentDiff = DIFFICULTY_SETTINGS[difficulty];

  return (
    <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col justify-between p-4.5 select-none animate-in fade-in duration-300">
      {/* Top Header: Brand & Difficulty-Specific Best Score */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-cyan-400 uppercase">
          <Rocket size={14} className="text-cyan-400" />
          <span>DEEP SPACE MISSION</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400 font-mono font-bold">
          <Award size={14} />
          <span>BEST ({currentDiff.nameKr}) {bestScore}</span>
        </div>
      </div>

      {/* Hero Visual & Title Lockup */}
      <div className="flex flex-col items-center text-center my-auto">
        {/* Space Shuttle Orbiter SVG Graphic */}
        <div className="relative mb-2.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-950 via-slate-900 to-purple-950 border border-cyan-500/40 flex items-center justify-center shadow-xl shadow-cyan-950/60">
            <svg
              className="w-12 h-14 drop-shadow-lg"
              viewBox="0 0 48 76"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Rocket Thruster Flame */}
              <polygon points="17,56 24,74 31,56" fill="url(#titleThrust)" />
              <polygon points="20,56 24,68 28,56" fill="#e0f2fe" />
              {/* Space Shuttle Fuselage & Delta Wings */}
              <path
                d="M24,4 Q28,14 29,26 L44,48 L44,55 L32,55 L30,58 L18,58 L16,55 L4,55 L4,48 L19,26 Q20,14 24,4 Z"
                fill="#f8fafc"
              />
              {/* Black Thermal Nose Cap */}
              <path d="M24,4 Q27,11 27,15 L21,15 Q21,11 24,4 Z" fill="#0f172a" />
              {/* Black Wing Leading Edges */}
              <polygon points="19,26 4,48 7,50 20,28" fill="#1e293b" />
              <polygon points="29,26 44,48 41,50 28,28" fill="#1e293b" />
              {/* Cockpit Windshield Panels */}
              <polygon points="21,18 27,18 28,22 20,22" fill="#0284c7" />
              <line x1="24" y1="18" x2="24" y2="22" stroke="#0f172a" strokeWidth="0.8" />
              {/* Cargo Bay & Vertical Tail Fin */}
              <line x1="24" y1="24" x2="24" y2="52" stroke="#cbd5e1" strokeWidth="1.2" />
              <rect x="23" y="34" width="2" height="20" fill="#e2e8f0" />
              {/* Engine Bells */}
              <rect x="18" y="56" width="3" height="2.5" fill="#334155" />
              <rect x="27" y="56" width="3" height="2.5" fill="#334155" />
              <rect x="22.5" y="57" width="3" height="2.5" fill="#334155" />
              <defs>
                <linearGradient id="titleThrust" x1="24" y1="56" x2="24" y2="74" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38bdf8" />
                  <stop offset="0.5" stopColor="#f97316" />
                  <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-0.5">
          SPACE SHUTTLE <span className="text-cyan-400">60s</span>
        </h1>
        <div className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase mb-2.5">
          우주왕복선 UFO 회피 미션
        </div>

        {/* Difficulty Selector (하 / 중 / 상 / 지옥) */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-2.5 text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Flame size={14} className={difficulty === 'HELL' ? 'text-purple-400 animate-pulse' : 'text-blue-400'} />
              <span>난이도 선택</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">1 · 2 · 3 · 4</span>
          </div>

          <div className="grid grid-cols-4 gap-1 mb-2">
            {/* 하 (EASY) */}
            <button
              type="button"
              onClick={() => onSelectDifficulty('EASY')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                difficulty === 'EASY'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/50 scale-[1.02]'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="text-sm">하</span>
              <span className="text-[8px] font-mono tracking-tight opacity-80">EASY</span>
            </button>

            {/* 중 (MEDIUM) */}
            <button
              type="button"
              onClick={() => onSelectDifficulty('MEDIUM')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                difficulty === 'MEDIUM'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-950/50 scale-[1.02]'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="text-sm">중</span>
              <span className="text-[8px] font-mono tracking-tight opacity-80">NORMAL</span>
            </button>

            {/* 상 (HARD) */}
            <button
              type="button"
              onClick={() => onSelectDifficulty('HARD')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                difficulty === 'HARD'
                  ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-950/50 scale-[1.02]'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="text-sm">상</span>
              <span className="text-[8px] font-mono tracking-tight opacity-80">HARD</span>
            </button>

            {/* 지옥 (HELL) */}
            <button
              type="button"
              onClick={() => onSelectDifficulty('HELL')}
              className={`py-2 px-1 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                difficulty === 'HELL'
                  ? 'bg-gradient-to-br from-purple-700 to-rose-700 text-white border-purple-400 shadow-lg shadow-purple-950/80 scale-[1.04]'
                  : 'bg-slate-950/70 text-purple-400 border-purple-900/50 hover:text-purple-300 hover:border-purple-700'
              }`}
            >
              <span className="text-sm flex items-center gap-0.5">
                지옥
              </span>
              <span className="text-[8px] font-mono tracking-tight text-purple-300">2X SPEED</span>
            </button>
          </div>

            {/* Difficulty Description */}
            <div className={`text-[11px] rounded px-2.5 py-1.5 border leading-snug ${
              difficulty === 'HELL'
                ? 'bg-purple-950/60 border-purple-700/60 text-purple-200 font-semibold'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
            }`}>
              <div>
                {difficulty === 'HELL'
                  ? '무제한 생존 모드! 0~2s(하) → 3~5s(중) → 6~10s(상) → 11s부터 지옥(2배속)! 10초마다 3가지 누적 증강 선택'
                  : currentDiff.desc}
              </div>
              {difficulty === 'HELL' && (
                <div className="grid grid-cols-4 gap-1 mt-1.5 pt-1.5 border-t border-purple-800/50 text-[9px] font-mono text-center">
                  <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded py-0.5">
                    <div className="font-bold">0~2s</div>
                    <div className="text-[8px] opacity-80">하 난이도</div>
                  </div>
                  <div className="bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded py-0.5">
                    <div className="font-bold">3~5s</div>
                    <div className="text-[8px] opacity-80">중 난이도</div>
                  </div>
                  <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded py-0.5">
                    <div className="font-bold">6~10s</div>
                    <div className="text-[8px] opacity-80">상 난이도</div>
                  </div>
                  <div className="bg-purple-900/80 border border-purple-400/60 text-purple-200 rounded py-0.5 font-bold shadow-sm">
                    <div>11s~무제한</div>
                    <div className="text-[8px] text-purple-300">지옥+증강</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="w-full space-y-1.5 mb-3.5 text-left">
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2">
              <Timer size={14} className="text-amber-400 shrink-0" />
              <span>
                {difficulty === 'HELL' ? (
                  <>지옥 모드: <strong>무제한 생존</strong> & 10초마다 3가지 증강 선택</>
                ) : (
                  <>제한시간 <strong>60초</strong> 궤도 탈출 타임어택 루프</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2">
              <Shield size={14} className="text-cyan-400 shrink-0" />
              <span><strong>3차선 서브라이트 궤도</strong> 0.08s 퀵 레인 체인지</span>
            </div>
          </div>

        {/* Start CTA Button */}
        <button
          onClick={handleStartClick}
          className={`w-full py-3.5 active:scale-98 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all duration-150 cursor-pointer ${
            difficulty === 'HELL'
              ? 'bg-gradient-to-r from-purple-600 via-rose-600 to-red-600 hover:from-purple-500 hover:to-red-500 shadow-purple-900/50'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30'
          }`}
        >
          <Play size={18} className="fill-white" />
          <span>START MISSION ({currentDiff.nameKr})</span>
        </button>

        <span className="text-[10px] text-slate-500 mt-2 font-mono">
          Press Space or Enter to Play
        </span>
      </div>

      {/* Footer Controls Tip */}
      <div className="text-center text-[10px] text-slate-500 font-mono">
        모바일 터치 버튼 · PC: A / D / 방향키
      </div>
    </div>
  );
};

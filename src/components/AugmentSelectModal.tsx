import React, { useEffect } from 'react';
import {
  Shield,
  Zap,
  Crosshair,
  Swords,
  Radio,
  CircleDot,
  Rocket,
  Hourglass,
  Minimize2,
  Shrink,
  Navigation,
  Sparkles,
  Flame,
  Bomb,
  Ghost,
  HeartPulse,
  ShieldAlert,
  Award,
  Cpu,
  Layers,
} from 'lucide-react';
import { AugmentDef, AugmentId, AugmentsState } from '../types.ts';
import { sound } from '../utils/sound.ts';

interface AugmentSelectModalProps {
  options: AugmentDef[];
  currentAugments: AugmentsState;
  onSelect: (id: AugmentId) => void;
  milestoneTime: number; // e.g. 10, 20, 30...
}

// Icon renderer mapped by augment ID
const renderAugmentIcon = (id: AugmentId, size = 22) => {
  switch (id) {
    case 'shield':
      return <Shield size={size} className="text-cyan-400" />;
    case 'booster':
      return <Zap size={size} className="text-amber-400" />;
    case 'laser':
      return <Crosshair size={size} className="text-red-400" />;
    case 'plasma_ram':
      return <Swords size={size} className="text-orange-400" />;
    case 'emp_pulse':
      return <Radio size={size} className="text-blue-400" />;
    case 'orbital_drones':
      return <CircleDot size={size} className="text-emerald-400" />;
    case 'homing_missiles':
      return <Rocket size={size} className="text-violet-400" />;
    case 'chrono_slow':
      return <Hourglass size={size} className="text-teal-400" />;
    case 'gravity_repulsor':
      return <Minimize2 size={size} className="text-purple-400" />;
    case 'shrink_drive':
      return <Shrink size={size} className="text-indigo-400" />;
    case 'quantum_warp':
      return <Navigation size={size} className="text-sky-400" />;
    case 'emergency_warp':
      return <Sparkles size={size} className="text-yellow-400" />;
    case 'titan_surge':
      return <Flame size={size} className="text-amber-300" />;
    case 'antimatter_chain':
      return <Bomb size={size} className="text-pink-400" />;
    case 'stealth_cloak':
      return <Ghost size={size} className="text-emerald-300" />;
    case 'nano_repair':
      return <HeartPulse size={size} className="text-green-400" />;
    case 'deflector_barrier':
      return <ShieldAlert size={size} className="text-cyan-300" />;
    case 'score_overdrive':
      return <Award size={size} className="text-yellow-300" />;
    case 'overclock_reactor':
      return <Cpu size={size} className="text-fuchsia-400" />;
    case 'plasma_wake':
      return <Flame size={size} className="text-rose-400" />;
    default:
      return <Zap size={size} className="text-cyan-400" />;
  }
};

export const AugmentSelectModal: React.FC<AugmentSelectModalProps> = ({
  options,
  currentAugments,
  onSelect,
  milestoneTime,
}) => {
  useEffect(() => {
    sound.playAugmentModal();

    // Hotkeys 1, 2, 3
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && options[0]) {
        e.preventDefault();
        sound.playAugmentSelect();
        onSelect(options[0].id);
      } else if (e.key === '2' && options[1]) {
        e.preventDefault();
        sound.playAugmentSelect();
        onSelect(options[1].id);
      } else if (e.key === '3' && options[2]) {
        e.preventDefault();
        sound.playAugmentSelect();
        onSelect(options[2].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onSelect]);

  const handleCardClick = (id: AugmentId) => {
    sound.playAugmentSelect();
    onSelect(id);
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-3.5 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="w-full text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/60 shadow-lg shadow-purple-900/40 mb-1.5">
          <Layers size={13} className="text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-[11px] font-black text-purple-300 tracking-wider">
            {milestoneTime}초 생존 증강 보상
          </span>
        </div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5 drop-shadow-[0_0_12px_rgba(192,132,252,0.6)]">
          <span>차원 증강 선택</span>
          <span className="text-xs text-purple-400 font-mono font-bold">(AUGMENT)</span>
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          효과는 누적 중첩(STACK)되어 영구 적용됩니다
        </p>
      </div>

      {/* 3 Augment Cards */}
      <div className="w-full flex-1 flex flex-col justify-center gap-2.5 my-2">
        {options.map((aug, index) => {
          const currentLevel = currentAugments[aug.id] || 0;
          const nextLevel = currentLevel + 1;
          const isStack = currentLevel > 0;

          return (
            <button
              key={aug.id}
              onClick={() => handleCardClick(aug.id)}
              className="w-full text-left relative p-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-700/80 hover:border-purple-400/80 hover:from-purple-950/30 hover:to-slate-900 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-lg group overflow-hidden"
            >
              {/* Hotkey Badge [1], [2], [3] */}
              <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-md bg-slate-800/90 border border-slate-700 flex items-center justify-center text-[11px] font-mono font-bold text-slate-300 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                {index + 1}
              </div>

              {/* Card Main Info */}
              <div className="flex items-start gap-2.5">
                {/* Icon Box */}
                <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-purple-400/60 shadow-inner">
                  {renderAugmentIcon(aug.id, 20)}
                </div>

                {/* Details */}
                <div className="flex-1 pr-6">
                  {/* Category & Stack Badge */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${aug.badgeColor}`}>
                      {aug.categoryKr}
                    </span>
                    {isStack ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        보유 Lv.{currentLevel} ➔ Lv.{nextLevel} (중첩!)
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        NEW 신규 증강!
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                      {aug.nameKr}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {aug.nameEn}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                    {aug.desc}
                  </p>

                  {/* Next Level Effect readout */}
                  <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] text-purple-300/90 font-medium">
                    ⚡ {aug.getStackDesc(nextLevel)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="text-center pb-1 text-[10px] text-slate-500 font-mono">
        숫자키 [1], [2], [3] 또는 카드를 터치하여 선택
      </div>
    </div>
  );
};

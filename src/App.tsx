import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  LaneIndex,
  DifficultyLevel,
  AugmentDef,
  AugmentId,
  AugmentsState,
  AUGMENT_CATALOG,
} from './types.ts';
import { TopHUD } from './components/TopHUD.tsx';
import { GameBoard } from './components/GameBoard.tsx';
import { BottomControls } from './components/BottomControls.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { EndGameModal } from './components/EndGameModal.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { AugmentSelectModal } from './components/AugmentSelectModal.tsx';
import { sound } from './utils/sound.ts';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => {
    try {
      const saved = localStorage.getItem('red_dodge_difficulty') as DifficultyLevel;
      if (saved === 'EASY' || saved === 'MEDIUM' || saved === 'HARD' || saved === 'HELL') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'EASY';
  });

  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [survivalTime, setSurvivalTime] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  // Augments state (stacks per AugmentId)
  const [augments, setAugments] = useState<AugmentsState>({});
  const [isSelectingAugment, setIsSelectingAugment] = useState<boolean>(false);
  const [augmentOptions, setAugmentOptions] = useState<AugmentDef[]>([]);
  const [milestoneTime, setMilestoneTime] = useState<number>(10);
  const triggeredMilestonesRef = useRef<Set<number>>(new Set());

  // Independent Best Scores per difficulty level (하, 중, 상, 지옥)
  const [bestScores, setBestScores] = useState<Record<DifficultyLevel, number>>(() => {
    try {
      return {
        EASY: parseInt(localStorage.getItem('red_dodge_best_EASY') || '0', 10),
        MEDIUM: parseInt(localStorage.getItem('red_dodge_best_MEDIUM') || '0', 10),
        HARD: parseInt(localStorage.getItem('red_dodge_best_HARD') || '0', 10),
        HELL: parseInt(localStorage.getItem('red_dodge_best_HELL') || '0', 10),
      };
    } catch {
      return { EASY: 0, MEDIUM: 0, HARD: 0, HELL: 0 };
    }
  });

  const [comboStreak, setComboStreak] = useState<number>(0);
  const [playerLane, setPlayerLane] = useState<LaneIndex>(1); // 1: 2차선 (중앙)
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Save selected difficulty in localStorage
  const handleSelectDifficulty = useCallback((newDiff: DifficultyLevel) => {
    setDifficulty(newDiff);
    try {
      localStorage.setItem('red_dodge_difficulty', newDiff);
    } catch {
      // Ignore
    }
  }, []);

  // Helper to pick 3 random distinct augments from the 20 available
  const pickThreeRandomAugments = useCallback(() => {
    const pool = [...AUGMENT_CATALOG];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }, []);

  // Timer Loop (Standard 60s countdown for EASY/MEDIUM/HARD, Endless Survival for HELL)
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused || isSelectingAugment) return;

    const timer = setInterval(() => {
      if (difficulty === 'HELL') {
        // Endless survival time counting up
        setSurvivalTime((prev) => {
          const nextSec = prev + 1;

          // Trigger Augment Selection every 10 seconds (10s, 20s, 30s, 40s...)
          if (nextSec > 0 && nextSec % 10 === 0 && !triggeredMilestonesRef.current.has(nextSec)) {
            triggeredMilestonesRef.current.add(nextSec);
            setMilestoneTime(nextSec);
            setAugmentOptions(pickThreeRandomAugments());
            setIsSelectingAugment(true);
          }

          return nextSec;
        });
      } else {
        // Standard 60s countdown
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('TIME_CLEAR');
            return 0;
          }

          if (prev <= 6 && prev > 1) {
            sound.playWarning();
          }

          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isPaused, isSelectingAugment, difficulty, pickThreeRandomAugments]);

  // Update Best Score for the active difficulty level
  useEffect(() => {
    if (score > (bestScores[difficulty] || 0)) {
      setBestScores((prev) => ({
        ...prev,
        [difficulty]: score,
      }));
      try {
        localStorage.setItem(`red_dodge_best_${difficulty}`, score.toString());
      } catch {
        // Ignore storage errors
      }
    }
  }, [score, difficulty, bestScores]);

  // Start / Restart Game
  const handleStartGame = useCallback(() => {
    setScore(0);
    setTimeLeft(60);
    setSurvivalTime(0);
    setComboStreak(0);
    setPlayerLane(1);
    setIsPaused(false);
    setIsSelectingAugment(false);
    setAugments({});
    triggeredMilestonesRef.current.clear();
    setGameState('PLAYING');
  }, []);

  // Choose an Augment (Stacks with existing levels)
  const handleSelectAugment = useCallback((id: AugmentId) => {
    setAugments((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    setIsSelectingAugment(false);
  }, []);

  // Increment Dodge / Destruction Score
  const handleScoreIncrement = useCallback((amount = 1) => {
    setScore((prev) => prev + amount);
    setComboStreak((prev) => prev + 1);
  }, []);

  // Immediate GAME OVER on lethal Collision
  const handleCrashImmediate = useCallback(() => {
    setGameState('GAME_OVER');
  }, []);

  // Discrete Lane Movements
  const handleMoveLeft = useCallback(() => {
    if (gameState !== 'PLAYING' || isPaused || isSelectingAugment) return;
    setPlayerLane((prev) => {
      if (prev > 0) {
        sound.playSteer();
        return (prev - 1) as LaneIndex;
      }
      return prev;
    });
  }, [gameState, isPaused, isSelectingAugment]);

  const handleMoveRight = useCallback(() => {
    if (gameState !== 'PLAYING' || isPaused || isSelectingAugment) return;
    setPlayerLane((prev) => {
      if (prev < 2) {
        sound.playSteer();
        return (prev + 1) as LaneIndex;
      }
      return prev;
    });
  }, [gameState, isPaused, isSelectingAugment]);

  // Pause / Resume Toggle
  const handleTogglePause = useCallback(() => {
    if (gameState !== 'PLAYING' || isSelectingAugment) return;
    setIsPaused((prev) => !prev);
  }, [gameState, isSelectingAugment]);

  // Sound Mute Toggle
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Return to Title to Change Difficulty
  const handleChangeDifficulty = useCallback(() => {
    setGameState('TITLE');
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (gameState === 'PLAYING' && !isSelectingAugment) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handleTogglePause();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameState, isSelectingAugment, handleTogglePause]);

  const currentBest = bestScores[difficulty] || 0;

  return (
    <div className="w-full min-h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 text-slate-100">
      {/* 360px Fixed Mobile Screen Container */}
      <main
        className="w-full max-w-[360px] h-[100dvh] max-h-[820px] bg-slate-950 flex flex-col justify-between border-x border-slate-800/80 shadow-2xl relative overflow-hidden"
        style={{ width: '360px' }}
      >
        {/* Top HUD */}
        <TopHUD
          timeLeft={timeLeft}
          survivalTime={survivalTime}
          score={score}
          bestScore={currentBest}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          comboStreak={comboStreak}
          difficulty={difficulty}
          augments={augments}
        />

        {/* Central 2D Game View */}
        <GameBoard
          gameState={gameState}
          onScoreIncrement={handleScoreIncrement}
          onCrashImmediate={handleCrashImmediate}
          playerLane={playerLane}
          setPlayerLane={setPlayerLane}
          isPaused={isPaused}
          isSelectingAugment={isSelectingAugment}
          timeLeft={timeLeft}
          survivalTime={survivalTime}
          difficulty={difficulty}
          augments={augments}
        />

        {/* Bottom Touch Controls */}
        <BottomControls
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          currentLane={playerLane}
        />

        {/* Title Screen Overlay with Difficulty Selection */}
        {gameState === 'TITLE' && (
          <TitleScreen
            onStart={handleStartGame}
            bestScore={currentBest}
            difficulty={difficulty}
            onSelectDifficulty={handleSelectDifficulty}
          />
        )}

        {/* Augment Selection Modal (Every 10 seconds in HELL mode) */}
        {gameState === 'PLAYING' && isSelectingAugment && (
          <AugmentSelectModal
            options={augmentOptions}
            currentAugments={augments}
            onSelect={handleSelectAugment}
            milestoneTime={milestoneTime}
          />
        )}

        {/* End Game Modal: TIME CLEAR or GAME OVER */}
        {(gameState === 'TIME_CLEAR' || gameState === 'GAME_OVER') && (
          <EndGameModal
            type={gameState}
            score={score}
            bestScore={currentBest}
            difficulty={difficulty}
            survivalTime={survivalTime}
            augments={augments}
            onRestart={handleStartGame}
            onChangeDifficulty={handleChangeDifficulty}
          />
        )}

        {/* Pause Modal Overlay */}
        {gameState === 'PLAYING' && isPaused && !isSelectingAugment && (
          <PauseModal
            onResume={() => setIsPaused(false)}
            onRestart={handleStartGame}
            onMainMenu={() => {
              setIsPaused(false);
              setGameState('TITLE');
            }}
          />
        )}
      </main>
    </div>
  );
}

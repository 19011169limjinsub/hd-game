import React, { useEffect, useRef } from 'react';
import {
  GameState,
  LaneIndex,
  ObstacleCar,
  Particle,
  FloatingText,
  PlayerCar,
  DifficultyLevel,
  DIFFICULTY_SETTINGS,
  getEffectiveDifficulty,
  AugmentsState,
} from '../types.ts';
import { sound } from '../utils/sound.ts';

interface SpaceStar {
  x: number;
  y: number;
  size: number;
  speedMul: number;
  color: string;
  baseAlpha: number;
  twinkleOffset: number;
}

interface HomingMissile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId: number | null;
  life: number;
}

interface GameBoardProps {
  gameState: GameState;
  onScoreIncrement: (amount?: number) => void;
  onCrashImmediate: () => void;
  playerLane: LaneIndex;
  setPlayerLane: React.Dispatch<React.SetStateAction<LaneIndex>>;
  isPaused: boolean;
  isSelectingAugment: boolean;
  timeLeft: number;
  survivalTime: number;
  difficulty: DifficultyLevel;
  augments: AugmentsState;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onScoreIncrement,
  onCrashImmediate,
  playerLane,
  setPlayerLane,
  isPaused,
  isSelectingAugment,
  timeLeft,
  survivalTime,
  difficulty,
  augments,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 360px Deep Space Flight Geometry
  const CANVAS_WIDTH = 360;
  const CANVAS_HEIGHT = 560;
  const CORRIDOR_MARGIN = 22; // Cosmic boundary margin
  const ROAD_WIDTH = CANVAS_WIDTH - CORRIDOR_MARGIN * 2; // ~316px
  const LANE_WIDTH = ROAD_WIDTH / 3; // ~105.33px
  const TRACK_START_X = CORRIDOR_MARGIN;

  // Center X positions for Orbit 1 (Left), Orbit 2 (Center), Orbit 3 (Right)
  const LANE_CENTERS: number[] = [
    TRACK_START_X + LANE_WIDTH * 0.5,
    TRACK_START_X + LANE_WIDTH * 1.5,
    TRACK_START_X + LANE_WIDTH * 2.5,
  ];

  // Internal mutable player state
  const playerRef = useRef<PlayerCar>({
    lane: 1,
    startX: LANE_CENTERS[1],
    targetX: LANE_CENTERS[1],
    x: LANE_CENTERS[1],
    y: CANVAS_HEIGHT - 110,
    width: 46,
    height: 80,
    lerpProgress: 1.0,
    isMoving: false,
    tilt: 0,
  });

  const obstaclesRef = useRef<ObstacleCar[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const trackOffsetRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(1.2);
  const nextIdRef = useRef<number>(1);
  const screenShakeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const lastHellPhaseRef = useRef<number>(1);
  const starsRef = useRef<SpaceStar[]>([]);

  // Augment Cooldowns and Dynamic State Refs
  const augmentsRef = useRef<AugmentsState>(augments);
  useEffect(() => {
    augmentsRef.current = augments;
  }, [augments]);

  const shieldChargesRef = useRef<number>(0);
  const shieldRechargeTimerRef = useRef<number>(0);
  const invulnTimerRef = useRef<number>(0);

  const boosterCooldownRef = useRef<number>(8);
  const boosterActiveTimerRef = useRef<number>(0);

  const laserCooldownRef = useRef<number>(3);
  const laserFlashAlphaRef = useRef<number>(0);

  const empCooldownRef = useRef<number>(7);
  const empRingRadiusRef = useRef<number>(0);
  const empStunTimerRef = useRef<number>(0);

  const missileCooldownRef = useRef<number>(3.5);
  const missilesRef = useRef<HomingMissile[]>([]);

  const titanCooldownRef = useRef<number>(14);
  const titanActiveTimerRef = useRef<number>(0);

  const stealthCooldownRef = useRef<number>(8);
  const stealthActiveTimerRef = useRef<number>(0);

  const deflectorCooldownRef = useRef<number>(7);
  const deflectorFlashTimerRef = useRef<number>(0);

  const emergencyWarpCooldownRef = useRef<number>(0);
  const nanoRevivesRemainingRef = useRef<number>(0);

  const phaseBannerRef = useRef<{
    text: string;
    subText: string;
    color: string;
    life: number;
    maxLife: number;
  } | null>(null);

  // Sync shield and revive capacities when augments update
  useEffect(() => {
    if (augments.shield && shieldChargesRef.current < augments.shield) {
      shieldChargesRef.current = augments.shield;
    }
    if (augments.nano_repair) {
      // Set remaining extra lives if not yet loaded
      if (nanoRevivesRemainingRef.current < augments.nano_repair) {
        nanoRevivesRemainingRef.current = augments.nano_repair;
      }
    }
  }, [augments]);

  // Grant 2.0s invulnerability after choosing an augment
  const prevSelectingAugmentRef = useRef<boolean>(false);
  useEffect(() => {
    if (prevSelectingAugmentRef.current && !isSelectingAugment && gameState === 'PLAYING') {
      invulnTimerRef.current = Math.max(invulnTimerRef.current, 2.0);
      floatingTextsRef.current.push({
        id: nextIdRef.current++,
        text: '🛡️ 2초간 무적 보호막!',
        x: playerRef.current.x,
        y: playerRef.current.y - 45,
        color: '#38bdf8',
        alpha: 1.0,
        life: 0,
      });
    }
    prevSelectingAugmentRef.current = isSelectingAugment;
  }, [isSelectingAugment, gameState]);

  // Initialize Deep Space Starfield
  useEffect(() => {
    const stars: SpaceStar[] = [];
    const colors = ['#ffffff', '#e0f2fe', '#bae6fd', '#fef08a', '#e9d5ff', '#a7f3d0'];
    for (let i = 0; i < 75; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() < 0.25 ? Math.random() * 2 + 1.2 : Math.random() * 1.2 + 0.6,
        speedMul: Math.random() * 0.75 + 0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
        baseAlpha: Math.random() * 0.6 + 0.4,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Trigger Lerp when playerLane changes (Quantum warp reduces time)
  useEffect(() => {
    const player = playerRef.current;
    if (player.lane !== playerLane) {
      player.lane = playerLane;
      player.startX = player.x;
      player.targetX = LANE_CENTERS[playerLane];
      player.lerpProgress = 0;
      player.isMoving = true;

      // Quantum warp adds brief phase shift
      const quantumLevel = augmentsRef.current.quantum_warp || 0;
      if (quantumLevel > 0) {
        invulnTimerRef.current = Math.max(invulnTimerRef.current, 0.3 + quantumLevel * 0.1);
      }
    }
  }, [playerLane]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || isPaused || isSelectingAugment) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setPlayerLane((prev) => {
          if (prev > 0) {
            sound.playSteer();
            return (prev - 1) as LaneIndex;
          }
          return prev;
        });
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setPlayerLane((prev) => {
          if (prev < 2) {
            sound.playSteer();
            return (prev + 1) as LaneIndex;
          }
          return prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, isSelectingAugment, setPlayerLane]);

  const timeLeftRef = useRef<number>(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const survivalTimeRef = useRef<number>(survivalTime);
  useEffect(() => {
    survivalTimeRef.current = survivalTime;
  }, [survivalTime]);

  const difficultyRef = useRef<DifficultyLevel>(difficulty);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  // Reset simulation state when a new game starts
  useEffect(() => {
    if (gameState === 'PLAYING' && (difficultyRef.current === 'HELL' ? survivalTime === 0 : timeLeft === 60)) {
      obstaclesRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      missilesRef.current = [];
      spawnTimerRef.current = 1.0;
      playerRef.current.x = LANE_CENTERS[1];
      playerRef.current.startX = LANE_CENTERS[1];
      playerRef.current.targetX = LANE_CENTERS[1];
      playerRef.current.lane = 1;
      playerRef.current.lerpProgress = 1.0;
      playerRef.current.isMoving = false;
      playerRef.current.tilt = 0;
      screenShakeRef.current = 0;
      lastHellPhaseRef.current = 1;
      phaseBannerRef.current = null;

      // Reset augments timers
      shieldChargesRef.current = augmentsRef.current.shield || 0;
      shieldRechargeTimerRef.current = 0;
      invulnTimerRef.current = 0;
      boosterCooldownRef.current = 6;
      boosterActiveTimerRef.current = 0;
      laserCooldownRef.current = 3;
      laserFlashAlphaRef.current = 0;
      empCooldownRef.current = 6;
      empRingRadiusRef.current = 0;
      empStunTimerRef.current = 0;
      missileCooldownRef.current = 3.5;
      titanCooldownRef.current = 12;
      titanActiveTimerRef.current = 0;
      stealthCooldownRef.current = 8;
      stealthActiveTimerRef.current = 0;
      deflectorCooldownRef.current = 6;
      deflectorFlashTimerRef.current = 0;
      emergencyWarpCooldownRef.current = 0;
      nanoRevivesRemainingRef.current = augmentsRef.current.nano_repair || 0;
    }
  }, [gameState, timeLeft, survivalTime]);

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const rawDt = (time - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = time;

      if (gameState === 'PLAYING' && !isPaused && !isSelectingAugment) {
        updateSimulation(dt);
      }

      renderScene(ctx, time / 1000);

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState, isPaused, isSelectingAugment]);

  // Helper: Destroy an Obstacle and trigger Antimatter Chain reactions
  const destroyObstacle = (
    obs: ObstacleCar,
    sourceText: string,
    pointsMul = 1,
    skipChain = false
  ) => {
    obs.scored = true;
    obs.y = CANVAS_HEIGHT + 300; // eliminate

    const scoreOverdrive = augmentsRef.current.score_overdrive || 0;
    const finalPoints = (1 + scoreOverdrive) * pointsMul;
    onScoreIncrement(finalPoints);

    // Cosmic vaporize particles
    for (let p = 0; p < 24; p++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 240 + 40;
      particlesRef.current.push({
        x: obs.x,
        y: obs.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? '#38bdf8' : Math.random() > 0.5 ? '#f43f5e' : '#fbbf24',
        size: Math.random() * 4 + 1.5,
        alpha: 1.0,
        life: 0,
        maxLife: 0.45,
      });
    }

    floatingTextsRef.current.push({
      id: nextIdRef.current++,
      text: `+${finalPoints} ${sourceText}`,
      x: obs.x,
      y: Math.max(70, Math.min(CANVAS_HEIGHT - 60, obs.y)),
      color: '#38bdf8',
      alpha: 1.0,
      life: 0,
    });

    // Antimatter Chain reaction
    const chainLevel = augmentsRef.current.antimatter_chain || 0;
    if (!skipChain && chainLevel > 0) {
      const chainRadius = 65 + chainLevel * 30;
      // Spawn chain shockwave ring
      for (const other of obstaclesRef.current) {
        if (!other.scored && other.id !== obs.id) {
          const dist = Math.hypot(other.x - obs.x, other.y - obs.y);
          if (dist < chainRadius) {
            destroyObstacle(other, 'CHAIN BLAST!', 1, true);
          }
        }
      }
    }
  };

  // Update Game Logic & 20 Augments Simulation
  const updateSimulation = (dt: number) => {
    const player = playerRef.current;
    const isHell = difficultyRef.current === 'HELL';
    const elapsed = isHell ? survivalTimeRef.current : Math.max(0, 60 - timeLeftRef.current);
    const effective = getEffectiveDifficulty(difficultyRef.current, elapsed);
    const diffConfig = effective.config;

    // Overclock Reactor multiplier for all active cooldowns
    const ocLevel = augmentsRef.current.overclock_reactor || 0;
    const ocCooldownScale = 1 - Math.min(0.6, ocLevel * 0.22);

    // 0. Update Invulnerability timer
    if (invulnTimerRef.current > 0) {
      invulnTimerRef.current = Math.max(0, invulnTimerRef.current - dt);
    }

    // 1. Detect HELL mode phase shifts: 0~2s(하), 3~5s(중), 6~10s(상), 11s+(지옥 2배속)
    if (isHell) {
      if (effective.subPhaseIndex !== lastHellPhaseRef.current) {
        const oldIndex = lastHellPhaseRef.current;
        const newIndex = effective.subPhaseIndex;
        lastHellPhaseRef.current = newIndex;

        if (newIndex > oldIndex) {
          sound.playPhaseShift(newIndex);
          screenShakeRef.current = 6;

          if (newIndex < 4) {
            const oldPhaseKey = oldIndex === 1 ? 'EASY' : oldIndex === 2 ? 'MEDIUM' : 'HARD';
            const prevBase = DIFFICULTY_SETTINGS[oldPhaseKey].baseObstacleSpeed;
            const newBase = effective.config.baseObstacleSpeed;
            const speedFactor = newBase / prevBase;

            for (const obs of obstaclesRef.current) {
              obs.speed = obs.speed * speedFactor;
            }
          }

          if (newIndex === 2) {
            phaseBannerRef.current = {
              text: '⚡ WARP 2 : [중] NORMAL SPEED UP',
              subText: '3~5초 구간: UFO 편대 접근 속도 상승 (+63px/s)',
              color: '#fbbf24',
              life: 0,
              maxLife: 1.8,
            };
          } else if (newIndex === 3) {
            phaseBannerRef.current = {
              text: '🚨 WARP 3 : [상] CRITICAL THREAT',
              subText: '6~10초 구간: 초광속 대규모 UFO 급습 (+63px/s)',
              color: '#f43f5e',
              life: 0,
              maxLife: 1.8,
            };
          } else if (newIndex === 4) {
            phaseBannerRef.current = {
              text: '🔥 HELL SURVIVAL : 지옥 점진 가속 돌입! 🔥',
              subText: '상중하 속도 차이(+63px/s)만큼 완만 가속 & 10초마다 증강 선택!',
              color: '#c084fc',
              life: 0,
              maxLife: 2.2,
            };
          }
        }
      }
    }

    // Banner life
    if (phaseBannerRef.current) {
      phaseBannerRef.current.life += dt;
      if (phaseBannerRef.current.life > phaseBannerRef.current.maxLife) {
        phaseBannerRef.current = null;
      }
    }

    // Speed progression ratio
    let speedRatio = 0;
    if (!isHell) {
      speedRatio = Math.max(0, elapsed / 60);
    } else {
      if (effective.subPhaseIndex === 1) {
        speedRatio = Math.min(1, elapsed / 2);
      } else if (effective.subPhaseIndex === 2) {
        speedRatio = Math.min(1, (elapsed - 3) / 2);
      } else if (effective.subPhaseIndex === 3) {
        speedRatio = Math.min(1, (elapsed - 6) / 4);
      } else {
        speedRatio = 1.0;
      }
    }

    const circuitSpeed = diffConfig.roadBaseSpeed + speedRatio * (diffConfig.roadMaxSpeed - diffConfig.roadBaseSpeed);
    trackOffsetRef.current = (trackOffsetRef.current + circuitSpeed * dt) % 120;

    // Parallax stars
    for (const star of starsRef.current) {
      star.y = (star.y + circuitSpeed * star.speedMul * 0.45 * dt) % CANVAS_HEIGHT;
    }

    // ==========================================
    // AUGMENT SIMULATION (20 Augments Logic)
    // ==========================================

    // A. Shield Recharge Logic
    const shieldLevel = augmentsRef.current.shield || 0;
    if (shieldLevel > 0) {
      const maxShield = shieldLevel;
      if (shieldChargesRef.current < maxShield) {
        shieldRechargeTimerRef.current -= dt;
        if (shieldRechargeTimerRef.current <= 0) {
          shieldChargesRef.current++;
          floatingTextsRef.current.push({
            id: nextIdRef.current++,
            text: '🛡️ 실드 재충전!',
            x: player.x,
            y: player.y - 30,
            color: '#38bdf8',
            alpha: 1.0,
            life: 0,
          });
          shieldRechargeTimerRef.current = Math.max(8, 20 - shieldLevel * 3) * ocCooldownScale;
        }
      }
    }

    // B. Hyper Booster Logic
    const boosterLevel = augmentsRef.current.booster || 0;
    if (boosterLevel > 0) {
      if (boosterActiveTimerRef.current > 0) {
        boosterActiveTimerRef.current -= dt;
        invulnTimerRef.current = Math.max(invulnTimerRef.current, 0.2);

        // Hyper Booster thrust particles
        particlesRef.current.push({
          x: player.x + (Math.random() * 16 - 8),
          y: player.y + player.height * 0.45,
          vx: (Math.random() - 0.5) * 30,
          vy: 350 + Math.random() * 150,
          color: Math.random() > 0.5 ? '#f59e0b' : '#ffffff',
          size: Math.random() * 5 + 3,
          alpha: 0.9,
          life: 0,
          maxLife: 0.25,
        });

        // Destroy any UFO in player lane
        for (const obs of obstaclesRef.current) {
          if (!obs.scored && obs.lane === player.lane && Math.abs(obs.y - player.y) < 180) {
            destroyObstacle(obs, 'BOOSTER SMASH!', 1);
          }
        }
      } else {
        boosterCooldownRef.current -= dt;
        if (boosterCooldownRef.current <= 0) {
          boosterActiveTimerRef.current = 2.2;
          sound.playPhaseShift(3);
          screenShakeRef.current = 8;
          boosterCooldownRef.current = Math.max(6, 13 - boosterLevel * 2) * ocCooldownScale;
        }
      }
    }

    // C. Photon Laser Logic
    const laserLevel = augmentsRef.current.laser || 0;
    if (laserLevel > 0) {
      if (laserFlashAlphaRef.current > 0) {
        laserFlashAlphaRef.current = Math.max(0, laserFlashAlphaRef.current - dt * 4.5);
      }
      laserCooldownRef.current -= dt;
      if (laserCooldownRef.current <= 0) {
        laserFlashAlphaRef.current = 1.0;
        sound.playLaser();
        screenShakeRef.current = 5;

        // Blast all UFOs in player's lane ahead
        for (const obs of obstaclesRef.current) {
          if (!obs.scored && obs.lane === player.lane && obs.y < player.y) {
            destroyObstacle(obs, 'LASER BLAST!', 1);
          }
        }

        laserCooldownRef.current = Math.max(1.4, 4.0 - laserLevel * 0.6) * ocCooldownScale;
      }
    }

    // D. EMP Pulse Logic
    const empLevel = augmentsRef.current.emp_pulse || 0;
    if (empLevel > 0) {
      if (empRingRadiusRef.current > 0) {
        empRingRadiusRef.current += dt * 550;
        if (empRingRadiusRef.current > CANVAS_HEIGHT) {
          empRingRadiusRef.current = 0;
        }
      }
      if (empStunTimerRef.current > 0) {
        empStunTimerRef.current = Math.max(0, empStunTimerRef.current - dt);
      }
      empCooldownRef.current -= dt;
      if (empCooldownRef.current <= 0) {
        sound.playEmp();
        screenShakeRef.current = 9;
        empRingRadiusRef.current = 10;
        empStunTimerRef.current = 1.8 + empLevel * 0.4;
        empCooldownRef.current = Math.max(6, 9 - empLevel) * ocCooldownScale;

        floatingTextsRef.current.push({
          id: nextIdRef.current++,
          text: '⚡ EMP 방출 (UFO 정지)!',
          x: CANVAS_WIDTH / 2,
          y: 180,
          color: '#60a5fa',
          alpha: 1.0,
          life: 0,
        });
      }
    }

    // E. Homing Missiles Logic
    const missileLevel = augmentsRef.current.homing_missiles || 0;
    if (missileLevel > 0) {
      missileCooldownRef.current -= dt;
      if (missileCooldownRef.current <= 0) {
        sound.playMissile();
        const missileCount = 1 + missileLevel;
        for (let m = 0; m < missileCount; m++) {
          const side = m % 2 === 0 ? -1 : 1;
          missilesRef.current.push({
            id: nextIdRef.current++,
            x: player.x + side * 16,
            y: player.y - 10,
            vx: side * (Math.random() * 40 + 30),
            vy: -180,
            targetId: null,
            life: 0,
          });
        }
        missileCooldownRef.current = Math.max(1.8, 3.8 - missileLevel * 0.5) * ocCooldownScale;
      }

      // Update active missiles
      const aliveMissiles: HomingMissile[] = [];
      for (const ms of missilesRef.current) {
        ms.life += dt;

        // Find nearest living obstacle ahead
        let nearestObs: ObstacleCar | null = null;
        let minDist = 9999;
        for (const obs of obstaclesRef.current) {
          if (!obs.scored && obs.y < ms.y + 40) {
            const d = Math.hypot(obs.x - ms.x, obs.y - ms.y);
            if (d < minDist) {
              minDist = d;
              nearestObs = obs;
            }
          }
        }

        if (nearestObs) {
          const dx = nearestObs.x - ms.x;
          const dy = nearestObs.y - ms.y;
          const angle = Math.atan2(dy, dx);
          const missileSpeed = 440;
          ms.vx = Math.cos(angle) * missileSpeed;
          ms.vy = Math.sin(angle) * missileSpeed;

          // Check hit
          if (minDist < 26) {
            destroyObstacle(nearestObs, 'MISSILE IMPACT!', 1);
            continue; // missile consumed
          }
        } else {
          ms.vy -= dt * 300;
        }

        ms.x += ms.vx * dt;
        ms.y += ms.vy * dt;

        // Missile smoke
        if (Math.random() < 0.6) {
          particlesRef.current.push({
            x: ms.x,
            y: ms.y + 4,
            vx: (Math.random() - 0.5) * 15,
            vy: Math.random() * 20 + 10,
            color: '#a78bfa',
            size: 2,
            alpha: 0.6,
            life: 0,
            maxLife: 0.2,
          });
        }

        if (ms.y > -20 && ms.life < 2.5) {
          aliveMissiles.push(ms);
        }
      }
      missilesRef.current = aliveMissiles;
    }

    // F. Titan Surge Logic
    const titanLevel = augmentsRef.current.titan_surge || 0;
    if (titanLevel > 0) {
      if (titanActiveTimerRef.current > 0) {
        titanActiveTimerRef.current -= dt;
        invulnTimerRef.current = Math.max(invulnTimerRef.current, 0.2);

        // Titan aura crush
        for (const obs of obstaclesRef.current) {
          if (!obs.scored && Math.hypot(obs.x - player.x, obs.y - player.y) < 70) {
            destroyObstacle(obs, 'TITAN CRUSH!', 2);
          }
        }
      } else {
        titanCooldownRef.current -= dt;
        if (titanCooldownRef.current <= 0) {
          titanActiveTimerRef.current = 3.0 + titanLevel * 0.7;
          sound.playPhaseShift(4);
          screenShakeRef.current = 12;
          titanCooldownRef.current = Math.max(10, 16 - titanLevel * 2) * ocCooldownScale;
        }
      }
    }

    // G. Stealth Cloak Logic
    const stealthLevel = augmentsRef.current.stealth_cloak || 0;
    if (stealthLevel > 0) {
      if (stealthActiveTimerRef.current > 0) {
        stealthActiveTimerRef.current -= dt;
        invulnTimerRef.current = Math.max(invulnTimerRef.current, 0.2);
      } else {
        stealthCooldownRef.current -= dt;
        if (stealthCooldownRef.current <= 0) {
          stealthActiveTimerRef.current = 2.2 + stealthLevel * 0.5;
          stealthCooldownRef.current = Math.max(6, 10 - stealthLevel) * ocCooldownScale;
        }
      }
    }

    // H. Deflector Barrier & Emergency Warp cooldown updates
    if (deflectorCooldownRef.current > 0) {
      deflectorCooldownRef.current = Math.max(0, deflectorCooldownRef.current - dt);
    }
    if (deflectorFlashTimerRef.current > 0) {
      deflectorFlashTimerRef.current = Math.max(0, deflectorFlashTimerRef.current - dt);
    }
    if (emergencyWarpCooldownRef.current > 0) {
      emergencyWarpCooldownRef.current = Math.max(0, emergencyWarpCooldownRef.current - dt);
    }

    // ==========================================
    // PLAYER MOTION & LERP (Quantum Warp speedup)
    // ==========================================
    const quantumWarpLevel = augmentsRef.current.quantum_warp || 0;
    const LERP_DURATION = quantumWarpLevel > 0 ? 0.04 : 0.08;

    if (player.isMoving) {
      player.lerpProgress += dt / LERP_DURATION;
      const t = Math.min(1.0, player.lerpProgress);
      const ease = 1 - (1 - t) * (1 - t);
      player.x = player.startX + (player.targetX - player.startX) * ease;

      const dir = player.targetX > player.startX ? 1 : -1;
      player.tilt = dir * 0.18 * (1 - t);

      // Plasma Ram: while shifting lanes, destroy any touching obstacle
      const ramLevel = augmentsRef.current.plasma_ram || 0;
      if (ramLevel > 0) {
        const ramRadius = 40 + ramLevel * 10;
        for (const obs of obstaclesRef.current) {
          if (!obs.scored && Math.hypot(obs.x - player.x, obs.y - player.y) < ramRadius) {
            destroyObstacle(obs, 'RAM SMASH!', 1);
          }
        }
      }

      // RCS nitrogen jet smoke on lane shift
      if (Math.random() < 0.6) {
        particlesRef.current.push({
          x: player.x - dir * 14,
          y: player.y - player.height * 0.35,
          vx: -dir * (Math.random() * 40 + 20),
          vy: Math.random() * 20 - 10,
          color: '#38bdf8',
          size: Math.random() * 2 + 1,
          alpha: 0.7,
          life: 0,
          maxLife: 0.18,
        });
      }

      if (t >= 1.0) {
        player.x = player.targetX;
        player.isMoving = false;
        player.tilt = 0;
      }
    } else {
      player.tilt = 0;
    }

    // Decay screen shake
    if (screenShakeRef.current > 0) {
      screenShakeRef.current = Math.max(0, screenShakeRef.current - dt * 30);
    }

    // Plasma Engine Particles
    if (Math.random() < 0.8) {
      particlesRef.current.push({
        x: player.x + (Math.random() * 14 - 7),
        y: player.y + player.height * 0.44,
        vx: (Math.random() - 0.5) * 12,
        vy: circuitSpeed * 0.35 + Math.random() * 60 + 40,
        color: Math.random() > 0.4 ? '#38bdf8' : Math.random() > 0.5 ? '#f97316' : '#ffffff',
        size: Math.random() * 2.8 + 1.2,
        alpha: 0.65,
        life: 0,
        maxLife: 0.22,
      });
    }

    // Plasma Wake Trail: burns obstacles trailing behind engines
    const wakeLevel = augmentsRef.current.plasma_wake || 0;
    if (wakeLevel > 0) {
      const wakeLength = 40 + wakeLevel * 25;
      for (const obs of obstaclesRef.current) {
        if (
          !obs.scored &&
          Math.abs(obs.x - player.x) < 32 &&
          obs.y > player.y &&
          obs.y < player.y + player.height * 0.5 + wakeLength
        ) {
          destroyObstacle(obs, 'WAKE BURN!', 1);
        }
      }
    }

    // Orbital Drones Collision with UFOs
    const droneLevel = augmentsRef.current.orbital_drones || 0;
    if (droneLevel > 0) {
      const droneCount = Math.min(4, droneLevel);
      const droneRadius = 48;
      const droneAngleBase = (performance.now() / 1000) * 3.5;
      for (let i = 0; i < droneCount; i++) {
        const angle = droneAngleBase + (i * Math.PI * 2) / droneCount;
        const dx = player.x + Math.cos(angle) * droneRadius;
        const dy = player.y + Math.sin(angle) * (droneRadius * 0.6);

        for (const obs of obstaclesRef.current) {
          if (!obs.scored && Math.hypot(obs.x - dx, obs.y - dy) < 26) {
            destroyObstacle(obs, 'DRONE IMPACT!', 1);
          }
        }
      }
    }

    // Spawning Obstacles dynamically
    const currentSpawnInterval =
      diffConfig.initialSpawnInterval -
      speedRatio * (diffConfig.initialSpawnInterval - diffConfig.minSpawnInterval);
    spawnTimerRef.current -= dt;

    if (spawnTimerRef.current <= 0) {
      const minFloor = isHell && effective.subPhaseIndex === 4 ? 0.12 : 0.18;
      spawnTimerRef.current = Math.max(minFloor, currentSpawnInterval + (Math.random() * 0.08 - 0.03));
      spawnObstacle();
    }

    // ==========================================
    // HITBOX SIZE & SHRINK AUGMENT
    // ==========================================
    const shrinkLevel = augmentsRef.current.shrink_drive || 0;
    const shrinkScale = 1 - Math.min(0.55, shrinkLevel * 0.2);

    const PLAYER_HITBOX_W = player.width * 0.78 * shrinkScale;
    const PLAYER_HITBOX_H = player.height * 0.82 * shrinkScale;

    const playerBox = {
      left: player.x - PLAYER_HITBOX_W / 2,
      right: player.x + PLAYER_HITBOX_W / 2,
      top: player.y - PLAYER_HITBOX_H / 2,
      bottom: player.y + PLAYER_HITBOX_H / 2,
    };

    // Gravity Repulsor: Push UFOs away from player
    const repulsorLevel = augmentsRef.current.gravity_repulsor || 0;
    const repulsorRadius = 100 + repulsorLevel * 25;
    const repulsorForce = 140 + repulsorLevel * 50;

    // Chrono Slow: permanent UFO speed reduction
    const chronoLevel = augmentsRef.current.chrono_slow || 0;
    const chronoMultiplier = 1 - Math.min(0.5, chronoLevel * 0.15);

    // Deflector Barrier check
    const deflectorLevel = augmentsRef.current.deflector_barrier || 0;

    const remainingObstacles: ObstacleCar[] = [];

    for (let i = 0; i < obstaclesRef.current.length; i++) {
      const obs = obstaclesRef.current[i];

      // Gravity repulsor effect
      if (repulsorLevel > 0) {
        const distToPlayer = Math.hypot(obs.x - player.x, obs.y - player.y);
        if (distToPlayer < repulsorRadius) {
          const pushDir = obs.x < player.x ? -1 : 1;
          obs.x += pushDir * repulsorForce * dt;
          // Clamp within corridor
          obs.x = Math.max(TRACK_START_X + 20, Math.min(CANVAS_WIDTH - TRACK_START_X - 20, obs.x));
        }
      }

      // EMP freeze / stun: if active, moves at 10% speed
      const empSpeedMult = empStunTimerRef.current > 0 ? 0.1 : 1.0;

      // Obstacle motion
      obs.y += obs.speed * (1 + speedRatio * 0.35) * chronoMultiplier * empSpeedMult * dt;

      // Deflector check
      if (
        deflectorLevel > 0 &&
        deflectorCooldownRef.current <= 0 &&
        Math.abs(obs.x - player.x) < 28 &&
        obs.y > player.y - 75 &&
        obs.y < player.y - 20
      ) {
        obs.y -= 350; // Bounces far back into space
        sound.playShieldBreak();
        deflectorFlashTimerRef.current = 0.3;
        deflectorCooldownRef.current = Math.max(4, 9 - deflectorLevel * 1.5) * ocCooldownScale;
        screenShakeRef.current = 6;
        floatingTextsRef.current.push({
          id: nextIdRef.current++,
          text: '🛡️ 이온 반사!',
          x: obs.x,
          y: player.y - 60,
          color: '#38bdf8',
          alpha: 1.0,
          life: 0,
        });
      }

      const OBS_HITBOX_W = obs.width * 0.8;
      const OBS_HITBOX_H = obs.height * 0.8;

      const obsBox = {
        left: obs.x - OBS_HITBOX_W / 2,
        right: obs.x + OBS_HITBOX_W / 2,
        top: obs.y - OBS_HITBOX_H / 2,
        bottom: obs.y + OBS_HITBOX_H / 2,
      };

      const isColliding =
        playerBox.left < obsBox.right &&
        playerBox.right > obsBox.left &&
        playerBox.top < obsBox.bottom &&
        playerBox.bottom > obsBox.top;

      if (isColliding) {
        // If player is currently invulnerable (stealth, booster, titan, or post-hit grace)
        if (
          invulnTimerRef.current > 0 ||
          boosterActiveTimerRef.current > 0 ||
          titanActiveTimerRef.current > 0 ||
          stealthActiveTimerRef.current > 0
        ) {
          destroyObstacle(obs, 'INVULN CRUSH!', 1);
          continue;
        }

        // Check Shield
        if (shieldChargesRef.current > 0) {
          shieldChargesRef.current--;
          sound.playShieldBreak();
          invulnTimerRef.current = 1.8;
          screenShakeRef.current = 12;
          shieldRechargeTimerRef.current = Math.max(8, 20 - (augmentsRef.current.shield || 1) * 3) * ocCooldownScale;

          // Shatter wave destroys colliding UFO
          destroyObstacle(obs, 'SHIELD ABSORB!', 1);

          floatingTextsRef.current.push({
            id: nextIdRef.current++,
            text: '🛡️ 실드 방어!',
            x: player.x,
            y: player.y - 45,
            color: '#38bdf8',
            alpha: 1.0,
            life: 0,
          });
          continue;
        }

        // Check Emergency Warp
        const emWarpLevel = augmentsRef.current.emergency_warp || 0;
        if (emWarpLevel > 0 && emergencyWarpCooldownRef.current <= 0) {
          // Find safe adjacent lane
          const otherLanes: LaneIndex[] = ([0, 1, 2] as LaneIndex[]).filter((l) => l !== player.lane);
          const targetLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
          setPlayerLane(targetLane);
          emergencyWarpCooldownRef.current = Math.max(12, 32 - emWarpLevel * 5) * ocCooldownScale;
          invulnTimerRef.current = 1.2;
          sound.playPhaseShift(3);
          screenShakeRef.current = 10;

          floatingTextsRef.current.push({
            id: nextIdRef.current++,
            text: '✨ 비상 긴급 도약!',
            x: LANE_CENTERS[targetLane],
            y: player.y - 45,
            color: '#fbbf24',
            alpha: 1.0,
            life: 0,
          });
          continue;
        }

        // Check Nano Revive (Extra Life)
        if (nanoRevivesRemainingRef.current > 0) {
          nanoRevivesRemainingRef.current--;
          sound.playStart();
          invulnTimerRef.current = 2.5;
          screenShakeRef.current = 18;

          // Huge revival shockwave destroys nearby obstacles
          for (const other of obstaclesRef.current) {
            if (!other.scored && Math.hypot(other.x - player.x, other.y - player.y) < 180) {
              destroyObstacle(other, 'REVIVE BLAST!', 1, true);
            }
          }

          floatingTextsRef.current.push({
            id: nextIdRef.current++,
            text: '❤️ 나노 선체 복구 (부활)!',
            x: player.x,
            y: player.y - 50,
            color: '#22c55e',
            alpha: 1.0,
            life: 0,
          });
          continue;
        }

        // LETHAL CRASH
        sound.playCrash();
        screenShakeRef.current = 22;

        for (let p = 0; p < 36; p++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 260 + 60;
          particlesRef.current.push({
            x: (player.x + obs.x) / 2,
            y: (player.y + obs.y) / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: Math.random() > 0.5 ? '#38bdf8' : Math.random() > 0.5 ? '#f43f5e' : '#fbbf24',
            size: Math.random() * 4.5 + 2,
            alpha: 1.0,
            life: 0,
            maxLife: 0.55,
          });
        }

        onCrashImmediate();
        return;
      }

      // Dodge Score: when passing screen bottom
      if (!obs.scored && obs.y > CANVAS_HEIGHT + obs.height) {
        obs.scored = true;
        const scoreOverdrive = augmentsRef.current.score_overdrive || 0;
        const points = 1 + scoreOverdrive;
        onScoreIncrement(points);
        sound.playDodge();

        floatingTextsRef.current.push({
          id: nextIdRef.current++,
          text: `+${points} EVADED`,
          x: obs.x,
          y: CANVAS_HEIGHT - 35,
          color: '#38bdf8',
          alpha: 1.0,
          life: 0,
        });
      }

      if (obs.y <= CANVAS_HEIGHT + obs.height + 40) {
        remainingObstacles.push(obs);
      }
    }

    obstaclesRef.current = remainingObstacles;

    // Particles update
    const remainingParticles: Particle[] = [];
    for (const p of particlesRef.current) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life < p.maxLife) {
        remainingParticles.push(p);
      }
    }
    particlesRef.current = remainingParticles;

    // Floating Texts update
    const remainingTexts: FloatingText[] = [];
    for (const t of floatingTextsRef.current) {
      t.y -= 45 * dt;
      t.life += dt;
      t.alpha = Math.max(0, 1 - t.life / 0.7);
      if (t.life < 0.7) {
        remainingTexts.push(t);
      }
    }
    floatingTextsRef.current = remainingTexts;
  };

  // Safe fair alien UFO spawner
  const spawnObstacle = () => {
    const isHell = difficultyRef.current === 'HELL';
    const elapsed = isHell ? survivalTimeRef.current : Math.max(0, 60 - timeLeftRef.current);
    const effective = getEffectiveDifficulty(difficultyRef.current, elapsed);
    const diffConfig = effective.config;
    const occupiedLanes = new Set<LaneIndex>();
    const clearanceY = 115 + (diffConfig.baseObstacleSpeed - 203) * 0.14;
    for (const obs of obstaclesRef.current) {
      if (obs.y < clearanceY) {
        occupiedLanes.add(obs.lane);
      }
    }

    const availableLanes: LaneIndex[] = ([0, 1, 2] as LaneIndex[]).filter(
      (lane) => !occupiedLanes.has(lane)
    );

    if (availableLanes.length === 0) return;

    const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    const baseSpeed = diffConfig.baseObstacleSpeed + Math.random() * diffConfig.speedVariation;

    obstaclesRef.current.push({
      id: nextIdRef.current++,
      lane: chosenLane,
      x: LANE_CENTERS[chosenLane],
      y: -75,
      width: 48,
      height: 48,
      speed: baseSpeed,
      passedPlayer: false,
      scored: false,
      variant: Math.floor(Math.random() * 3),
    });
  };

  // Render Scene
  const renderScene = (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.save();

    if (screenShakeRef.current > 0) {
      const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
      const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Deep Space Flight Corridor & Stars
    drawSpaceFlightCorridor(ctx, time);

    // 2. Draw Photon Laser Beam (if active)
    if (laserFlashAlphaRef.current > 0) {
      const player = playerRef.current;
      ctx.save();
      ctx.globalAlpha = laserFlashAlphaRef.current;
      ctx.strokeStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 30);
      ctx.lineTo(player.x, 0);
      ctx.stroke();

      // Inner white beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 30);
      ctx.lineTo(player.x, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw EMP Pulse Wave (if active)
    if (empRingRadiusRef.current > 0) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 4;
      ctx.globalAlpha = Math.max(0, 1 - empRingRadiusRef.current / CANVAS_HEIGHT);
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, empRingRadiusRef.current, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Alien UFOs (Obstacles)
    for (const obs of obstaclesRef.current) {
      drawAlienUFO(ctx, obs.x, obs.y, obs.width, obs.height, obs.variant, time);
    }

    // 5. Draw Homing Missiles
    for (const ms of missilesRef.current) {
      ctx.save();
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Draw NASA Space Shuttle (Player) with Augments visuals
    const player = playerRef.current;
    drawSpaceShuttle(ctx, player.x, player.y, player.width, player.height, player.tilt, time);

    // 7. Draw Orbital Drones
    const droneLevel = augmentsRef.current.orbital_drones || 0;
    if (droneLevel > 0) {
      const droneCount = Math.min(4, droneLevel);
      const droneRadius = 48;
      const droneAngleBase = time * 3.5;
      for (let i = 0; i < droneCount; i++) {
        const angle = droneAngleBase + (i * Math.PI * 2) / droneCount;
        const dx = player.x + Math.cos(angle) * droneRadius;
        const dy = player.y + Math.sin(angle) * (droneRadius * 0.6);

        ctx.save();
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 8. Draw Deflector Flash Barrier
    if (deflectorFlashTimerRef.current > 0) {
      ctx.save();
      ctx.strokeStyle = '#67e8f9';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 45, 35, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Draw Particles (Plasma Thrust & Explosion Sparks)
    for (const p of particlesRef.current) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 10. Draw Floating Texts
    for (const t of floatingTextsRef.current) {
      ctx.save();
      ctx.font = '900 12px system-ui, sans-serif';
      ctx.fillStyle = t.color;
      ctx.globalAlpha = t.alpha;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    // 11. Draw HELL Phase Shift Banner (if active)
    if (phaseBannerRef.current && phaseBannerRef.current.life < phaseBannerRef.current.maxLife) {
      const banner = phaseBannerRef.current;
      const progress = banner.life / banner.maxLife;
      let alpha = 1.0;
      if (progress < 0.15) {
        alpha = progress / 0.15;
      } else if (progress > 0.7) {
        alpha = (1 - progress) / 0.3;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const bannerY = 85;
      const bannerW = 310;
      const bannerH = 46;
      const bannerX = (CANVAS_WIDTH - bannerW) / 2;

      ctx.fillStyle = 'rgba(5, 9, 20, 0.92)';
      ctx.strokeStyle = banner.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = banner.color;
      ctx.font = '900 12px system-ui, sans-serif';
      ctx.shadowColor = banner.color;
      ctx.shadowBlur = 6;
      ctx.fillText(banner.text, CANVAS_WIDTH / 2, bannerY + 19);

      ctx.font = '700 9.5px system-ui, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowBlur = 0;
      ctx.fillText(banner.subText, CANVAS_WIDTH / 2, bannerY + 35);

      ctx.restore();
    }

    ctx.restore();
  };

  // Draw Deep Space Flight Corridor & Cosmic Warp Rails
  const drawSpaceFlightCorridor = (ctx: CanvasRenderingContext2D, time: number) => {
    const offset = trackOffsetRef.current;

    // 1. Deep Space Cosmic Void Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#02040a');
    bgGrad.addColorStop(0.5, '#050914');
    bgGrad.addColorStop(1, '#02040a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Cosmic Nebulae
    const neb1 = ctx.createRadialGradient(80, 160, 20, 80, 160, 180);
    neb1.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
    neb1.addColorStop(0.6, 'rgba(147, 51, 234, 0.04)');
    neb1.addColorStop(1, 'transparent');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const neb2 = ctx.createRadialGradient(280, 420, 20, 280, 420, 160);
    neb2.addColorStop(0, 'rgba(6, 182, 212, 0.07)');
    neb2.addColorStop(0.7, 'rgba(168, 85, 247, 0.03)');
    neb2.addColorStop(1, 'transparent');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 3. Parallax Starfield
    for (const star of starsRef.current) {
      const twinkle = Math.sin(time * 3 + star.twinkleOffset) * 0.25 + 0.75;
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.baseAlpha * twinkle;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();

      if (star.speedMul > 0.65) {
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x, star.y - star.size * 3.5);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // 4. Warp Corridor Central Flight Zone
    ctx.fillStyle = 'rgba(6, 11, 25, 0.55)';
    ctx.fillRect(TRACK_START_X, 0, ROAD_WIDTH, CANVAS_HEIGHT);

    // 5. Outer Laser Energy Containment Rails
    const railGlowPulse = Math.sin(time * 6) * 0.2 + 0.8;

    ctx.save();
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10 * railGlowPulse;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(TRACK_START_X, 0);
    ctx.lineTo(TRACK_START_X, CANVAS_HEIGHT);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - TRACK_START_X, 0);
    ctx.lineTo(CANVAS_WIDTH - TRACK_START_X, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.restore();

    // 6. Holographic Dashed Warp Lane Dividers
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.40)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    ctx.lineDashOffset = -offset * 1.5;

    const div1X = TRACK_START_X + LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(div1X, 0);
    ctx.lineTo(div1X, CANVAS_HEIGHT);
    ctx.stroke();

    const div2X = TRACK_START_X + LANE_WIDTH * 2;
    ctx.beginPath();
    ctx.moveTo(div2X, 0);
    ctx.lineTo(div2X, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.restore();

    // 7. Subtle holographic speed chevrons
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.lineWidth = 2;
    const chevronSpacing = 140;
    const chevronY = (offset * 1.5) % chevronSpacing;
    for (let y = chevronY - chevronSpacing; y < CANVAS_HEIGHT + chevronSpacing; y += chevronSpacing) {
      for (const lx of LANE_CENTERS) {
        ctx.beginPath();
        ctx.moveTo(lx - 12, y);
        ctx.lineTo(lx, y - 8);
        ctx.lineTo(lx + 12, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // Draw NASA Space Shuttle (우주왕복선) with Augments visual effects
  const drawSpaceShuttle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    tilt: number,
    time: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    const isTitan = titanActiveTimerRef.current > 0;
    const isBooster = boosterActiveTimerRef.current > 0;
    const isStealth = stealthActiveTimerRef.current > 0;
    const hasShield = shieldChargesRef.current > 0;
    const isInvuln = invulnTimerRef.current > 0;

    // Titan mode scale up
    if (isTitan) {
      ctx.scale(1.28, 1.28);
    }

    // Stealth transparency
    if (isStealth) {
      ctx.globalAlpha = 0.35 + Math.sin(time * 15) * 0.15;
    } else if (isInvuln) {
      ctx.globalAlpha = Math.sin(time * 25) > 0 ? 0.9 : 0.4;
    }

    // Dedicated Invulnerability Protective Field (2s post-augment or grace period)
    if (isInvuln) {
      ctx.save();
      const invulPulse = Math.sin(time * 18) * 0.2 + 0.8;
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.9 * invulPulse})`;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -time * 40;
      ctx.beginPath();
      ctx.ellipse(0, -2, w * 0.78, h * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
      ctx.fill();

      // Countdown badge above shuttle
      ctx.setLineDash([]);
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`무적 ${invulnTimerRef.current.toFixed(1)}s`, 0, -h * 0.56);
      ctx.restore();
    }

    // B. Shield Bubble (if active)
    if (hasShield) {
      ctx.save();
      const shieldGlow = Math.sin(time * 6) * 0.15 + 0.85;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 * shieldGlow})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, -2, w * 0.72, h * 0.58, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fill();
      ctx.restore();
    }

    // C. Rocket Thrusters (SSME Engines)
    const flameFlicker = Math.sin(time * 35) * 3 + Math.cos(time * 23) * 2;
    const flameLen = (isBooster ? 45 : 22) + flameFlicker;

    const enginePositions = [
      { x: -9, y: h * 0.42 },
      { x: 9, y: h * 0.42 },
      { x: 0, y: h * 0.45 },
    ];

    for (const eng of enginePositions) {
      ctx.save();
      const flameGrad = ctx.createLinearGradient(eng.x, eng.y, eng.x, eng.y + flameLen);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.2, isBooster ? '#fbbf24' : '#38bdf8');
      flameGrad.addColorStop(0.6, isBooster ? '#ef4444' : '#f97316');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(eng.x - 3.5, eng.y);
      ctx.lineTo(eng.x + 3.5, eng.y);
      ctx.lineTo(eng.x, eng.y + flameLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#334155';
      ctx.fillRect(eng.x - 3, eng.y - 2, 6, 3.5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eng.x - 2, eng.y + 0.5, 4, 1.5);
    }

    // D. White Orbiter Body & Wings (Golden if Titan)
    ctx.fillStyle = isTitan ? '#fbbf24' : '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.48);
    ctx.quadraticCurveTo(w * 0.16, -h * 0.32, w * 0.18, -h * 0.08);
    ctx.lineTo(w * 0.52, h * 0.28);
    ctx.lineTo(w * 0.52, h * 0.38);
    ctx.lineTo(w * 0.22, h * 0.38);
    ctx.lineTo(w * 0.20, h * 0.44);
    ctx.lineTo(-w * 0.20, h * 0.44);
    ctx.lineTo(-w * 0.22, h * 0.38);
    ctx.lineTo(-w * 0.52, h * 0.38);
    ctx.lineTo(-w * 0.52, h * 0.28);
    ctx.lineTo(-w * 0.18, -h * 0.08);
    ctx.quadraticCurveTo(-w * 0.16, -h * 0.32, 0, -h * 0.48);
    ctx.closePath();
    ctx.fill();

    // E. Black Thermal Heat Shield Tiles
    ctx.fillStyle = isTitan ? '#78350f' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.48);
    ctx.quadraticCurveTo(w * 0.12, -h * 0.38, w * 0.12, -h * 0.34);
    ctx.lineTo(-w * 0.12, -h * 0.34);
    ctx.quadraticCurveTo(-w * 0.12, -h * 0.38, 0, -h * 0.48);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isTitan ? '#92400e' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, -h * 0.08);
    ctx.lineTo(w * 0.52, h * 0.28);
    ctx.lineTo(w * 0.48, h * 0.30);
    ctx.lineTo(w * 0.16, -h * 0.06);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.08);
    ctx.lineTo(-w * 0.52, h * 0.28);
    ctx.lineTo(-w * 0.48, h * 0.30);
    ctx.lineTo(-w * 0.16, -h * 0.06);
    ctx.closePath();
    ctx.fill();

    // F. Cockpit Cabin Windows
    ctx.fillStyle = isTitan ? '#fef08a' : '#0284c7';
    ctx.beginPath();
    ctx.moveTo(-4, -h * 0.32);
    ctx.lineTo(4, -h * 0.32);
    ctx.lineTo(5, -h * 0.26);
    ctx.lineTo(-5, -h * 0.26);
    ctx.closePath();
    ctx.fill();

    // G. Vertical Stabilizer Tail Fin
    ctx.fillStyle = isTitan ? '#fbbf24' : '#f8fafc';
    ctx.fillRect(-2, h * 0.08, 4, 26);
    ctx.fillStyle = isTitan ? '#d97706' : '#cbd5e1';
    ctx.fillRect(-0.5, h * 0.08, 1, 26);

    // H. Plasma Ram Arc on Nose (if active and shifting)
    const ramLevel = augmentsRef.current.plasma_ram || 0;
    if (ramLevel > 0 && playerRef.current.isMoving) {
      ctx.save();
      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -h * 0.45, 16, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.stroke();
      ctx.restore();
    }

    // I. Shrink Drive holographic outline
    const shrinkLevel = augmentsRef.current.shrink_drive || 0;
    if (shrinkLevel > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-w * 0.35, -h * 0.35, w * 0.7, h * 0.7);
      ctx.restore();
    }

    ctx.restore();
  };

  // Draw Alien Flying Saucer / UFO (외계 비행접시)
  const drawAlienUFO = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    variant: number,
    time: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    let coreGlow = '#ef4444';
    let domeColor = '#f87171';
    let lightColor1 = '#f43f5e';
    let lightColor2 = '#fbbf24';
    let discGrad0 = '#1e1b4b';
    let discGrad1 = '#475569';
    let beamColor = 'rgba(239, 68, 68, 0.3)';

    if (variant === 1) {
      coreGlow = '#a855f7';
      domeColor = '#4ade80';
      lightColor1 = '#a855f7';
      lightColor2 = '#22c55e';
      discGrad0 = '#2e1065';
      discGrad1 = '#334155';
      beamColor = 'rgba(168, 85, 247, 0.3)';
    } else if (variant === 2) {
      coreGlow = '#06b6d4';
      domeColor = '#38bdf8';
      lightColor1 = '#06b6d4';
      lightColor2 = '#fbbf24';
      discGrad0 = '#082f49';
      discGrad1 = '#64748b';
      beamColor = 'rgba(6, 182, 212, 0.3)';
    }

    // EMP Stun electric spark rendering
    if (empStunTimerRef.current > 0) {
      ctx.save();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 3; s++) {
        const sx = (Math.random() - 0.5) * w;
        const sy = (Math.random() - 0.5) * h;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 12, sy + (Math.random() - 0.5) * 12);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 1. Anti-Gravity Tractor Beam Cone
    const pulse = Math.sin(time * 8 + x * 0.05) * 0.2 + 0.8;
    const beamGrad = ctx.createLinearGradient(0, 0, 0, h * 0.9);
    beamGrad.addColorStop(0, beamColor);
    beamGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, 0);
    ctx.lineTo(w * 0.25, 0);
    ctx.lineTo(w * 0.4 * pulse, h * 0.85);
    ctx.lineTo(-w * 0.4 * pulse, h * 0.85);
    ctx.closePath();
    ctx.fill();

    // 2. Anti-Gravity Shadow / Halo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 6, w * 0.5, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Main Saucer Metallic Disc
    const discGrad = ctx.createRadialGradient(0, -2, 4, 0, 0, w * 0.5);
    discGrad.addColorStop(0, '#94a3b8');
    discGrad.addColorStop(0.5, discGrad1);
    discGrad.addColorStop(1, discGrad0);

    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.48, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = coreGlow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Rotating Perimeter Alien Lights
    const numLights = 8;
    const rotSpeed = 3.5;
    for (let i = 0; i < numLights; i++) {
      const angle = (i * (Math.PI * 2)) / numLights + time * rotSpeed;
      const lx = Math.cos(angle) * (w * 0.4);
      const ly = Math.sin(angle) * (h * 0.24) + 2;
      const depth = Math.sin(angle);
      const orbColor = i % 2 === 0 ? lightColor1 : lightColor2;

      ctx.save();
      ctx.fillStyle = orbColor;
      ctx.shadowColor = orbColor;
      ctx.shadowBlur = depth > 0 ? 8 : 2;
      ctx.beginPath();
      ctx.arc(lx, ly, depth > 0 ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Central Cockpit Power Core Dome
    const domeGrad = ctx.createRadialGradient(0, -6, 2, 0, -4, w * 0.24);
    domeGrad.addColorStop(0, '#ffffff');
    domeGrad.addColorStop(0.3, domeColor);
    domeGrad.addColorStop(0.8, coreGlow);
    domeGrad.addColorStop(1, 'rgba(0,0,0,0.8)');

    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.ellipse(0, -4, w * 0.24, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.07, -8, w * 0.08, h * 0.05, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  return (
    <div className="relative w-full h-[560px] bg-slate-950 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block cursor-default"
      />
    </div>
  );
};

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'TIME_CLEAR' | 'GAME_OVER';

export type LaneIndex = 0 | 1 | 2; // 0: 1차선(좌), 1: 2차선(중), 2: 3차선(우)

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'HELL'; // 하, 중, 상, 지옥

export interface DifficultyConfig {
  initialSpawnInterval: number; // 초기 스폰 간격 (초)
  minSpawnInterval: number;     // 최소 스폰 간격 (초)
  baseObstacleSpeed: number;    // 기본 장애물 속도 (px/s)
  speedVariation: number;       // 속도 무작위 편차
  roadBaseSpeed: number;        // 도로 스크롤 기본 속도
  roadMaxSpeed: number;         // 도로 스크롤 최고 속도
  nameKr: string;               // '하' | '중' | '상' | '지옥'
  labelEn: string;              // 'EASY' | 'MEDIUM' | 'HARD' | 'HELL'
  color: string;
  desc: string;
}

export const DIFFICULTY_SETTINGS: Record<DifficultyLevel, DifficultyConfig> = {
  EASY: {
    // 하 난이도 (전체 속도 30% 감속 적용)
    initialSpawnInterval: 1.2,
    minSpawnInterval: 0.5,
    baseObstacleSpeed: 203,       // 290 * 0.70
    speedVariation: 42,           // 60 * 0.70
    roadBaseSpeed: 266,           // 380 * 0.70
    roadMaxSpeed: 364,            // 520 * 0.70
    nameKr: '하',
    labelEn: 'EASY',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30',
    desc: '기본 워프 속도 & 안정적인 외계 비행선 출현 (초급 비행)',
  },
  MEDIUM: {
    // 중 난이도 (전체 속도 30% 감속 적용)
    initialSpawnInterval: 0.9,
    minSpawnInterval: 0.38,
    baseObstacleSpeed: 266,       // 380 * 0.70 (+63 px/s 차이)
    speedVariation: 49,           // 70 * 0.70
    roadBaseSpeed: 322,           // 460 * 0.70
    roadMaxSpeed: 448,            // 640 * 0.70
    nameKr: '중',
    labelEn: 'NORMAL',
    color: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
    desc: '더 빠른 항해 속도와 밀집된 UFO 편대 (숙련 비행)',
  },
  HARD: {
    // 상 난이도 (전체 속도 30% 감속 적용)
    initialSpawnInterval: 0.7,
    minSpawnInterval: 0.28,
    baseObstacleSpeed: 329,       // 470 * 0.70 (+63 px/s 차이)
    speedVariation: 56,           // 80 * 0.70
    roadBaseSpeed: 385,           // 550 * 0.70
    roadMaxSpeed: 532,            // 760 * 0.70
    nameKr: '상',
    labelEn: 'HARD',
    color: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
    desc: '극한의 우주 회피 기동! 초고속 대규모 UFO 습격',
  },
  HELL: {
    // 지옥 난이도 (전체 속도 30% 감속 적용)
    initialSpawnInterval: 0.35,  // 0.7 / 2 = 0.35초 (2배 빈도)
    minSpawnInterval: 0.14,      // 0.28 / 2 = 0.14초
    baseObstacleSpeed: 658,      // 329 * 2 = 658 px/s (상 난이도의 2배 속도)
    speedVariation: 112,         // 160 * 0.70
    roadBaseSpeed: 504,          // 720 * 0.70
    roadMaxSpeed: 756,           // 1080 * 0.70
    nameKr: '지옥',
    labelEn: 'HELL',
    color: 'text-purple-400 border-purple-500/60 bg-purple-950/40 shadow-sm shadow-purple-900/50',
    desc: '시작~2초(하) → 3~5초(중) → 6~10초(상) → 11초부터 지옥 점진 가속 & 증강 선택',
  },
};

export type HellSubPhase = 'EASY' | 'MEDIUM' | 'HARD' | 'HELL';

export interface EffectiveDifficultyState {
  activePhase: DifficultyLevel;
  config: DifficultyConfig;
  isHellMode: boolean;
  subPhaseIndex: number; // 1: 하, 2: 중, 3: 상, 4: 지옥
  subPhaseName: string;  // '1단계: 하', '2단계: 중', '3단계: 상', '최종: 지옥'
  badgeLabel: string;
  badgeColor: string;
}

/**
 * 지옥 난이도 시간대별 속도 및 등장 빈도 계산:
 * 시작~2초 (0~2s): 난이도 하 (EASY, 203px/s)
 * 3~5초 (3~5s): 난이도 중 (MEDIUM, 266px/s, +63px/s)
 * 6~10초 (6~10s): 난이도 상 (HARD, 329px/s, +63px/s)
 * 11초 이후 (11s+): 지옥 난이도 점진 가속 (난이도 상중하 속도 차이인 +63px/s씩 10초마다 완만하게 상승)
 */
export function getEffectiveDifficulty(
  difficulty: DifficultyLevel,
  elapsedSeconds: number
): EffectiveDifficultyState {
  if (difficulty !== 'HELL') {
    const config = DIFFICULTY_SETTINGS[difficulty];
    return {
      activePhase: difficulty,
      config,
      isHellMode: false,
      subPhaseIndex: 0,
      subPhaseName: config.nameKr,
      badgeLabel: `${config.nameKr} (${config.labelEn})`,
      badgeColor: config.color,
    };
  }

  // 지옥 모드 단계별 구간 판별
  if (elapsedSeconds <= 2) {
    return {
      activePhase: 'EASY',
      config: DIFFICULTY_SETTINGS.EASY,
      isHellMode: true,
      subPhaseIndex: 1,
      subPhaseName: '1단계 [하]',
      badgeLabel: '지옥: 1단계 [하]',
      badgeColor: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40',
    };
  } else if (elapsedSeconds <= 5) {
    return {
      activePhase: 'MEDIUM',
      config: DIFFICULTY_SETTINGS.MEDIUM,
      isHellMode: true,
      subPhaseIndex: 2,
      subPhaseName: '2단계 [중]',
      badgeLabel: '지옥: 2단계 [중]',
      badgeColor: 'text-amber-400 border-amber-500/50 bg-amber-950/40',
    };
  } else if (elapsedSeconds <= 10) {
    return {
      activePhase: 'HARD',
      config: DIFFICULTY_SETTINGS.HARD,
      isHellMode: true,
      subPhaseIndex: 3,
      subPhaseName: '3단계 [상]',
      badgeLabel: '지옥: 3단계 [상]',
      badgeColor: 'text-rose-400 border-rose-500/60 bg-rose-950/40',
    };
  } else {
    // 10초 이후: 상중하 속도 차이(+63 px/s)만큼 10초마다 천천히 점진 상승
    const overtime = elapsedSeconds - 10;
    const speedStep = 63; // 하(203) -> 중(266) -> 상(329)의 난이도별 속도 상승 차이
    const speedProgressRatio = overtime / 10; // 10초마다 1단계(+63px/s)씩 증가
    
    // 점진적으로 최대 658px/s까지 상승
    const dynamicBaseSpeed = Math.min(658, 329 + speedProgressRatio * speedStep);
    const dynamicRoadBase = Math.min(504, 385 + speedProgressRatio * 60);
    const dynamicRoadMax = Math.min(756, 532 + speedProgressRatio * 77);
    const dynamicInitialSpawn = Math.max(0.35, 0.70 - speedProgressRatio * 0.07);
    const dynamicMinSpawn = Math.max(0.14, 0.28 - speedProgressRatio * 0.03);

    const hellConfig: DifficultyConfig = {
      initialSpawnInterval: dynamicInitialSpawn,
      minSpawnInterval: dynamicMinSpawn,
      baseObstacleSpeed: dynamicBaseSpeed,
      speedVariation: Math.min(112, 56 + speedProgressRatio * 11),
      roadBaseSpeed: dynamicRoadBase,
      roadMaxSpeed: dynamicRoadMax,
      nameKr: '지옥',
      labelEn: 'HELL',
      color: 'text-purple-300 border-purple-500/80 bg-purple-950/60 shadow-md shadow-purple-900/60 animate-pulse',
      desc: '10초 이후 난이도 상(+63px/s) 단위로 점진 상승 & 10초마다 누적 증강 선택',
    };

    const speedTier = Math.floor(speedProgressRatio) + 1;

    return {
      activePhase: 'HELL',
      config: hellConfig,
      isHellMode: true,
      subPhaseIndex: 4,
      subPhaseName: `지옥 Lv.${speedTier}`,
      badgeLabel: `지옥 Lv.${speedTier} (+${Math.round(speedProgressRatio * speedStep)}속도)`,
      badgeColor: 'text-purple-300 border-purple-500/80 bg-purple-950/60 shadow-md shadow-purple-900/60',
    };
  }
}

// ==========================================
// 20가지 우주 증강 시스템 (Augments System)
// ==========================================
export type AugmentId =
  | 'shield'             // 1. 에너지 실드 (1회 충돌 보호 & 주기적 재생)
  | 'booster'            // 2. 초공간 부스터 (주기적 초고속 무적 돌파)
  | 'laser'              // 3. 광자 레이저포 (레인 전방 관통 파괴 빔)
  | 'plasma_ram'         // 4. 플라즈마 충각 (차선 이동 중 충돌 UFO 분쇄)
  | 'emp_pulse'          // 5. EMP 충격파 (전체 화면 UFO 일시 정지 & 감속)
  | 'orbital_drones'     // 6. 궤도 요격 위성 (주변을 공전하며 접촉 UFO 격추)
  | 'homing_missiles'    // 7. 유도 미사일 (접근하는 UFO를 추적 요격)
  | 'chrono_slow'        // 8. 크로노 왜곡장 (모든 UFO 기본 속도 영구 감소)
  | 'gravity_repulsor'   // 9. 중력 반발장 (근접 UFO를 외곽으로 밀어냄)
  | 'shrink_drive'       // 10. 양자 소형화 (왕복선 히트박스 축소)
  | 'quantum_warp'       // 11. 양자 도약 (차선 이동 2배 가속 & 무적 잔상)
  | 'emergency_warp'     // 12. 비상 긴급 도약 (치명 충돌 직전 안전 차선 자동 워프)
  | 'titan_surge'        // 13. 타이탄 거인화 (주기적 황금 거신 변신 & UFO 압살)
  | 'antimatter_chain'   // 14. 연쇄 반물질 폭발 (파괴된 UFO가 주변 UFO 연쇄 폭파)
  | 'stealth_cloak'      // 15. 스텔스 클로킹 (주기적 2.5초 투명화 & 장애물 무시)
  | 'nano_repair'        // 16. 나노 복구 키트 (사망 시 즉시 부활 +1회)
  | 'deflector_barrier'  // 17. 반사 이온 배리어 (정면 UFO 300px 뒤로 튕김)
  | 'score_overdrive'    // 18. 양자 에너지 코어 (점수 2배 획득 & 스코어 자석)
  | 'overclock_reactor'  // 19. 오버클럭 반응로 (모든 쿨다운형 증강 주기 25% 단축)
  | 'plasma_wake';       // 20. 플라즈마 후류 트레일 (후방 추진염으로 근접 UFO 소멸)

export type AugmentCategory = 'DEFENSE' | 'OFFENSE' | 'UTILITY' | 'SPECIAL';

export interface AugmentDef {
  id: AugmentId;
  nameKr: string;
  nameEn: string;
  category: AugmentCategory;
  categoryKr: string;
  badgeColor: string;
  desc: string;
  icon: string;
  getStackDesc: (nextLevel: number) => string;
}

export const AUGMENT_CATALOG: AugmentDef[] = [
  {
    id: 'shield',
    nameKr: '에너지 실드',
    nameEn: 'Energy Shield',
    category: 'DEFENSE',
    categoryKr: '방어형',
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/50',
    desc: '치명적인 UFO 충돌을 1회 무효화하고 보호 파동을 방출합니다.',
    icon: 'Shield',
    getStackDesc: (lvl) => lvl === 1 ? '실드 1회 충전 (파괴 시 18초 후 자동 재생)' : `실드 최대치 +1 & 재생 쿨다운 단축 (${Math.max(8, 20 - lvl * 3)}초)`,
  },
  {
    id: 'booster',
    nameKr: '초공간 부스터',
    nameEn: 'Hyper Booster',
    category: 'OFFENSE',
    categoryKr: '돌파형',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/50',
    desc: '주기적으로 2.2초간 워프 속도로 폭주하며 전방 UFO를 파괴합니다.',
    icon: 'Zap',
    getStackDesc: (lvl) => `발동 주기 ${Math.max(6, 13 - lvl * 2)}초마다 2.2초 광속 돌진 & 무적`,
  },
  {
    id: 'laser',
    nameKr: '광자 레이저포',
    nameEn: 'Photon Laser',
    category: 'OFFENSE',
    categoryKr: '공격형',
    badgeColor: 'text-red-400 bg-red-950/60 border-red-500/50',
    desc: '현재 차선 전방으로 강력한 플라즈마 레이저를 발사하여 UFO를 격추합니다.',
    icon: 'Crosshair',
    getStackDesc: (lvl) => `발사 간격 ${Math.max(1.4, 4.0 - lvl * 0.6).toFixed(1)}초마다 레인 전방 즉시 일소`,
  },
  {
    id: 'plasma_ram',
    nameKr: '플라즈마 충각',
    nameEn: 'Plasma Ram',
    category: 'OFFENSE',
    categoryKr: '돌파형',
    badgeColor: 'text-orange-400 bg-orange-950/60 border-orange-500/50',
    desc: '차선을 이동하는 순간 뱃머리의 플라즈마로 경로 상의 UFO를 분쇄합니다.',
    icon: 'Swords',
    getStackDesc: (lvl) => lvl === 1 ? '차선 이동 중 접촉한 UFO 즉시 파괴' : `충각 충격파 반경 +${lvl * 15}% & 파괴 보너스`,
  },
  {
    id: 'emp_pulse',
    nameKr: 'EMP 충격파',
    nameEn: 'EMP Shockwave',
    category: 'UTILITY',
    categoryKr: '제어형',
    badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-500/50',
    desc: '화면 전체에 강력한 전자기 펄스를 방출해 모든 UFO를 정지시킵니다.',
    icon: 'Radio',
    getStackDesc: (lvl) => `발동 주기 ${Math.max(6, 9 - lvl)}초마다 전 화면 UFO ${(1.8 + lvl * 0.4).toFixed(1)}초간 정지`,
  },
  {
    id: 'orbital_drones',
    nameKr: '궤도 요격 위성',
    nameEn: 'Orbital Drone',
    category: 'OFFENSE',
    categoryKr: '호위형',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/50',
    desc: '왕복선 주위를 회전하며 접근하는 UFO를 몸체로 격추하는 위성을 배치합니다.',
    icon: 'CircleDot',
    getStackDesc: (lvl) => `호위 위성 총 ${Math.min(4, lvl)}대 궤도 선회 (접촉 UFO 즉시 분쇄)`,
  },
  {
    id: 'homing_missiles',
    nameKr: '유도 요격 미사일',
    nameEn: 'Homing Missiles',
    category: 'OFFENSE',
    categoryKr: '공격형',
    badgeColor: 'text-violet-400 bg-violet-950/60 border-violet-500/50',
    desc: '가장 가까운 위험 UFO를 자동 조준하여 날아가는 미사일을 발사합니다.',
    icon: 'Rocket',
    getStackDesc: (lvl) => `발사 주기 ${Math.max(1.8, 3.8 - lvl * 0.5).toFixed(1)}초마다 미사일 ${1 + lvl}발 일제 사격`,
  },
  {
    id: 'chrono_slow',
    nameKr: '크로노 왜곡장',
    nameEn: 'Chrono Stasis',
    category: 'UTILITY',
    categoryKr: '제어형',
    badgeColor: 'text-teal-400 bg-teal-950/60 border-teal-500/50',
    desc: '시공간을 왜곡하여 모든 외계 UFO의 접근 속도를 영구적으로 감속합니다.',
    icon: 'Hourglass',
    getStackDesc: (lvl) => `적 UFO 비행 속도 ${Math.min(50, lvl * 15)}% 영구 감속`,
  },
  {
    id: 'gravity_repulsor',
    nameKr: '중력 반발장',
    nameEn: 'Gravity Repulsor',
    category: 'DEFENSE',
    categoryKr: '방어형',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-500/50',
    desc: '왕복선 주변에 강력한 척력장을 형성해 가까이 온 UFO를 바깥 레인으로 밀어냅니다.',
    icon: 'Minimize2',
    getStackDesc: (lvl) => `반발 범위 및 밀어내는 척력 +${lvl * 25}% 강화`,
  },
  {
    id: 'shrink_drive',
    nameKr: '양자 소형화 역장',
    nameEn: 'Quantum Shrink',
    category: 'DEFENSE',
    categoryKr: '특수형',
    badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-500/50',
    desc: '기체 충돌 판정을 정밀 축소시켜 좁은 UFO 사이를 유연하게 통과합니다.',
    icon: 'Shrink',
    getStackDesc: (lvl) => `피격 판정 크기 ${Math.min(55, lvl * 20)}% 추가 축소 (날렵한 회피)`,
  },
  {
    id: 'quantum_warp',
    nameKr: '양자 궤도 도약',
    nameEn: 'Quantum Blink',
    category: 'UTILITY',
    categoryKr: '기동형',
    badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-500/50',
    desc: '차선 이동 속도가 2배 빨라지며, 이동 중 무적 잔상 상태가 됩니다.',
    icon: 'Navigation',
    getStackDesc: (lvl) => `이동 딜레이 0.04초로 단축 & 이동 후 0.${3 + lvl}초 무적 잔상 부여`,
  },
  {
    id: 'emergency_warp',
    nameKr: '비상 긴급 도약',
    nameEn: 'Emergency Warp',
    category: 'DEFENSE',
    categoryKr: '생존형',
    badgeColor: 'text-yellow-400 bg-yellow-950/60 border-yellow-500/50',
    desc: '정면 불가피 충돌 직전, 안전한 빈 차선으로 기체를 자동 순간이동시킵니다.',
    icon: 'Sparkles',
    getStackDesc: (lvl) => `자동 비상 탈출 쿨다운 ${Math.max(12, 32 - lvl * 5)}초`,
  },
  {
    id: 'titan_surge',
    nameKr: '타이탄 거인화',
    nameEn: 'Titan Dreadnought',
    category: 'SPECIAL',
    categoryKr: '특수형',
    badgeColor: 'text-amber-300 bg-amber-950/70 border-amber-400/60 shadow-amber-500/20',
    desc: '주기적으로 거대한 황금 드레드노트로 각성하여 모든 UFO를 짓밟고 파괴합니다.',
    icon: 'Flame',
    getStackDesc: (lvl) => `발동 주기 ${Math.max(10, 16 - lvl * 2)}초마다 ${(3.0 + lvl * 0.7).toFixed(1)}초간 거인화 무적 분쇄`,
  },
  {
    id: 'antimatter_chain',
    nameKr: '연쇄 반물질 폭발',
    nameEn: 'Antimatter Chain',
    category: 'OFFENSE',
    categoryKr: '공격형',
    badgeColor: 'text-pink-400 bg-pink-950/60 border-pink-500/50',
    desc: '파괴된 UFO가 격렬한 반물질 폭발을 일으켜 인접한 다른 UFO들을 연쇄 격침합니다.',
    icon: 'Bomb',
    getStackDesc: (lvl) => `폭발 반경 +${lvl * 35}% & 연쇄 폭발 데미지 극대화`,
  },
  {
    id: 'stealth_cloak',
    nameKr: '스텔스 클로킹',
    nameEn: 'Stealth Cloak',
    category: 'DEFENSE',
    categoryKr: '은폐형',
    badgeColor: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/50',
    desc: '주기적으로 광학 은폐 상태에 돌입해 모든 UFO를 유령처럼 통과합니다.',
    icon: 'Ghost',
    getStackDesc: (lvl) => `발동 주기 ${Math.max(6, 10 - lvl)}초마다 ${(2.2 + lvl * 0.5).toFixed(1)}초간 완전 무형화`,
  },
  {
    id: 'nano_repair',
    nameKr: '나노 복구 키트',
    nameEn: 'Nano Revive',
    category: 'DEFENSE',
    categoryKr: '생존형',
    badgeColor: 'text-green-400 bg-green-950/60 border-green-500/50',
    desc: '기체가 파괴되었을 때 즉시 선체를 재생성하여 부활합니다.',
    icon: 'HeartPulse',
    getStackDesc: (lvl) => `추가 부활 횟수 총 ${lvl}회 (부활 시 2.5초 무적 & 주변 적 소멸)`,
  },
  {
    id: 'deflector_barrier',
    nameKr: '반사 이온 배리어',
    nameEn: 'Deflector Shield',
    category: 'DEFENSE',
    categoryKr: '방어형',
    badgeColor: 'text-cyan-300 bg-cyan-950/60 border-cyan-400/50',
    desc: '정면 60px 내로 접근한 위험 UFO를 우주 저편으로 강하게 튕겨냅니다.',
    icon: 'ShieldAlert',
    getStackDesc: (lvl) => `반사 쿨다운 ${Math.max(4, 9 - lvl * 1.5).toFixed(1)}초 (접근 적 350px 튕김)`,
  },
  {
    id: 'score_overdrive',
    nameKr: '양자 에너지 코어',
    nameEn: 'Quantum Core',
    category: 'UTILITY',
    categoryKr: '증폭형',
    badgeColor: 'text-yellow-300 bg-yellow-950/60 border-yellow-400/50',
    desc: 'UFO 회피 및 격추 시 획득하는 스코어와 보너스를 폭발적으로 증가시킵니다.',
    icon: 'Award',
    getStackDesc: (lvl) => `점수 획득량 +${lvl * 100}% 증가 & 보너스 에너지 코어 흡수`,
  },
  {
    id: 'overclock_reactor',
    nameKr: '오버클럭 반응로',
    nameEn: 'Overclock Reactor',
    category: 'SPECIAL',
    categoryKr: '증폭형',
    badgeColor: 'text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-500/50',
    desc: '선체 동력을 과충전하여 보유 중인 모든 쿨다운 기반 증강의 쿨다운을 일괄 단축합니다.',
    icon: 'Cpu',
    getStackDesc: (lvl) => `모든 액티브 증강 쿨다운 ${Math.min(60, lvl * 22)}% 대폭 단축`,
  },
  {
    id: 'plasma_wake',
    nameKr: '플라즈마 후류 트레일',
    nameEn: 'Plasma Wake',
    category: 'OFFENSE',
    categoryKr: '공격형',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-500/50',
    desc: '엔진 분사구 뒤편으로 초고온 플라즈마 후류를 방출해 후방 및 측면 UFO를 태웁니다.',
    icon: 'Flame',
    getStackDesc: (lvl) => `후류 화염 길이 +${lvl * 30}% & 분사구 접근 UFO 즉시 소멸`,
  },
];

export const AUGMENT_MAP = AUGMENT_CATALOG.reduce<Record<AugmentId, AugmentDef>>(
  (acc, aug) => {
    acc[aug.id] = aug;
    return acc;
  },
  {} as Record<AugmentId, AugmentDef>
);

export type AugmentsState = Partial<Record<AugmentId, number>>;


export interface PlayerCar {
  lane: LaneIndex;
  startX: number;
  targetX: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lerpProgress: number;
  isMoving: boolean;
  tilt: number;
}

export interface ObstacleCar {
  id: number;
  lane: LaneIndex;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  passedPlayer: boolean;
  scored: boolean;
  variant: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
}

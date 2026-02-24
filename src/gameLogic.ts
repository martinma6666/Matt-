import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  INITIAL_AMMO, 
  SPEEDS, 
  EXPLOSION_RADIUS, 
  EXPLOSION_DURATION 
} from './constants';
import { 
  GameState, 
  Rocket, 
  Interceptor, 
  Explosion, 
  City, 
  Tower, 
  Point 
} from './types';

export const createInitialState = (): GameState => {
  const cities: City[] = [
    { id: 'c1', x: 150, y: GAME_HEIGHT - 30, active: true },
    { id: 'c2', x: 250, y: GAME_HEIGHT - 30, active: true },
    { id: 'c3', x: 350, y: GAME_HEIGHT - 30, active: true },
    { id: 'c4', x: 450, y: GAME_HEIGHT - 30, active: true },
    { id: 'c5', x: 550, y: GAME_HEIGHT - 30, active: true },
    { id: 'c6', x: 650, y: GAME_HEIGHT - 30, active: true },
  ];

  const towers: Tower[] = [
    { id: 't1', x: 50, y: GAME_HEIGHT - 40, active: true, ammo: INITIAL_AMMO.LEFT, maxAmmo: INITIAL_AMMO.LEFT, level: 1, speedMultiplier: 1, explosionMultiplier: 1 },
    { id: 't2', x: 400, y: GAME_HEIGHT - 40, active: true, ammo: INITIAL_AMMO.MIDDLE, maxAmmo: INITIAL_AMMO.MIDDLE, level: 1, speedMultiplier: 1, explosionMultiplier: 1 },
    { id: 't3', x: 750, y: GAME_HEIGHT - 40, active: true, ammo: INITIAL_AMMO.RIGHT, maxAmmo: INITIAL_AMMO.RIGHT, level: 1, speedMultiplier: 1, explosionMultiplier: 1 },
  ];

  const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
  }));

  return {
    score: 0,
    status: 'START',
    rockets: [],
    interceptors: [],
    explosions: [],
    cities,
    towers,
    round: 1,
    level: 1,
    wave: 1,
    rocketsSpawnedInWave: 0,
    totalRocketsPerWave: 5,
    stars,
  };
};

export const updateGame = (state: GameState, deltaTime: number): GameState => {
  if (state.status !== 'PLAYING') return state;

  const newState = { ...state };

  // Check for wave end
  if (newState.rocketsSpawnedInWave >= newState.totalRocketsPerWave && newState.rockets.length === 0) {
    // Replenish ammo for active towers at end of every wave
    newState.towers = newState.towers.map(t => ({
      ...t,
      ammo: t.active ? t.maxAmmo : t.ammo
    }));

    if (newState.wave < 10) {
      newState.wave += 1;
      newState.rocketsSpawnedInWave = 0;
      newState.totalRocketsPerWave = 5 + newState.wave * 2 + newState.level * 3;
    } else {
      // Level end
      if (newState.level < 100) {
        newState.status = 'UPGRADE'; // Transition to upgrade screen
        
        const remainingAmmo = newState.towers.reduce((acc, t) => acc + (t.active ? t.ammo : 0), 0);
        newState.score += remainingAmmo * 5;
      } else {
        newState.status = 'WON';
      }
    }
  }

  // 1. Update Rockets
  newState.rockets = state.rockets.map(r => {
    const dx = r.targetX - r.x;
    const dy = r.targetY - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 2) return { ...r, progress: 1 }; // Hit target

    const moveDist = r.speed;
    const ratio = moveDist / dist;
    
    return {
      ...r,
      x: r.x + dx * ratio,
      y: r.y + dy * ratio,
    };
  });

  // Check rocket collisions with targets
  newState.rockets.forEach(r => {
    const dx = r.targetX - r.x;
    const dy = r.targetY - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      // Hit something!
      newState.cities = newState.cities.map(c => {
        if (Math.abs(c.x - r.targetX) < 5 && Math.abs(c.y - r.targetY) < 5) {
          return { ...c, active: false };
        }
        return c;
      });
      newState.towers = newState.towers.map(t => {
        if (Math.abs(t.x - r.targetX) < 5 && Math.abs(t.y - r.targetY) < 5) {
          return { ...t, active: false };
        }
        return t;
      });
    }
  });

  // Remove rockets that hit targets
  newState.rockets = newState.rockets.filter(r => {
    const dx = r.targetX - r.x;
    const dy = r.targetY - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist >= 5;
  });

  // 2. Update Interceptors
  newState.interceptors = state.interceptors.map(i => {
    const dx = i.targetX - i.x;
    const dy = i.targetY - i.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < i.speed) {
      // Reached target, create explosion
      newState.explosions.push({
        id: Math.random().toString(),
        x: i.targetX,
        y: i.targetY,
        radius: 0,
        maxRadius: i.explosionRadius,
        timer: 0,
        duration: EXPLOSION_DURATION,
      });
      return null;
    }

    const ratio = i.speed / dist;
    return {
      ...i,
      x: i.x + dx * ratio,
      y: i.y + dy * ratio,
    };
  }).filter(Boolean) as Interceptor[];

  // 3. Update Explosions
  newState.explosions = state.explosions.map(e => {
    const timer = e.timer + 1;
    const halfDuration = e.duration / 2;
    let radius = 0;
    
    if (timer < halfDuration) {
      radius = (timer / halfDuration) * e.maxRadius;
    } else {
      radius = (1 - (timer - halfDuration) / halfDuration) * e.maxRadius;
    }

    return { ...e, timer, radius };
  }).filter(e => e.timer < e.duration);

  // 4. Collision: Explosions vs Rockets
  newState.explosions.forEach(e => {
    newState.rockets = newState.rockets.filter(r => {
      const dx = r.x - e.x;
      const dy = r.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < e.radius + 2) {
        newState.score += 20;
        return false;
      }
      return true;
    });
  });

  // 5. Spawn Rockets
  if (newState.rocketsSpawnedInWave < newState.totalRocketsPerWave) {
    const spawnChance = 0.01 + (state.level * 0.002) + (state.wave * 0.005);
    if (Math.random() < spawnChance) {
      const targets = [...newState.cities, ...newState.towers].filter(t => t.active);
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        newState.rockets.push({
          id: Math.random().toString(),
          x: Math.random() * GAME_WIDTH,
          y: 0,
          targetX: target.x,
          targetY: target.y,
          speed: SPEEDS.ENEMY_MIN + Math.random() * (SPEEDS.ENEMY_MAX - SPEEDS.ENEMY_MIN) + (state.level * 0.05) + (state.wave * 0.02),
          progress: 0,
        });
        newState.rocketsSpawnedInWave += 1;
      }
    }
  }

  // 6. Win/Loss Conditions
  if (newState.towers.every(t => !t.active)) {
    newState.status = 'LOST';
  }

  return newState;
};

export const spawnInterceptor = (state: GameState, target: Point): GameState => {
  if (state.status !== 'PLAYING') return state;

  // Find closest active tower with ammo
  let bestTower: Tower | null = null;
  let minDist = Infinity;

  state.towers.forEach(t => {
    if (t.active && t.ammo > 0) {
      const dx = t.x - target.x;
      const dy = t.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        bestTower = t;
      }
    }
  });

  if (!bestTower) return state;

  const newState = { ...state };
  newState.towers = state.towers.map(t => {
    if (t.id === bestTower!.id) {
      return { ...t, ammo: t.ammo - 1 };
    }
    return t;
  });

  newState.interceptors.push({
    id: Math.random().toString(),
    startX: bestTower!.x,
    startY: bestTower!.y,
    x: bestTower!.x,
    y: bestTower!.y,
    targetX: target.x,
    targetY: target.y,
    progress: 0,
    speed: SPEEDS.MISSILE * bestTower!.speedMultiplier,
    explosionRadius: EXPLOSION_RADIUS * bestTower!.explosionMultiplier,
  });

  return newState;
};

export const upgradeTower = (state: GameState, towerId: string): GameState => {
  const newState = { ...state };
  newState.towers = state.towers.map(t => {
    if (t.id === towerId) {
      return {
        ...t,
        level: t.level + 1,
        maxAmmo: Math.ceil(t.maxAmmo * 1.3),
        ammo: Math.ceil(t.maxAmmo * 1.3), // Refill to new max
        speedMultiplier: t.speedMultiplier * 1.3,
        explosionMultiplier: t.explosionMultiplier * 1.3,
      };
    }
    return t;
  });
  
  // After upgrade, move to next level
  return nextLevel(newState);
};

export const nextLevel = (state: GameState): GameState => {
  return {
    ...state,
    status: 'PLAYING',
    level: state.level + 1,
    wave: 1,
    rocketsSpawnedInWave: 0,
    totalRocketsPerWave: 5 + (state.level + 1) * 3,
    rockets: [],
    interceptors: [],
    explosions: [],
  };
};

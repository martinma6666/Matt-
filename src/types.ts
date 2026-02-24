export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  id: string;
}

export interface Rocket extends Entity {
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
}

export interface Interceptor extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  explosionRadius: number;
}

export interface Explosion extends Point {
  id: string;
  radius: number;
  maxRadius: number;
  timer: number;
  duration: number;
}

export interface City extends Point {
  id: string;
  active: boolean;
}

export interface Tower extends Point {
  id: string;
  active: boolean;
  ammo: number;
  maxAmmo: number;
  level: number;
  speedMultiplier: number;
  explosionMultiplier: number;
}

export type GameStatus = 'START' | 'PLAYING' | 'WON' | 'LOST' | 'ROUND_END' | 'UPGRADE';

export interface GameState {
  score: number;
  status: GameStatus;
  rockets: Rocket[];
  interceptors: Interceptor[];
  explosions: Explosion[];
  cities: City[];
  towers: Tower[];
  round: number;
  level: number;
  wave: number;
  rocketsSpawnedInWave: number;
  totalRocketsPerWave: number;
  stars: Point[];
}

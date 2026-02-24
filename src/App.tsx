/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Trophy, AlertTriangle, RefreshCw, Zap, Rocket as RocketIcon } from 'lucide-react';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, INITIAL_AMMO } from './constants';
import { GameState, GameStatus } from './types';
import { createInitialState, updateGame, spawnInterceptor, upgradeTower } from './gameLogic';
import { audioService } from './services/audioService';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const t = {
    zh: {
      title: 'Matt新星防御',
      score: '得分',
      ammo: '弹药',
      win: '防御成功！',
      lose: '防线崩溃...',
      start: '点击开始游戏',
      restart: '再玩一次',
      instructions: '点击屏幕发射拦截导弹，保护城市和炮台。',
      level: '关卡',
      wave: '波次',
      upgradeTitle: '关卡完成！',
      upgradeDesc: '选择一个炮台进行升级（各项属性提升30%）',
      upgradeBtn: '升级',
      towerLevel: '等级',
    },
    en: {
      title: 'Matt Nova Defense',
      score: 'Score',
      ammo: 'Ammo',
      win: 'Defense Successful!',
      lose: 'Defense Collapsed...',
      start: 'Click to Start',
      restart: 'Play Again',
      instructions: 'Click to fire interceptors. Protect cities and towers.',
      level: 'Level',
      wave: 'Wave',
      upgradeTitle: 'Level Complete!',
      upgradeDesc: 'Choose a tower to upgrade (+30% stats)',
      upgradeBtn: 'Upgrade',
      towerLevel: 'Lvl',
    }
  }[language];

  const startGame = () => {
    const initialState = createInitialState();
    initialState.status = 'PLAYING';
    setGameState(initialState);
  };

  const goToHome = () => {
    setGameState(createInitialState());
  };

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.status !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    setGameState(prev => {
      const next = spawnInterceptor(prev, { x, y });
      if (next.interceptors.length > prev.interceptors.length) {
        audioService.playLaunch();
      }
      return next;
    });
  };

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      setGameState(prev => updateGame(prev, deltaTime));
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with dark space gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#020617'); // slate-950
    bgGradient.addColorStop(1, '#0f172a'); // slate-900
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars
    gameState.stars.forEach((star, i) => {
      const opacity = 0.3 + Math.sin(Date.now() / 1000 + i) * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, Math.random() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Cities
    gameState.cities.forEach(city => {
      if (city.active) {
        ctx.fillStyle = COLORS.CITY;
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.CITY;
        ctx.beginPath();
        ctx.roundRect(city.x - 20, city.y - 10, 40, 20, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Windows
        ctx.fillStyle = '#ffffff88';
        ctx.fillRect(city.x - 15, city.y - 5, 5, 5);
        ctx.fillRect(city.x + 10, city.y - 5, 5, 5);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(city.x, city.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Towers
    gameState.towers.forEach(tower => {
      if (tower.active) {
        ctx.fillStyle = COLORS.TOWER;
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.TOWER;
        ctx.beginPath();
        ctx.moveTo(tower.x - 25, tower.y + 10);
        ctx.lineTo(tower.x + 25, tower.y + 10);
        ctx.lineTo(tower.x, tower.y - 30);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Ammo bar
        const ammoWidth = 40;
        const ammoHeight = 4;
        const currentAmmoWidth = (tower.ammo / tower.maxAmmo) * ammoWidth;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tower.x - 20, tower.y + 15, ammoWidth, ammoHeight);
        ctx.fillStyle = COLORS.TOWER;
        ctx.fillRect(tower.x - 20, tower.y + 15, currentAmmoWidth, ammoHeight);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(tower.x - 25, tower.y + 10);
        ctx.lineTo(tower.x + 25, tower.y + 10);
        ctx.lineTo(tower.x, tower.y - 10);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw Rockets (Enemy)
    gameState.rockets.forEach(rocket => {
      // Trail
      const dx = rocket.targetX - rocket.x;
      const dy = rocket.targetY - rocket.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const tailLen = 30;
      
      const trailGradient = ctx.createLinearGradient(
        rocket.x, rocket.y, 
        rocket.x - (dx / dist) * tailLen, 
        rocket.y - (dy / dist) * tailLen
      );
      trailGradient.addColorStop(0, COLORS.ENEMY);
      trailGradient.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = trailGradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rocket.x, rocket.y);
      ctx.lineTo(rocket.x - (dx / dist) * tailLen, rocket.y - (dy / dist) * tailLen);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLORS.ENEMY;
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Interceptors (Player)
    gameState.interceptors.forEach(i => {
      // Trail
      const dx = i.targetX - i.startX;
      const dy = i.targetY - i.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      ctx.strokeStyle = COLORS.MISSILE;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i.startX, i.startY);
      ctx.lineTo(i.x, i.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Head
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLORS.MISSILE;
      ctx.beginPath();
      ctx.arc(i.x, i.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Target X
      ctx.strokeStyle = COLORS.MISSILE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i.targetX - 6, i.targetY - 6);
      ctx.lineTo(i.targetX + 6, i.targetY + 6);
      ctx.moveTo(i.targetX + 6, i.targetY - 6);
      ctx.lineTo(i.targetX - 6, i.targetY + 6);
      ctx.stroke();
    });

    // Draw Explosions
    gameState.explosions.forEach(e => {
      // Play sound if explosion just started
      if (e.timer === 1) {
        audioService.playExplosion();
      }
      const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.3, COLORS.EXPLOSION);
      gradient.addColorStop(0.7, COLORS.MISSILE);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 20;
      ctx.shadowColor = COLORS.EXPLOSION;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

  }, [gameState]);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Mission Critical Defense</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
            className="px-3 py-1 text-xs font-mono border border-white/10 rounded hover:bg-white/5 transition-colors"
          >
            {language === 'zh' ? 'EN' : '中文'}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-mono text-white/40">{t.score}</span>
            <span className="text-2xl font-mono font-bold text-emerald-500">{gameState.score.toString().padStart(5, '0')}</span>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-black rounded-xl border border-white/10 overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasClick}
            className="w-full h-auto max-h-[70vh] cursor-crosshair touch-none"
          />

          {/* Overlays */}
          <AnimatePresence>
            {gameState.status !== 'PLAYING' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
              >
                {gameState.status === 'START' && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                      <Target className="w-10 h-10 text-emerald-500 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold tracking-tighter">{t.title}</h2>
                      <p className="text-white/60 max-w-md">{t.instructions}</p>
                    </div>
                    <button 
                      onClick={startGame}
                      className="group relative px-8 py-4 bg-emerald-500 text-black font-bold rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Zap className="w-5 h-5 fill-current" />
                        {t.start}
                      </span>
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                  </motion.div>
                )}

                {gameState.status === 'WON' && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto border border-yellow-500/20">
                      <Trophy className="w-10 h-10 text-yellow-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black italic tracking-tighter text-yellow-500">{t.win}</h2>
                      <p className="text-white/60 font-mono">{t.score}: {gameState.score}</p>
                    </div>
                    <button 
                      onClick={goToHome}
                      className="flex items-center gap-2 mx-auto px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-emerald-500 hover:text-black transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      {t.restart}
                    </button>
                  </motion.div>
                )}

                {gameState.status === 'LOST' && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                      <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black italic tracking-tighter text-red-500">{t.lose}</h2>
                      <p className="text-white/60 font-mono">{t.score}: {gameState.score}</p>
                    </div>
                    <button 
                      onClick={goToHome}
                      className="flex items-center gap-2 mx-auto px-8 py-4 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      {t.restart}
                    </button>
                  </motion.div>
                )}

                {gameState.status === 'UPGRADE' && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-8 w-full max-w-2xl"
                  >
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold tracking-tight text-emerald-500">{t.upgradeTitle}</h2>
                      <p className="text-white/60">{t.upgradeDesc}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      {gameState.towers.map((tower, idx) => (
                        <motion.button
                          key={tower.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setGameState(prev => upgradeTower(prev, tower.id))}
                          disabled={!tower.active}
                          className={`p-6 rounded-2xl border flex flex-col items-center gap-4 transition-colors ${
                            tower.active 
                              ? 'bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/50' 
                              : 'bg-red-500/5 border-red-500/20 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className={`p-3 rounded-xl ${tower.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                            <Zap className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-lg">Tower {idx + 1}</p>
                            <p className="text-xs font-mono text-white/40">{t.towerLevel} {tower.level}</p>
                          </div>
                          <div className="w-full space-y-2 text-[10px] font-mono text-left">
                            <div className="flex justify-between">
                              <span>AMMO</span>
                              <span>{tower.maxAmmo}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SPEED</span>
                              <span>x{tower.speedMultiplier.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>RAD</span>
                              <span>x{tower.explosionMultiplier.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="mt-2 px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-full">
                            {t.upgradeBtn}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="w-full max-w-[800px] mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-white/40 flex items-center gap-1">
            <Shield className="w-3 h-3" /> {t.level}
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400">{gameState.level.toString().padStart(2, '0')}</span>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-white/40 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {t.wave}
          </span>
          <span className="text-xl font-bold font-mono text-blue-400">{gameState.wave}/10</span>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-white/40 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {t.ammo}
          </span>
          <div className="flex gap-2">
            {gameState.towers.map((tower, idx) => (
              <div key={tower.id} className="flex flex-col items-center">
                <div className={`w-1.5 h-6 rounded-full ${tower.active ? 'bg-emerald-500' : 'bg-red-500/30'}`} />
                <span className="text-[10px] font-mono mt-1">{tower.ammo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}

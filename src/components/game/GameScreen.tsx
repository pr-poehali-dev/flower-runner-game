import { useEffect, useRef, useState, useCallback } from 'react';
import { GameSettings } from '@/pages/Index';
import { useGameMusic } from './useGameMusic';

interface Props {
  settings: GameSettings;
  onBack: () => void;
  onNewHighScore: (score: number) => void;
}

const W = 800;
const H = 300;
const GROUND_Y = 240;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;

type ObstacleType = 'fence' | 'pit' | 'platform' | 'enemy';

interface Obstacle {
  type: ObstacleType;
  x: number;
  y: number;
  w: number;
  h: number;
  vx?: number;
  vy?: number;
  dir?: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

function getDiffSpeed(d: string) {
  if (d === 'easy') return 4;
  if (d === 'hard') return 7;
  return 5.5;
}

function getDiffSpawnRate(d: string) {
  if (d === 'easy') return 120;
  if (d === 'hard') return 60;
  return 85;
}

export default function GameScreen({ settings, onBack, onNewHighScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    player: { x: 80, y: GROUND_Y - 40, w: 28, h: 40, vy: 0, onGround: false, onPlatform: false, ducking: false, lives: 3, invincible: 0, dead: false, runFrame: 0, runTimer: 0 },
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    score: 0,
    speed: getDiffSpeed(settings.difficulty),
    spawnTimer: 0,
    spawnRate: getDiffSpawnRate(settings.difficulty),
    bgX: 0,
    cloudX: [100, 300, 550, 700],
    distance: 0,
    won: false,
    finished: false,
    fps: 0,
    fpsTimer: 0,
    fpsCount: 0,
    flowerFrame: 0,
    flowerTimer: 0,
    targetX: W - 80,
    targetVisible: false,
  });
  const [gameState, setGameState] = useState<'playing' | 'dead' | 'won'>('playing');
  const [displayScore, setDisplayScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [fps, setFps] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const rafRef = useRef(0);
  const keysRef = useRef({ up: false, down: false });
  const jumpedRef = useRef(false);

  useGameMusic(settings.volume, musicPlaying);

  const spawnObstacle = useCallback((s: typeof stateRef.current) => {
    const types: ObstacleType[] = ['fence', 'pit', 'platform', 'enemy'];
    const w = Math.random();
    let type: ObstacleType;
    if (w < 0.3) type = 'fence';
    else if (w < 0.55) type = 'pit';
    else if (w < 0.75) type = 'platform';
    else type = 'enemy';

    if (type === 'fence') {
      const h = 28 + Math.random() * 20;
      s.obstacles.push({ type, x: W + 20, y: GROUND_Y - h, w: 20, h });
    } else if (type === 'pit') {
      const pw = 50 + Math.random() * 40;
      s.obstacles.push({ type, x: W + 20, y: GROUND_Y, w: pw, h: 20 });
    } else if (type === 'platform') {
      const py = GROUND_Y - 70 - Math.random() * 50;
      s.obstacles.push({ type, x: W + 20, y: py, w: 80, h: 14, vx: -(1.5 + Math.random()), dir: 0 });
    } else {
      s.obstacles.push({ type, x: W + 20, y: GROUND_Y - 32, w: 28, h: 32, vx: -(s.speed * 0.6), vy: 0, dir: 0 });
    }
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 8) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      s.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 5 - 1,
        life: 1,
        color,
        size: 4 + Math.random() * 4,
      });
    }
  }, []);

  const drawPixelChar = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, ducking: boolean, invincible: number, runFrame: number, flower: number) => {
    if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

    const flowers = ['🌸', '🌺', '🌼', '🌻', '💐'];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (!ducking) {
      // === SHADOW ===
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x - 8, y + 40, 16, 3);

      // === BOUQUET (above head, held in right hand) ===
      // Stems
      ctx.fillStyle = '#4a7c3f';
      ctx.fillRect(x + 2, y - 6, 2, 10);
      ctx.fillRect(x + 5, y - 4, 2, 8);
      ctx.fillRect(x - 1, y - 3, 2, 7);
      // Flowers
      const flowerColors = [
        ['#ff6b9d', '#ff9ec4'], // pink
        ['#ff4444', '#ff8888'], // red
        ['#ffcc00', '#ffee88'], // yellow
        ['#ff69b4', '#ffaad4'], // pink2
        ['#ff8c00', '#ffbb55'], // orange
      ];
      const fc = flowerColors[flower % flowerColors.length];
      // Flower 1 (center)
      ctx.fillStyle = fc[0];
      ctx.fillRect(x + 1, y - 12, 4, 4);
      ctx.fillStyle = fc[1];
      ctx.fillRect(x + 2, y - 11, 2, 2);
      // Flower 2 (right)
      ctx.fillStyle = flowerColors[(flower + 1) % 5][0];
      ctx.fillRect(x + 5, y - 10, 3, 3);
      ctx.fillStyle = flowerColors[(flower + 1) % 5][1];
      ctx.fillRect(x + 6, y - 9, 1, 1);
      // Flower 3 (left)
      ctx.fillStyle = flowerColors[(flower + 2) % 5][0];
      ctx.fillRect(x - 2, y - 9, 3, 3);
      ctx.fillStyle = '#22aa22';
      ctx.fillRect(x, y - 6, 2, 2);
      // Wrap ribbon
      ctx.fillStyle = '#fff8dc';
      ctx.fillRect(x + 1, y - 2, 5, 2);

      // === HEAD ===
      ctx.fillStyle = '#f5c5a3';
      ctx.fillRect(x - 6, y + 2, 12, 12);
      // Head sides (rounded pixel look)
      ctx.fillRect(x - 7, y + 3, 2, 9);
      ctx.fillRect(x + 5, y + 3, 2, 9);

      // === BROWN BOB HAIR (карé) ===
      ctx.fillStyle = '#6b3a2a';
      // Top hair
      ctx.fillRect(x - 7, y - 1, 14, 5);
      // Left side bob (falls to jaw)
      ctx.fillRect(x - 8, y + 3, 3, 10);
      // Right side bob
      ctx.fillRect(x + 5, y + 3, 3, 10);
      // Hair highlights
      ctx.fillStyle = '#8b5a3a';
      ctx.fillRect(x - 4, y - 1, 6, 2);
      ctx.fillRect(x - 6, y + 1, 2, 4);

      // === EYES (brown) ===
      ctx.fillStyle = '#3d1f00';
      ctx.fillRect(x - 4, y + 7, 3, 3);
      ctx.fillRect(x + 1, y + 7, 3, 3);
      // Pupils
      ctx.fillStyle = '#6b3300';
      ctx.fillRect(x - 3, y + 8, 2, 2);
      ctx.fillRect(x + 2, y + 8, 2, 2);
      // Eye shine
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 2, y + 7, 1, 1);
      ctx.fillRect(x + 3, y + 7, 1, 1);
      // Lashes
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(x - 5, y + 6, 1, 2);
      ctx.fillRect(x - 4, y + 6, 3, 1);
      ctx.fillRect(x, y + 6, 4, 1);
      ctx.fillRect(x + 4, y + 6, 1, 2);

      // === GLASSES ===
      ctx.fillStyle = '#4a3728';
      // Left frame
      ctx.fillRect(x - 5, y + 6, 4, 4);
      ctx.fillRect(x - 6, y + 7, 1, 2);
      // Right frame
      ctx.fillRect(x + 1, y + 6, 4, 4);
      ctx.fillRect(x + 5, y + 7, 1, 2);
      // Bridge
      ctx.fillRect(x - 1, y + 8, 2, 1);
      // Glass tint
      ctx.fillStyle = 'rgba(100,180,255,0.18)';
      ctx.fillRect(x - 4, y + 7, 3, 3);
      ctx.fillRect(x + 2, y + 7, 3, 3);

      // === MOUTH (smile) ===
      ctx.fillStyle = '#c0725a';
      ctx.fillRect(x - 2, y + 12, 4, 1);
      ctx.fillStyle = '#e8967a';
      ctx.fillRect(x - 1, y + 13, 2, 1);

      // === BLUSH ===
      ctx.fillStyle = 'rgba(255,120,100,0.35)';
      ctx.fillRect(x - 6, y + 10, 3, 2);
      ctx.fillRect(x + 3, y + 10, 3, 2);

      // === BODY — teal dress / shirt ===
      ctx.fillStyle = '#3a8a7a';
      ctx.fillRect(x - 6, y + 14, 12, 12);
      // Collar
      ctx.fillStyle = '#5ab8a8';
      ctx.fillRect(x - 2, y + 14, 4, 3);
      ctx.fillRect(x - 1, y + 14, 2, 5);
      // Body shading
      ctx.fillStyle = '#2d6b5e';
      ctx.fillRect(x + 3, y + 15, 3, 10);

      // Right arm holding bouquet
      ctx.fillStyle = '#f5c5a3';
      ctx.fillRect(x + 5, y + 15, 3, 8);
      ctx.fillStyle = '#3a8a7a';
      ctx.fillRect(x + 5, y + 15, 3, 4);

      // Left arm swinging
      ctx.fillStyle = '#f5c5a3';
      if (runFrame === 0) {
        ctx.fillRect(x - 8, y + 16, 3, 6);
      } else {
        ctx.fillRect(x - 8, y + 18, 3, 6);
      }
      ctx.fillStyle = '#3a8a7a';
      if (runFrame === 0) {
        ctx.fillRect(x - 8, y + 16, 3, 3);
      } else {
        ctx.fillRect(x - 8, y + 18, 3, 3);
      }

      // === SKIRT ===
      ctx.fillStyle = '#2e7a6a';
      ctx.fillRect(x - 7, y + 26, 14, 8);
      ctx.fillStyle = '#3a8a7a';
      ctx.fillRect(x - 7, y + 26, 14, 2);
      ctx.fillStyle = '#1d5a4e';
      ctx.fillRect(x - 7, y + 32, 14, 2);

      // === LEGS ===
      ctx.fillStyle = '#f5c5a3';
      if (runFrame === 0) {
        ctx.fillRect(x - 5, y + 34, 4, 7);
        ctx.fillRect(x + 1, y + 34, 4, 5);
      } else {
        ctx.fillRect(x - 5, y + 34, 4, 5);
        ctx.fillRect(x + 1, y + 34, 4, 7);
      }

      // === SHOES (brown) ===
      ctx.fillStyle = '#5c3317';
      ctx.fillRect(x - 6, y + 39, 6, 3);
      ctx.fillRect(x + 1, y + 39, 6, 3);
      ctx.fillStyle = '#7a4522';
      ctx.fillRect(x - 6, y + 39, 6, 1);
      ctx.fillRect(x + 1, y + 39, 6, 1);

    } else {
      // === DUCKING ===
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x - 8, y + 26, 16, 3);

      // Bouquet
      ctx.fillStyle = '#4a7c3f';
      ctx.fillRect(x + 3, y + 2, 2, 6);
      ctx.fillStyle = '#ff6b9d';
      ctx.fillRect(x + 2, y - 2, 4, 4);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(x + 6, y, 3, 3);

      // Head
      ctx.fillStyle = '#f5c5a3';
      ctx.fillRect(x - 6, y + 4, 12, 11);
      // Hair
      ctx.fillStyle = '#6b3a2a';
      ctx.fillRect(x - 7, y + 2, 14, 4);
      ctx.fillRect(x - 8, y + 5, 3, 8);
      ctx.fillRect(x + 5, y + 5, 3, 8);
      // Eyes
      ctx.fillStyle = '#3d1f00';
      ctx.fillRect(x - 4, y + 8, 3, 2);
      ctx.fillRect(x + 1, y + 8, 3, 2);
      // Glasses
      ctx.fillStyle = '#4a3728';
      ctx.fillRect(x - 5, y + 7, 4, 3);
      ctx.fillRect(x + 1, y + 7, 4, 3);
      ctx.fillRect(x - 1, y + 8, 2, 1);
      // Body ducked
      ctx.fillStyle = '#3a8a7a';
      ctx.fillRect(x - 8, y + 15, 16, 8);
      ctx.fillStyle = '#2e7a6a';
      ctx.fillRect(x - 8, y + 20, 16, 5);
      // Legs
      ctx.fillStyle = '#f5c5a3';
      ctx.fillRect(x - 6, y + 21, 5, 4);
      ctx.fillRect(x + 1, y + 21, 5, 4);
      ctx.fillStyle = '#5c3317';
      ctx.fillRect(x - 7, y + 24, 6, 2);
      ctx.fillRect(x + 1, y + 24, 6, 2);
    }

    ctx.restore();
  }, []);

  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, o: Obstacle) => {
    ctx.save();
    if (o.type === 'fence') {
      // === ЛАДА КАЛИНА — зелёная пиксель-арт ===
      const cx = o.x;
      const cy = o.y;

      // Тень под машиной
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(cx + 4, cy + o.h - 2, o.w - 8, 5);

      // Колёса (сначала, под кузовом)
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(cx + 4, cy + o.h - 12, 12, 12);
      ctx.fillRect(cx + o.w - 16, cy + o.h - 12, 12, 12);
      // Диски
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(cx + 7, cy + o.h - 9, 6, 6);
      ctx.fillRect(cx + o.w - 13, cy + o.h - 9, 6, 6);
      ctx.fillStyle = '#dddddd';
      ctx.fillRect(cx + 9, cy + o.h - 7, 2, 2);
      ctx.fillRect(cx + o.w - 11, cy + o.h - 7, 2, 2);

      // Основной кузов — зелёный (Лада Калина цвет)
      ctx.fillStyle = '#3a8c2f';
      ctx.fillRect(cx + 2, cy + 12, o.w - 4, o.h - 22);
      // Низ кузова (порог)
      ctx.fillStyle = '#2d6e24';
      ctx.fillRect(cx + 2, cy + o.h - 18, o.w - 4, 6);

      // Крыша — чуть светлее
      ctx.fillStyle = '#4aad3a';
      ctx.fillRect(cx + 8, cy + 2, o.w - 18, 12);
      // Крыша верхний блик
      ctx.fillStyle = '#5ec44c';
      ctx.fillRect(cx + 10, cy + 2, o.w - 22, 3);

      // Лобовое стекло
      ctx.fillStyle = '#b8e4ff';
      ctx.fillRect(cx + o.w - 18, cy + 4, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(cx + o.w - 17, cy + 4, 3, 4);
      // Заднее стекло
      ctx.fillStyle = '#b8e4ff';
      ctx.fillRect(cx + 8, cy + 4, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(cx + 9, cy + 4, 3, 4);

      // Дверная линия
      ctx.fillStyle = '#2d6e24';
      ctx.fillRect(cx + 2, cy + 18, o.w - 4, 2);
      ctx.fillRect(cx + o.w / 2 - 1, cy + 14, 2, o.h - 26);

      // Передняя фара
      ctx.fillStyle = '#fffde0';
      ctx.fillRect(cx + o.w - 6, cy + 16, 4, 4);
      ctx.fillStyle = '#ffee88';
      ctx.fillRect(cx + o.w - 5, cy + 17, 2, 2);
      // Задний фонарь
      ctx.fillStyle = '#cc2200';
      ctx.fillRect(cx + 2, cy + 14, 4, 6);
      ctx.fillStyle = '#ff4422';
      ctx.fillRect(cx + 3, cy + 15, 2, 4);

      // Бампер передний
      ctx.fillStyle = '#555';
      ctx.fillRect(cx + o.w - 6, cy + o.h - 18, 6, 6);
      ctx.fillStyle = '#777';
      ctx.fillRect(cx + o.w - 5, cy + o.h - 17, 4, 2);
      // Бампер задний
      ctx.fillStyle = '#555';
      ctx.fillRect(cx, cy + o.h - 18, 6, 6);

      // Номерной знак (спереди)
      ctx.fillStyle = '#fffde0';
      ctx.fillRect(cx + o.w - 5, cy + o.h - 14, 5, 3);
      ctx.fillStyle = '#1a1a99';
      ctx.fillRect(cx + o.w - 4, cy + o.h - 13, 3, 1);

      // Антенна
      ctx.fillStyle = '#2d6e24';
      ctx.fillRect(cx + 14, cy - 4, 1, 6);
      ctx.fillStyle = '#888';
      ctx.fillRect(cx + 14, cy - 8, 1, 4);

    } else if (o.type === 'pit') {
      // Pit - dark hole
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(o.x, o.y, o.w, 60);
      // Pit edges
      ctx.fillStyle = '#3d2b1f';
      ctx.fillRect(o.x, o.y, o.w, 6);
      ctx.fillStyle = '#2a1a0e';
      ctx.fillRect(o.x + 4, o.y + 6, o.w - 8, 8);
    } else if (o.type === 'platform') {
      // Platform
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(o.x, o.y, o.w, 4);
      // Grass tufts
      ctx.fillStyle = '#1a8a45';
      for (let i = 4; i < o.w; i += 10) {
        ctx.fillRect(o.x + i, o.y - 2, 2, 3);
        ctx.fillRect(o.x + i + 3, o.y - 3, 2, 4);
      }
    } else if (o.type === 'enemy') {
      // Enemy slime / blob
      const t = Date.now() / 300;
      const bob = Math.sin(t) * 2;
      // Body
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(o.x, o.y + bob, o.w, o.h - 8);
      // Eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(o.x + 4, o.y + 8 + bob, 4, 4);
      ctx.fillRect(o.x + 16, o.y + 8 + bob, 4, 4);
      // Pupils
      ctx.fillStyle = '#000';
      ctx.fillRect(o.x + 5, o.y + 9 + bob, 2, 2);
      ctx.fillRect(o.x + 17, o.y + 9 + bob, 2, 2);
      // Teeth
      ctx.fillStyle = '#fff';
      ctx.fillRect(o.x + 6, o.y + 18 + bob, 4, 3);
      ctx.fillRect(o.x + 14, o.y + 18 + bob, 4, 3);
      // Legs
      ctx.fillStyle = '#7d3c98';
      ctx.fillRect(o.x + 2, o.y + o.h - 8 + bob, 6, 8);
      ctx.fillRect(o.x + o.w - 8, o.y + o.h - 8 + bob, 6, 8);
    }
    ctx.restore();
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, bgX: number, clouds: number[]) => {
    // Sky gradient (pixel stepped)
    const skyColors = ['#0d0d2b', '#111240', '#1a1a55', '#1e1e6a'];
    skyColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * (GROUND_Y / skyColors.length), W, GROUND_Y / skyColors.length);
    });

    // Stars
    ctx.fillStyle = '#fff';
    const starPositions = [[30, 20], [100, 50], [200, 15], [350, 40], [500, 25], [650, 10], [720, 55], [760, 35], [420, 60], [580, 18]];
    starPositions.forEach(([sx, sy]) => {
      ctx.fillRect(sx, sy, 2, 2);
    });

    // Moon
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(680, 18, 24, 24);
    ctx.fillStyle = '#1a1a55';
    ctx.fillRect(686, 22, 14, 16);

    // Clouds (pixel)
    clouds.forEach((cx, i) => {
      const cy = 60 + i * 25;
      ctx.fillStyle = 'rgba(200,210,255,0.3)';
      ctx.fillRect(cx, cy, 60, 16);
      ctx.fillRect(cx + 10, cy - 10, 40, 12);
      ctx.fillRect(cx + 20, cy - 18, 20, 10);
    });

    // Ground (pixel tiled)
    const gTileW = 32;
    const offsetX = bgX % gTileW;
    for (let gx = -offsetX; gx < W + gTileW; gx += gTileW) {
      // Top grass
      ctx.fillStyle = '#3d9e3d';
      ctx.fillRect(gx, GROUND_Y, gTileW - 1, 8);
      // Dirt
      ctx.fillStyle = '#6B4226';
      ctx.fillRect(gx, GROUND_Y + 8, gTileW - 1, H - GROUND_Y - 8);
      // Grass detail
      ctx.fillStyle = '#2d7a2d';
      ctx.fillRect(gx, GROUND_Y + 8, gTileW - 1, 4);
    }
  }, []);

  const drawTarget = useCallback((ctx: CanvasRenderingContext2D, x: number) => {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const base = GROUND_Y;
    const t = Date.now() / 800;
    const bob = Math.sin(t) * 1.5; // gentle sway

    // === SHADOW ===
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x - 9, base, 18, 3);

    // === FLOATING HEARTS (waiting animation) ===
    const heartT = Date.now() / 600;
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.7 + Math.sin(heartT) * 0.3;
    ctx.fillText('♥', x - 10, base - 68 + bob - Math.sin(heartT) * 4);
    ctx.fillText('♥', x + 10, base - 72 + bob - Math.sin(heartT + 1) * 4);
    ctx.font = '14px serif';
    ctx.globalAlpha = 0.9 + Math.sin(heartT + 0.5) * 0.1;
    ctx.fillText('❤', x, base - 80 + bob - Math.sin(heartT + 0.5) * 5);
    ctx.globalAlpha = 1;

    // === HEAD ===
    ctx.fillStyle = '#f0b98c';
    ctx.fillRect(x - 7, base - 58 + bob, 14, 13);
    ctx.fillRect(x - 8, base - 56 + bob, 2, 10);
    ctx.fillRect(x + 6, base - 56 + bob, 2, 10);

    // === DARK BOB HAIR (тёмное карé) ===
    ctx.fillStyle = '#2a1a10';
    // Top
    ctx.fillRect(x - 8, base - 62 + bob, 16, 6);
    // Left side — straight bob to chin
    ctx.fillRect(x - 9, base - 57 + bob, 3, 12);
    ctx.fillRect(x - 8, base - 62 + bob, 3, 4);
    // Right side
    ctx.fillRect(x + 6, base - 57 + bob, 3, 12);
    ctx.fillRect(x + 5, base - 62 + bob, 3, 4);
    // Hair shine highlight
    ctx.fillStyle = '#3d2818';
    ctx.fillRect(x - 3, base - 62 + bob, 6, 2);
    ctx.fillRect(x - 6, base - 60 + bob, 2, 3);
    // Fringe / bangs
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(x - 5, base - 62 + bob, 10, 3);
    ctx.fillRect(x - 4, base - 64 + bob, 8, 2);

    // === EYES (карие — brown) ===
    ctx.fillStyle = '#3d1f00';
    ctx.fillRect(x - 5, base - 52 + bob, 4, 4);
    ctx.fillRect(x + 1, base - 52 + bob, 4, 4);
    // Iris — rich brown
    ctx.fillStyle = '#7a4010';
    ctx.fillRect(x - 4, base - 51 + bob, 3, 3);
    ctx.fillRect(x + 2, base - 51 + bob, 3, 3);
    // Pupil
    ctx.fillStyle = '#1a0800';
    ctx.fillRect(x - 3, base - 51 + bob, 2, 2);
    ctx.fillRect(x + 2, base - 51 + bob, 2, 2);
    // Shine
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 3, base - 52 + bob, 1, 1);
    ctx.fillRect(x + 3, base - 52 + bob, 1, 1);
    // Lashes
    ctx.fillStyle = '#1a0800';
    ctx.fillRect(x - 6, base - 53 + bob, 5, 1);
    ctx.fillRect(x + 1, base - 53 + bob, 5, 1);
    ctx.fillRect(x - 6, base - 53 + bob, 1, 2);
    ctx.fillRect(x + 5, base - 53 + bob, 1, 2);

    // === NOSE (tiny) ===
    ctx.fillStyle = '#d4917a';
    ctx.fillRect(x - 1, base - 48 + bob, 2, 1);

    // === LIPS ===
    ctx.fillStyle = '#d45a70';
    ctx.fillRect(x - 3, base - 46 + bob, 6, 2);
    ctx.fillStyle = '#e87090';
    ctx.fillRect(x - 2, base - 46 + bob, 4, 1);

    // === BLUSH ===
    ctx.fillStyle = 'rgba(255,130,100,0.3)';
    ctx.fillRect(x - 7, base - 49 + bob, 3, 2);
    ctx.fillRect(x + 4, base - 49 + bob, 3, 2);

    // === NECK ===
    ctx.fillStyle = '#f0b98c';
    ctx.fillRect(x - 2, base - 45 + bob, 4, 4);

    // === DRESS — lavender/purple (Stardew style) ===
    ctx.fillStyle = '#7c5cbf';
    ctx.fillRect(x - 8, base - 41 + bob, 16, 15);
    // Collar / neckline detail
    ctx.fillStyle = '#9b7fdb';
    ctx.fillRect(x - 3, base - 41 + bob, 6, 3);
    ctx.fillRect(x - 2, base - 41 + bob, 4, 6);
    // Dress shading
    ctx.fillStyle = '#5e3fa8';
    ctx.fillRect(x + 4, base - 40 + bob, 4, 13);
    // Small bow
    ctx.fillStyle = '#e8a0c0';
    ctx.fillRect(x - 2, base - 38 + bob, 4, 2);
    ctx.fillStyle = '#ff80aa';
    ctx.fillRect(x - 1, base - 38 + bob, 2, 2);

    // === ARMS (reaching out slightly) ===
    ctx.fillStyle = '#f0b98c';
    // Left arm (waving)
    const armWave = Math.sin(t * 2) * 3;
    ctx.fillRect(x - 11, base - 39 + bob + armWave, 4, 7);
    ctx.fillStyle = '#7c5cbf';
    ctx.fillRect(x - 11, base - 39 + bob + armWave, 4, 3);
    // Right arm
    ctx.fillStyle = '#f0b98c';
    ctx.fillRect(x + 7, base - 39 + bob, 4, 7);
    ctx.fillStyle = '#7c5cbf';
    ctx.fillRect(x + 7, base - 39 + bob, 4, 3);

    // === SKIRT flared ===
    ctx.fillStyle = '#6a4db0';
    ctx.fillRect(x - 10, base - 26 + bob, 20, 14);
    ctx.fillStyle = '#7c5cbf';
    ctx.fillRect(x - 10, base - 26 + bob, 20, 3);
    // Skirt hem detail
    ctx.fillStyle = '#9b7fdb';
    ctx.fillRect(x - 10, base - 14 + bob, 20, 2);
    // Skirt folds
    ctx.fillStyle = '#5e3fa8';
    ctx.fillRect(x - 4, base - 25 + bob, 3, 12);
    ctx.fillRect(x + 3, base - 25 + bob, 3, 12);

    // === LEGS ===
    ctx.fillStyle = '#f0b98c';
    ctx.fillRect(x - 5, base - 12 + bob, 4, 12);
    ctx.fillRect(x + 1, base - 12 + bob, 4, 12);

    // === SHOES (dark, Stardew style) ===
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(x - 6, base - 1 + bob, 7, 4);
    ctx.fillRect(x + 0, base - 1 + bob, 7, 4);
    ctx.fillStyle = '#3d2818';
    ctx.fillRect(x - 6, base - 1 + bob, 7, 1);
    ctx.fillRect(x + 0, base - 1 + bob, 7, 1);
    // Heel
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x - 6, base + 2 + bob, 3, 1);
    ctx.fillRect(x + 4, base + 2 + bob, 3, 1);

    ctx.restore();
  }, []);

  const drawHUD = useCallback((ctx: CanvasRenderingContext2D, score: number, livesCount: number, showFps: boolean, fpsVal: number) => {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Score
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`СЧЁТ: ${score}`, 12, 22);
    // Lives as hearts
    ctx.font = '14px serif';
    for (let i = 0; i < livesCount; i++) {
      ctx.fillText('❤', 12 + i * 20, 44);
    }
    // Name labels
    ctx.shadowBlur = 2;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffd6e8';
    ctx.fillText('Настюша', 12, 58);
    ctx.fillStyle = '#d6e8ff';
    ctx.textAlign = 'right';
    ctx.fillText('Ксюня ♥', W - 12, 22);
    ctx.textAlign = 'left';

    if (showFps) {
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#0f0';
      ctx.fillText(`FPS: ${fpsVal}`, W - 70, 36);
    }
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const s = stateRef.current;
    s.speed = getDiffSpeed(settings.difficulty);
    s.spawnRate = getDiffSpawnRate(settings.difficulty);

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;

      // FPS
      s.fpsTimer += dt;
      s.fpsCount++;
      if (s.fpsTimer >= 60) {
        s.fps = Math.round(s.fpsCount);
        s.fpsCount = 0;
        s.fpsTimer = 0;
        setFps(s.fps);
      }

      if (!s.finished) {
        // Speed increase over time
        s.speed += 0.001 * dt;

        // Move background
        s.bgX += s.speed * dt;
        s.cloudX = s.cloudX.map(cx => {
          cx -= 0.5 * dt;
          if (cx < -80) cx = W + 20;
          return cx;
        });

        const p = s.player;

        // Jump input
        if (keysRef.current.up && !jumpedRef.current && p.onGround) {
          p.vy = JUMP_FORCE;
          p.onGround = false;
          jumpedRef.current = true;
          spawnParticles(p.x + p.w / 2, p.y + p.h, '#27ae60', 6);
        }
        if (!keysRef.current.up) jumpedRef.current = false;

        // Duck
        if (keysRef.current.down && p.onGround) {
          p.ducking = true;
          p.h = 24;
          p.y = GROUND_Y - 24;
        } else if (!p.ducking || !keysRef.current.down) {
          if (p.ducking) {
            p.ducking = false;
            p.h = 40;
            p.y = GROUND_Y - 40;
          }
        }

        // Gravity
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        p.onGround = false;
        p.onPlatform = false;

        // Ground collision
        if (p.y + p.h >= GROUND_Y) {
          p.y = GROUND_Y - p.h;
          p.vy = 0;
          p.onGround = true;
        }

        // Run animation
        if (p.onGround) {
          p.runTimer += dt;
          if (p.runTimer > 10) {
            p.runFrame = (p.runFrame + 1) % 2;
            p.runTimer = 0;
          }
        }

        // Flower animation
        s.flowerTimer += dt;
        if (s.flowerTimer > 18) {
          s.flowerFrame = (s.flowerFrame + 1) % 5;
          s.flowerTimer = 0;
        }

        // Invincibility countdown
        if (p.invincible > 0) p.invincible -= dt;

        // Spawn obstacles
        s.spawnTimer += dt;
        if (s.spawnTimer >= s.spawnRate) {
          spawnObstacle(s);
          s.spawnTimer = 0;
          s.spawnRate = getDiffSpawnRate(settings.difficulty) * (0.8 + Math.random() * 0.4);
        }

        // Score & distance
        s.distance += s.speed * dt;
        s.score = Math.floor(s.distance / 10);

        // Show target near end
        if (s.score > 800) s.targetVisible = true;

        // Win condition
        if (s.score > 1000) {
          s.won = true;
          s.finished = true;
          onNewHighScore(s.score);
          setGameState('won');
        }

        // Move/update obstacles
        s.obstacles = s.obstacles.filter(o => o.x > -150);
        s.obstacles.forEach(o => {
          if (o.type === 'pit') {
            o.x -= s.speed * dt;
          } else if (o.type === 'enemy') {
            o.x -= s.speed * dt * 0.7;
            // Enemy bounces vertically
            o.vy = (o.vy || 0) + 0.3 * dt;
            o.y += (o.vy || 0) * dt;
            if (o.y + o.h >= GROUND_Y) {
              o.y = GROUND_Y - o.h;
              o.vy = -8;
            }
          } else {
            o.x -= s.speed * dt;
          }
        });

        // Platform collision & player landing on platforms
        s.obstacles.forEach(o => {
          if (o.type === 'platform') {
            if (
              p.x + p.w > o.x + 4 &&
              p.x < o.x + o.w - 4 &&
              p.y + p.h >= o.y &&
              p.y + p.h <= o.y + o.h + 10 &&
              p.vy >= 0
            ) {
              p.y = o.y - p.h;
              p.vy = 0;
              p.onGround = true;
              p.onPlatform = true;
            }
          }
        });

        // Pit collision
        s.obstacles.forEach(o => {
          if (o.type === 'pit') {
            const inPitX = p.x + p.w * 0.5 > o.x && p.x + p.w * 0.5 < o.x + o.w;
            const onGroundLevel = p.y + p.h >= GROUND_Y;
            if (inPitX && onGroundLevel && !p.onPlatform) {
              p.y += 10 * dt;
              if (p.y > H + 50 && p.invincible <= 0) {
                p.lives -= 1;
                p.invincible = 90;
                p.x = 80;
                p.y = GROUND_Y - p.h;
                p.vy = 0;
                spawnParticles(p.x, p.y, '#e74c3c', 12);
                setLives(p.lives);
                if (p.lives <= 0) {
                  s.finished = true;
                  onNewHighScore(s.score);
                  setGameState('dead');
                }
              }
            }
          }
        });

        // Fence & enemy collision
        s.obstacles.forEach(o => {
          if (o.type === 'fence' || o.type === 'enemy') {
            if (
              p.invincible <= 0 &&
              p.x + p.w - 4 > o.x &&
              p.x + 4 < o.x + o.w &&
              p.y + p.h - 4 > o.y &&
              p.y + 4 < o.y + o.h
            ) {
              p.lives -= 1;
              p.invincible = 90;
              p.vy = JUMP_FORCE * 0.6;
              spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#e74c3c', 14);
              setLives(p.lives);
              if (p.lives <= 0) {
                s.finished = true;
                onNewHighScore(s.score);
                setGameState('dead');
              }
            }
          }
        });

        // Update particles
        s.particles = s.particles.filter(pt => pt.life > 0);
        s.particles.forEach(pt => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += 0.2 * dt;
          pt.life -= 0.04 * dt;
        });

        setDisplayScore(s.score);
      }

      // Draw
      ctx.clearRect(0, 0, W, H);
      drawBackground(ctx, s.bgX, s.cloudX);

      // Draw target
      if (s.targetVisible) {
        drawTarget(ctx, s.targetX);
      }

      // Draw obstacles
      s.obstacles.forEach(o => drawObstacle(ctx, o));

      // Draw particles
      s.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.restore();
      });

      // Draw player
      const p = s.player;
      drawPixelChar(ctx, p.x + p.w / 2, p.y, p.ducking, p.invincible, p.runFrame, s.flowerFrame);

      // HUD
      drawHUD(ctx, s.score, p.lives, settings.showFps, s.fps);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [settings, spawnObstacle, spawnParticles, drawBackground, drawTarget, drawObstacle, drawPixelChar, drawHUD, onNewHighScore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); keysRef.current.up = true; }
      if (e.code === 'ArrowDown') { e.preventDefault(); keysRef.current.down = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') keysRef.current.up = false;
      if (e.code === 'ArrowDown') keysRef.current.down = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  const handleJump = () => {
    const p = stateRef.current.player;
    if (p.onGround && !jumpedRef.current) {
      keysRef.current.up = true;
      jumpedRef.current = true;
      setTimeout(() => { keysRef.current.up = false; }, 80);
    }
  };

  return (
    <div className="game-screen">
      <div className="stars-bg" />

      <div className="game-canvas-wrap">
        {/* Score top bar */}
        <div className="game-top-bar">
          <button className="pixel-btn-sm pixel-btn--red" onClick={onBack}>✕</button>
          <span className="game-score-display">СЧЁТ: {displayScore}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="pixel-btn-sm"
              style={{ background: musicPlaying ? '#27ae60' : '#555', color: '#fff', border: '2px solid rgba(255,255,255,0.3)' }}
              onClick={() => setMusicPlaying(m => !m)}
              title={musicPlaying ? 'Выключить музыку' : 'Включить музыку'}
            >
              {musicPlaying ? '♪' : '♪̶'}
            </button>
            <span className="lives-display">
              {Array.from({ length: lives }).map((_, i) => <span key={i}>❤</span>)}
            </span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="game-canvas"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Mobile controls */}
        <div className="mobile-controls">
          <button className="mobile-btn" onPointerDown={handleJump}>
            ▲ ПРЫЖОК
          </button>
          <button className="mobile-btn"
            onPointerDown={() => { keysRef.current.down = true; }}
            onPointerUp={() => { keysRef.current.down = false; }}
          >
            ▼ ПРИСЕСТЬ
          </button>
        </div>

        {/* Controls hint */}
        <div className="controls-hint">
          ПРОБЕЛ / ↑ — прыжок &nbsp;|&nbsp; ↓ — присесть
        </div>
      </div>

      {/* Game Over overlay */}
      {gameState === 'dead' && (
        <div className="overlay">
          <div className="overlay-box overlay-box--red">
            <div className="overlay-title">GAME OVER</div>
            <div className="overlay-score">СЧЁТ: {displayScore}</div>
            <div className="overlay-flowers">💔</div>
            <p className="overlay-text">Настюша не добежала до Ксюни...</p>
            <div className="overlay-buttons">
              <button className="pixel-btn pixel-btn--green" onClick={() => {
                const s = stateRef.current;
                s.player = { x: 80, y: GROUND_Y - 40, w: 28, h: 40, vy: 0, onGround: false, onPlatform: false, ducking: false, lives: 3, invincible: 0, dead: false, runFrame: 0, runTimer: 0 };
                s.obstacles = [];
                s.particles = [];
                s.score = 0;
                s.speed = getDiffSpeed(settings.difficulty);
                s.spawnTimer = 0;
                s.spawnRate = getDiffSpawnRate(settings.difficulty);
                s.bgX = 0;
                s.distance = 0;
                s.won = false;
                s.finished = false;
                s.targetVisible = false;
                setGameState('playing');
                setDisplayScore(0);
                setLives(3);
              }}>▶ ЕЩЁ РАЗ</button>
              <button className="pixel-btn pixel-btn--blue" onClick={onBack}>← МЕНЮ</button>
            </div>
          </div>
        </div>
      )}

      {/* Win overlay */}
      {gameState === 'won' && (
        <div className="overlay">
          <div className="overlay-box overlay-box--gold">
            <div className="overlay-title">ПОБЕДА!</div>
            <div className="overlay-flowers">💐💑💐</div>
            <p className="overlay-text">Тебе удалось поздравить Ксюню!</p>
            <div className="overlay-score">СЧЁТ: {displayScore}</div>
            <div className="overlay-buttons">
              <button className="pixel-btn pixel-btn--green" onClick={() => {
                const s = stateRef.current;
                s.player = { x: 80, y: GROUND_Y - 40, w: 28, h: 40, vy: 0, onGround: false, onPlatform: false, ducking: false, lives: 3, invincible: 0, dead: false, runFrame: 0, runTimer: 0 };
                s.obstacles = [];
                s.particles = [];
                s.score = 0;
                s.speed = getDiffSpeed(settings.difficulty);
                s.spawnTimer = 0;
                s.spawnRate = getDiffSpawnRate(settings.difficulty);
                s.bgX = 0;
                s.distance = 0;
                s.won = false;
                s.finished = false;
                s.targetVisible = false;
                setGameState('playing');
                setDisplayScore(0);
                setLives(3);
              }}>▶ ЕЩЁ РАЗ</button>
              <button className="pixel-btn pixel-btn--blue" onClick={onBack}>← МЕНЮ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
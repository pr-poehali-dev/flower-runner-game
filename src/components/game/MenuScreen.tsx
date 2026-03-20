import { Screen } from '@/pages/Index';
import { useEffect, useState } from 'react';

interface Props {
  onNavigate: (s: Screen) => void;
  highScore: number;
}

const PIXEL_FLOWERS = ['🌸', '🌺', '🌼', '🌻', '💐'];

export default function MenuScreen({ onNavigate, highScore }: Props) {
  const [flowerIdx, setFlowerIdx] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setFlowerIdx(i => (i + 1) % PIXEL_FLOWERS.length), 600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="game-screen">
      {/* Stars background */}
      <div className="stars-bg" />

      {/* Ground */}
      <div className="ground-strip" />

      {/* Title */}
      <div className="menu-title-wrap">
        <div className="pixel-title-shadow">ЦВЕТОЧНЫЙ</div>
        <div className="pixel-title">ЦВЕТОЧНЫЙ</div>
        <div className="pixel-subtitle-shadow">ЗАБЕГ</div>
        <div className="pixel-subtitle">ЗАБЕГ</div>
      </div>

      {/* Running girls preview */}
      <div className="runner-preview">
        <div className="runner-sprite-menu">
          <div className="sprite-flower">{PIXEL_FLOWERS[flowerIdx]}</div>
          <div className="sprite-body">🏃‍♀️</div>
          <div className="sprite-label">Настюша</div>
        </div>
        <div className="dotted-line" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div className="target-sprite">🧍‍♀️</div>
          <div className="sprite-label">Ксюня</div>
        </div>
      </div>

      {/* Menu buttons */}
      <nav className="menu-nav">
        <button className="pixel-btn pixel-btn--green" onClick={() => onNavigate('game')}>
          ▶ ИГРАТЬ
        </button>
        <button className="pixel-btn pixel-btn--blue" onClick={() => onNavigate('rules')}>
          ? ПРАВИЛА
        </button>
        <button className="pixel-btn pixel-btn--yellow" onClick={() => onNavigate('settings')}>
          ⚙ НАСТРОЙКИ
        </button>
      </nav>

      {highScore > 0 && (
        <div className="high-score-display">
          🏆 РЕКОРД: {highScore}
        </div>
      )}

      <div className={`press-start ${blink ? 'visible' : 'invisible'}`}>
        НАЖМИ ИГРАТЬ
      </div>
    </div>
  );
}
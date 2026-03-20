import { GameSettings } from '@/pages/Index';

interface Props {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onBack: () => void;
}

export default function SettingsScreen({ settings, onChange, onBack }: Props) {
  const set = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="game-screen">
      <div className="stars-bg" />
      <div className="ground-strip" />

      <div className="settings-container">
        <h1 className="pixel-header">НАСТРОЙКИ</h1>

        <div className="settings-list">
          {/* Volume */}
          <div className="setting-row">
            <span className="setting-label">🔊 ГРОМКОСТЬ</span>
            <div className="volume-bar-wrap">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                <button
                  key={v}
                  className={`vol-block ${settings.volume >= v ? 'vol-on' : 'vol-off'}`}
                  onClick={() => set({ volume: v })}
                />
              ))}
            </div>
            <span className="setting-value">{settings.volume}%</span>
          </div>

          {/* Difficulty */}
          <div className="setting-row">
            <span className="setting-label">⚡ СЛОЖНОСТЬ</span>
            <div className="diff-buttons">
              {(['easy', 'normal', 'hard'] as const).map(d => (
                <button
                  key={d}
                  className={`diff-btn ${settings.difficulty === d ? 'diff-active' : ''}`}
                  onClick={() => set({ difficulty: d })}
                >
                  {d === 'easy' ? 'ЛЕГКО' : d === 'normal' ? 'НОРМ' : 'ХАРДКОР'}
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div className="setting-row">
            <span className="setting-label">📊 ПОКАЗ FPS</span>
            <button
              className={`toggle-btn ${settings.showFps ? 'toggle-on' : 'toggle-off'}`}
              onClick={() => set({ showFps: !settings.showFps })}
            >
              {settings.showFps ? '▶ ВКЛ' : '■ ВЫКЛ'}
            </button>
          </div>
        </div>

        <div className="settings-hint">
          <span>СЛОЖНОСТЬ ВЛИЯЕТ НА СКОРОСТЬ И ЧАСТОТУ ПРЕПЯТСТВИЙ</span>
        </div>

        <button className="pixel-btn pixel-btn--red" onClick={onBack}>
          ← НАЗАД
        </button>
      </div>
    </div>
  );
}

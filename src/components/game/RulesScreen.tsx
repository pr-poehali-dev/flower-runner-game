interface Props {
  onBack: () => void;
}

const rules = [
  { icon: '⬆', text: 'ПРОБЕЛ или ↑ — прыжок' },
  { icon: '⬇', text: '↓ — присесть' },
  { icon: '🌸', text: 'Донеси цветы любимой' },
  { icon: '🚧', text: 'Перепрыгивай заборы' },
  { icon: '🕳', text: 'Не упади в яму' },
  { icon: '🟩', text: 'Прыгай по платформам' },
  { icon: '👾', text: 'Избегай врагов' },
  { icon: '❤', text: 'У тебя 3 жизни' },
];

export default function RulesScreen({ onBack }: Props) {
  return (
    <div className="game-screen">
      <div className="stars-bg" />
      <div className="ground-strip" />

      <div className="rules-container">
        <h1 className="pixel-header">ПРАВИЛА</h1>

        <div className="rules-list">
          {rules.map((r, i) => (
            <div key={i} className="rule-item" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="rule-icon">{r.icon}</span>
              <span className="rule-text">{r.text}</span>
            </div>
          ))}
        </div>

        <div className="rules-story">
          <div className="story-box">
            <p>Влюблённый герой спешит с букетом цветов к своей любимой. На пути множество препятствий — только ловкость и отвага помогут ему добраться до цели!</p>
          </div>
        </div>

        <button className="pixel-btn pixel-btn--red" onClick={onBack}>
          ← НАЗАД
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import MenuScreen from '@/components/game/MenuScreen';
import GameScreen from '@/components/game/GameScreen';
import RulesScreen from '@/components/game/RulesScreen';
import SettingsScreen from '@/components/game/SettingsScreen';

export type Screen = 'menu' | 'game' | 'rules' | 'settings';

export interface GameSettings {
  volume: number;
  difficulty: 'easy' | 'normal' | 'hard';
  showFps: boolean;
}

export default function Index() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<GameSettings>({
    volume: 70,
    difficulty: 'normal',
    showFps: false,
  });
  const [highScore, setHighScore] = useState(0);

  return (
    <div className="game-root">
      {screen === 'menu' && (
        <MenuScreen onNavigate={setScreen} highScore={highScore} />
      )}
      {screen === 'game' && (
        <GameScreen
          settings={settings}
          onBack={() => setScreen('menu')}
          onNewHighScore={(s) => setHighScore(Math.max(highScore, s))}
        />
      )}
      {screen === 'rules' && (
        <RulesScreen onBack={() => setScreen('menu')} />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onChange={setSettings}
          onBack={() => setScreen('menu')}
        />
      )}
    </div>
  );
}

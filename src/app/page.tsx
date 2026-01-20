'use client';

import { useState } from 'react';
import { SessionConfig } from '@/lib/types';
import { SetupScreen } from '@/components/SetupScreen';
import { JamSession } from '@/components/JamSession';
import { SoloSession } from '@/components/SoloSession';

export default function Home() {
  const [config, setConfig] = useState<SessionConfig | null>(null);

  const handleStart = (newConfig: SessionConfig) => {
    setConfig(newConfig);
  };

  const handleStop = () => {
    setConfig(null);
  };

  if (config) {
    if (config.musicians.length === 1) {
      return <SoloSession config={config} onStop={handleStop} />;
    }
    return <JamSession config={config} onStop={handleStop} />;
  }

  return <SetupScreen onStart={handleStart} />;
}

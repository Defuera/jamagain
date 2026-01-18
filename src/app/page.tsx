'use client';

import { useState } from 'react';
import { SessionConfig } from '@/lib/types';
import { SetupScreen } from '@/components/SetupScreen';
import { JamSession } from '@/components/JamSession';

export default function Home() {
  const [config, setConfig] = useState<SessionConfig | null>(null);

  const handleStart = (newConfig: SessionConfig) => {
    setConfig(newConfig);
  };

  const handleStop = () => {
    setConfig(null);
  };

  if (config) {
    return <JamSession config={config} onStop={handleStop} />;
  }

  return <SetupScreen onStart={handleStart} />;
}

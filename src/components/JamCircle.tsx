'use client';

import { Musician, SoloRecordingState } from '@/lib/types';

interface JamCircleProps {
  musicians: Musician[];
  currentBeat: number;
  currentBar: number;
  isPlaying: boolean;
  isPaused: boolean;
  onTogglePlayPause: () => void;
  soloRecordingState?: SoloRecordingState;
}

export function JamCircle({
  musicians,
  currentBeat,
  currentBar,
  isPlaying,
  isPaused,
  onTogglePlayPause,
  soloRecordingState,
}: JamCircleProps) {
  const isSoloMode = musicians.length === 1;
  // Use viewBox for scaling, actual size controlled by CSS
  const viewBoxSize = 400;
  const center = viewBoxSize / 2;
  const radius = 180;
  const innerRadius = 60;

  // Generate SVG path for a sector
  const getSectorPath = (index: number, total: number) => {
    const anglePerSector = (2 * Math.PI) / total;
    const startAngle = index * anglePerSector - Math.PI / 2;
    const endAngle = (index + 1) * anglePerSector - Math.PI / 2;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArc = anglePerSector > Math.PI ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // Get label position for a sector
  const getLabelPosition = (index: number, total: number) => {
    const anglePerSector = (2 * Math.PI) / total;
    const midAngle = (index + 0.5) * anglePerSector - Math.PI / 2;
    const labelRadius = (radius + innerRadius) / 2;

    return {
      x: center + labelRadius * Math.cos(midAngle),
      y: center + labelRadius * Math.sin(midAngle),
    };
  };

  // Get opacity and styles based on state
  const getStateStyles = (state: Musician['state'], isVirtual: boolean) => {
    switch (state) {
      case 'inactive':
        return { opacity: 0.3, filter: 'grayscale(100%)' };
      case 'starting':
        return { opacity: 1, filter: 'none' };
      case 'preparingToRecord':
        return { opacity: 1, filter: 'none' };
      case 'recording':
        return { opacity: 1, filter: 'none' };
      case 'playing':
        return { opacity: isVirtual ? 0.75 : 0.85, filter: 'none' };
      case 'soloing':
        return { opacity: 1, filter: 'none' };
      default:
        return { opacity: 1, filter: 'none' };
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        className="w-full h-full max-w-[min(100vw,100vh)] max-h-[min(100vw,100vh)]"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Solo mode: Full circle */}
        {isSoloMode && musicians[0] && (
          <g>
            {/* Full donut/annulus */}
            <circle
              cx={center}
              cy={center}
              r={(radius + innerRadius) / 2}
              fill="none"
              stroke={musicians[0].color}
              strokeWidth={radius - innerRadius}
              style={{
                opacity: soloRecordingState === 'recording' ? 1 : 0.85,
                transition: 'all 0.3s ease',
              }}
              className={soloRecordingState === 'recording' || soloRecordingState === 'ready' ? 'animate-pulse' : ''}
            />

            {/* Stroke overlay for recording states */}
            {soloRecordingState === 'recording' && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#ef4444"
                strokeWidth={4}
              />
            )}
            {soloRecordingState === 'ready' && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#eab308"
                strokeWidth={3}
              />
            )}

            {/* Musician name at top of circle */}
            <text
              x={center}
              y={center - radius + 40}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="20"
              fontWeight="bold"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            >
              {musicians[0].name}
            </text>

            {/* Solo recording state indicator */}
            {soloRecordingState === 'warmup' && (
              <text
                x={center}
                y={center - radius + 65}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#9ca3af"
                fontSize="14"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
              >
                Get ready...
              </text>
            )}
            {soloRecordingState === 'ready' && (
              <text
                x={center}
                y={center - radius + 65}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#eab308"
                fontSize="16"
                fontWeight="bold"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                className="animate-pulse"
              >
                READY
              </text>
            )}
            {soloRecordingState === 'recording' && (
              <text
                x={center}
                y={center - radius + 65}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ef4444"
                fontSize="16"
                fontWeight="bold"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                className="animate-pulse"
              >
                ● RECORDING
              </text>
            )}
          </g>
        )}

        {/* Multi-musician mode: Sectors */}
        {!isSoloMode && musicians.map((musician, index) => {
          const path = getSectorPath(index, musicians.length);
          const labelPos = getLabelPosition(index, musicians.length);
          const styles = getStateStyles(musician.state, musician.isVirtual);
          const isSoloing = musician.state === 'soloing';
          const isStarting = musician.state === 'starting';
          const isRecording = musician.state === 'recording';
          const isPreparingToRecord = musician.state === 'preparingToRecord';
          const isVirtual = musician.isVirtual;

          // Determine stroke color based on state
          let strokeColor = 'rgba(0,0,0,0.2)';
          let strokeWidth = 1;
          if (isSoloing) {
            strokeColor = '#ffffff';
            strokeWidth = 4;
          } else if (isRecording) {
            strokeColor = '#ef4444';
            strokeWidth = 3;
          } else if (isPreparingToRecord) {
            strokeColor = '#f97316'; // Orange warning
            strokeWidth = 3;
          } else if (isVirtual && musician.state === 'playing') {
            strokeColor = 'rgba(255,255,255,0.3)';
            strokeWidth = 2;
          }

          return (
            <g key={musician.id}>
              {/* Sector background */}
              <path
                d={path}
                fill={musician.color}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={isVirtual ? '8 4' : 'none'}
                style={{
                  opacity: styles.opacity,
                  filter: styles.filter,
                  transform: isSoloing ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: `${center}px ${center}px`,
                  transition: 'all 0.3s ease',
                }}
                className={isStarting || isRecording || isPreparingToRecord ? 'animate-pulse' : ''}
              />

              {/* Virtual player loop icon */}
              {isVirtual && (
                <text
                  x={labelPos.x}
                  y={labelPos.y - 26}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.7)"
                  fontSize="14"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                >
                  ↻
                </text>
              )}

              {/* Musician name */}
              <text
                x={labelPos.x}
                y={labelPos.y - 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="18"
                fontWeight="bold"
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  opacity: styles.opacity,
                }}
              >
                {musician.name}
              </text>

              {/* Preparing to record badge */}
              {isPreparingToRecord && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#f97316"
                  fontSize="12"
                  fontWeight="bold"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  className="animate-pulse"
                >
                  REC NEXT
                </text>
              )}

              {/* Recording badge */}
              {isRecording && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ef4444"
                  fontSize="14"
                  fontWeight="bold"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  className="animate-pulse"
                >
                  ● REC
                </text>
              )}

              {/* Solo badge */}
              {isSoloing && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isVirtual ? '#a78bfa' : '#fbbf24'}
                  fontSize="14"
                  fontWeight="bold"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                >
                  {isVirtual ? 'LOOP' : 'SOLO'}
                </text>
              )}

              {/* Starting indicator */}
              {isStarting && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  className="animate-pulse"
                >
                  GET READY
                </text>
              )}
            </g>
          );
        })}

        {/* Center circle background */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius - 3}
          fill="#111827"
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Beat indicator dots */}
        {[1, 2, 3, 4].map((beat) => {
          const angle = ((beat - 1) / 4) * 2 * Math.PI - Math.PI / 2;
          const dotRadius = 42;
          const x = center + dotRadius * Math.cos(angle);
          const y = center + dotRadius * Math.sin(angle);
          const isActive = isPlaying && !isPaused && currentBeat === beat;

          return (
            <circle
              key={beat}
              cx={x}
              cy={y}
              r={5}
              fill={isActive ? (beat === 1 ? '#f97316' : '#60a5fa') : '#4b5563'}
              style={{ transition: 'fill 0.1s' }}
            />
          );
        })}
      </svg>

      {/* Center controls overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        {/* Bar counter */}
        <div className="text-white text-lg font-bold mb-1">
          {isPlaying ? `Bar ${currentBar}` : 'Ready'}
        </div>

        {/* Play/Pause button */}
        <button
          onClick={onTogglePlayPause}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${
            isPlaying && !isPaused
              ? 'bg-yellow-600 hover:bg-yellow-500'
              : 'bg-green-600 hover:bg-green-500'
          }`}
          aria-label={isPlaying && !isPaused ? 'Pause' : 'Play'}
        >
          {isPlaying && !isPaused ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
}

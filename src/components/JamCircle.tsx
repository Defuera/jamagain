'use client';

import { Musician } from '@/lib/types';

interface JamCircleProps {
  musicians: Musician[];
  currentBeat: number;
  currentBar: number;
  isPlaying: boolean;
  isPaused: boolean;
  onTogglePlayPause: () => void;
}

export function JamCircle({
  musicians,
  currentBeat,
  currentBar,
  isPlaying,
  isPaused,
  onTogglePlayPause,
}: JamCircleProps) {
  const size = 400;
  const center = size / 2;
  const radius = 160;
  const innerRadius = 70;

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
  const getStateStyles = (state: Musician['state']) => {
    switch (state) {
      case 'inactive':
        return { opacity: 0.3, filter: 'grayscale(100%)' };
      case 'starting':
        return { opacity: 1, filter: 'none' };
      case 'playing':
        return { opacity: 0.85, filter: 'none' };
      case 'soloing':
        return { opacity: 1, filter: 'none' };
      default:
        return { opacity: 1, filter: 'none' };
    }
  };

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Sectors */}
        {musicians.map((musician, index) => {
          const path = getSectorPath(index, musicians.length);
          const labelPos = getLabelPosition(index, musicians.length);
          const styles = getStateStyles(musician.state);
          const isSoloing = musician.state === 'soloing';
          const isStarting = musician.state === 'starting';

          return (
            <g key={musician.id}>
              {/* Sector background */}
              <path
                d={path}
                fill={musician.color}
                stroke={isSoloing ? '#ffffff' : 'rgba(0,0,0,0.2)'}
                strokeWidth={isSoloing ? 4 : 1}
                style={{
                  opacity: styles.opacity,
                  filter: styles.filter,
                  transform: isSoloing ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: `${center}px ${center}px`,
                  transition: 'all 0.3s ease',
                }}
                className={isStarting ? 'animate-pulse' : ''}
              />

              {/* Musician name */}
              <text
                x={labelPos.x}
                y={labelPos.y - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                style={{
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  opacity: styles.opacity,
                }}
              >
                {musician.name}
              </text>

              {/* Solo badge */}
              {isSoloing && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fbbf24"
                  fontSize="12"
                  fontWeight="bold"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  SOLO
                </text>
              )}

              {/* Starting indicator */}
              {isStarting && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  className="animate-pulse"
                >
                  GET READY
                </text>
              )}
            </g>
          );
        })}

        {/* Center circle with controls */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius - 5}
          fill="#1f2937"
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Beat indicator dots */}
        {[1, 2, 3, 4].map((beat) => {
          const angle = ((beat - 1) / 4) * 2 * Math.PI - Math.PI / 2;
          const dotRadius = 25;
          const x = center + dotRadius * Math.cos(angle);
          const y = center + dotRadius * Math.sin(angle);
          const isActive = isPlaying && !isPaused && currentBeat === beat;

          return (
            <circle
              key={beat}
              cx={x}
              cy={y}
              r={6}
              fill={isActive ? (beat === 1 ? '#f97316' : '#60a5fa') : '#4b5563'}
              style={{ transition: 'fill 0.1s' }}
            />
          );
        })}

        {/* Bar counter */}
        <text
          x={center}
          y={center + 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="20"
          fontWeight="bold"
        >
          {isPlaying ? `Bar ${currentBar}` : 'Ready'}
        </text>
      </svg>

      {/* Play/Pause button overlay */}
      <button
        onClick={onTogglePlayPause}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center"
        aria-label={isPlaying && !isPaused ? 'Pause' : 'Play'}
      >
        {/* Invisible hit area, visual is the center circle */}
      </button>
    </div>
  );
}

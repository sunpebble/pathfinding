'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TopographicBackgroundProps {
  lineCount?: number;
  animated?: boolean;
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
}

function generateTopographicPath(
  centerX: number,
  centerY: number,
  baseRadius: number,
  index: number,
  width: number,
  height: number,
): string {
  const points: string[] = [];
  for (let angle = 0; angle <= 360; angle += 3) {
    const radians = (angle * Math.PI) / 180;
    const noise =
      Math.sin(radians * 3 + index * 0.7) * 15 +
      Math.cos(radians * 5 + index * 0.3) * 10 +
      Math.sin(radians * 7 + index * 1.2) * 5;
    const radius = baseRadius + noise;
    const x = centerX + Math.cos(radians) * radius;
    const y = centerY + Math.sin(radians) * radius * 0.6;

    if (x >= -50 && x <= width + 50 && y >= -50 && y <= height + 50) {
      points.push(`${angle === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  return points.join(' ') + ' Z';
}

export function TopographicBackground({
  lineCount = 12,
  animated = false,
  className,
  variant = 'auto',
}: TopographicBackgroundProps) {
  const width = 1200;
  const height = 800;
  const centerX = width * 0.6;
  const centerY = height * 0.4;

  const paths = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => {
      const baseRadius =
        (i + 1) * ((Math.min(width, height) / lineCount) * 0.8);
      const d = generateTopographicPath(centerX, centerY, baseRadius, i, width, height);
      const opacity = 1.0 - (i / lineCount) * 0.5;
      const strokeWidth = i % 3 === 0 ? 1.5 : 1;
      return { d, opacity, strokeWidth, key: i };
    });
  }, [lineCount, centerX, centerY, width, height]);

  const colorClass = variant === 'dark'
    ? 'stroke-white/[0.05]'
    : variant === 'light'
      ? 'stroke-black/[0.04]'
      : 'stroke-black/[0.04] dark:stroke-white/[0.05]';

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn(
          'absolute inset-0 h-full w-full',
          animated && 'animate-topo-drift',
        )}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {paths.map(({ d, opacity, strokeWidth, key }) => (
          <path
            key={key}
            d={d}
            fill="none"
            className={colorClass}
            style={{ opacity }}
            strokeWidth={strokeWidth}
          />
        ))}
      </svg>
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  );
}

import React from 'react';
import styles from './styles.module.css';

function IsometricPlate({ x, y, w, h, depth, opacity, stroke, strokeWidth }: {
  x: number; y: number; w: number; h: number; depth: number;
  opacity: number; stroke: number; strokeWidth: number;
}) {
  return (
    <g>
      <polygon
        points={`${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}`}
        fill="url(#plateGrad)"
        opacity={opacity}
        stroke="#4fb87b"
        strokeWidth={strokeWidth}
        strokeOpacity={0.5}
      />
      <polygon
        points={`${x},${y + h} ${x + w},${y} ${x + w},${y + depth} ${x},${y + h + depth}`}
        fill="url(#plateSideR)"
        opacity={opacity - 0.15}
      />
      <polygon
        points={`${x},${y + h} ${x - w},${y} ${x - w},${y + depth} ${x},${y + h + depth}`}
        fill="url(#plateSide)"
        opacity={opacity - 0.1}
      />
    </g>
  );
}

function IsometricStack({ x, y, plates, scale, symbol, main = false }: {
  x: number; y: number; plates: number; scale: number;
  symbol: string; main?: boolean;
}) {
  const w = 70 * scale;
  const h = 20 * scale;
  const depth = 10 * scale;
  const gap = 22 * scale;
  const baseOpacity = main ? 0.9 : 0.7;
  const sw = main ? 1.5 : 0.8;
  const fontSize = main ? 18 : Math.round(12 * scale / 0.5);

  return (
    <g>
      {Array.from({ length: plates }).map((_, i) => (
        <IsometricPlate
          key={i}
          x={x}
          y={y - i * gap}
          w={w}
          h={h}
          depth={depth}
          opacity={baseOpacity - i * 0.05}
          stroke={0.5}
          strokeWidth={sw}
        />
      ))}
      <text
        x={x}
        y={y - (plates - 1) * gap + 3}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="monospace"
        fontWeight="bold"
        fill="white"
        opacity={0.9}
      >
        {symbol}
      </text>
      {main && (
        <ellipse
          cx={x}
          cy={y + h + depth + 5}
          rx={w * 1.3}
          ry={h * 2}
          fill="#4fb87b"
          opacity={0.06}
        />
      )}
    </g>
  );
}

export default function HeroAnimation() {
  return (
    <div className={styles.container}>
      <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
        <defs>
          <linearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4fb87b" />
            <stop offset="100%" stopColor="#3a8f5e" />
          </linearGradient>
          <linearGradient id="plateSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a8f5e" />
            <stop offset="100%" stopColor="#2d7049" />
          </linearGradient>
          <linearGradient id="plateSideR" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#348053" />
            <stop offset="100%" stopColor="#286441" />
          </linearGradient>
        </defs>

        {/* Subtle grid lines */}
        <g opacity="0.08" stroke="#4fb87b" strokeWidth="0.5" fill="none">
          <line x1="30" y1="210" x2="470" y2="210" />
          <line x1="250" y1="80" x2="250" y2="380" />
          <line x1="80" y1="130" x2="420" y2="330" />
          <line x1="420" y1="130" x2="80" y2="330" />
        </g>

        {/* Back row */}
        <g className={styles.row1}>
          <IsometricStack x={95} y={145} plates={2} scale={0.45} symbol="&lt;/&gt;" />
          <IsometricStack x={195} y={120} plates={5} scale={0.45} symbol="&lt;/&gt;" />
          <IsometricStack x={305} y={120} plates={4} scale={0.45} symbol="{}" />
          <IsometricStack x={405} y={145} plates={2} scale={0.45} symbol="&lt;/&gt;" />
        </g>

        {/* Middle row */}
        <g className={styles.row2}>
          <IsometricStack x={120} y={220} plates={3} scale={0.55} symbol="{}" />
          <IsometricStack x={250} y={205} plates={3} scale={1.0} symbol="&lt;/&gt;" main />
          <IsometricStack x={380} y={220} plates={3} scale={0.55} symbol="&lt;/&gt;" />
        </g>

        {/* Front row */}
        <g className={styles.row3}>
          <IsometricStack x={140} y={310} plates={2} scale={0.4} symbol="{}" />
          <IsometricStack x={250} y={330} plates={3} scale={0.4} symbol="&lt;/&gt;" />
          <IsometricStack x={360} y={310} plates={2} scale={0.4} symbol="{}" />
        </g>
      </svg>
    </div>
  );
}

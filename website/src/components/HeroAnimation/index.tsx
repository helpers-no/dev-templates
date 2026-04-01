import React from 'react';
import styles from './styles.module.css';

export default function HeroAnimation() {
  return (
    <div className={styles.container}>
      <svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
        {/* Stacked plates */}
        <g className={styles.stack}>
          {/* Bottom plate */}
          <g className={styles.plate3}>
            <path d="M200 260 L340 180 L200 220 L60 180 Z" fill="var(--ifm-color-primary)" opacity="0.3" />
            <path d="M200 220 L340 180 L340 200 L200 280 Z" fill="var(--ifm-color-primary)" opacity="0.2" />
            <path d="M200 220 L60 180 L60 200 L200 280 Z" fill="var(--ifm-color-primary)" opacity="0.25" />
          </g>
          {/* Middle plate */}
          <g className={styles.plate2}>
            <path d="M200 200 L340 120 L200 160 L60 120 Z" fill="var(--ifm-color-primary)" opacity="0.5" />
            <path d="M200 160 L340 120 L340 140 L200 220 Z" fill="var(--ifm-color-primary)" opacity="0.4" />
            <path d="M200 160 L60 120 L60 140 L200 220 Z" fill="var(--ifm-color-primary)" opacity="0.45" />
            {/* Code symbol </> */}
            <text x="200" y="175" textAnchor="middle" fontSize="24" fontWeight="bold" fontFamily="monospace" fill="var(--ifm-color-primary)" opacity="0.6">&lt;/&gt;</text>
          </g>
          {/* Top plate */}
          <g className={styles.plate1}>
            <path d="M200 140 L340 60 L200 100 L60 60 Z" fill="var(--ifm-color-primary)" opacity="0.8" />
            <path d="M200 100 L340 60 L340 80 L200 160 Z" fill="var(--ifm-color-primary)" opacity="0.7" />
            <path d="M200 100 L60 60 L60 80 L200 160 Z" fill="var(--ifm-color-primary)" opacity="0.75" />
            {/* Code symbol </> */}
            <text x="200" y="115" textAnchor="middle" fontSize="28" fontWeight="bold" fontFamily="monospace" fill="white">&lt;/&gt;</text>
          </g>
        </g>
      </svg>
      <p className={styles.placeholder}>Animated SVG coming soon</p>
    </div>
  );
}

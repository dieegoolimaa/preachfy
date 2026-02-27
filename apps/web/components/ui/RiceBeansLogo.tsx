import React from 'react';

export const RiceBeansLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Bible (Back) */}
    <g stroke="#1d1d1f">
      {/* Bible Cover Outline */}
      <path 
        d="M 21,38 L 26,16 C 35,12 45,20 50,22 C 55,20 65,12 74,16 L 79,38 Z" 
        fill="#b08d57" 
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Bible Pages */}
      <path 
        d="M 24,37 L 28,18 C 35,15 45,22 50,24 C 55,22 65,15 72,18 L 76,37 C 68,34 56,38 50,42 C 44,38 32,34 24,37 Z" 
        fill="#fdfdfb" 
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Bible Center Fold */}
      <line x1="50" y1="24" x2="50" y2="42" strokeWidth="2" strokeLinecap="round" />
      {/* Bible Pages Lines (Left) */}
      <path d="M 30,24 C 34,23 42,25 48,27 M 29,27 C 34,26 42,28 48,30 M 28,30 C 34,29 42,31 48,33 M 27,33 C 34,32 42,34 48,36" stroke="#b08d57" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
      {/* Bible Pages Lines (Right) */}
      <path d="M 70,24 C 66,23 58,25 52,27 M 71,27 C 66,26 58,28 52,30 M 72,30 C 66,29 58,31 52,33 M 73,33 C 66,32 58,34 52,36" stroke="#b08d57" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
    </g>

    {/* Bowl Bottom */}
    <path 
      d="M 6,50 C 6,80 25,92 50,92 C 75,92 94,80 94,50 Z" 
      fill="#cd9e6b" 
      stroke="#1d1d1f"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    
    {/* Bowl Wood Details (Curves) */}
    <path 
      d="M 12,60 C 25,75 75,75 88,60 M 18,70 C 30,82 70,82 82,70 M 30,82 C 40,88 60,88 70,82" 
      stroke="#1d1d1f" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      fill="none" 
      opacity="0.2"
    />

    {/* Bowl base ring */}
    <path 
      d="M 33,92 L 33,96 C 33,99 67,99 67,96 L 67,92" 
      fill="#cd9e6b" 
      stroke="#1d1d1f"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* The Surface (Ellipse) -> Rice Side (Left) */}
    <path 
      d="M 6,50 C 6,38 25,31 50,31 C 75,31 94,38 94,50 C 94,62 75,69 50,69 C 25,69 6,62 6,50 Z" 
      fill="#fdfdfb"
      stroke="#1d1d1f"
      strokeWidth="2.5"
    />
    
    {/* Rice Grains (Texture) */}
    <g fill="#e5e2d9" stroke="#b08d57" strokeWidth="0.5">
      <ellipse cx="20" cy="45" rx="3.5" ry="1.5" transform="rotate(30 20 45)" />
      <ellipse cx="30" cy="40" rx="3.5" ry="1.5" transform="rotate(60 30 40)" />
      <ellipse cx="35" cy="55" rx="3.5" ry="1.5" transform="rotate(-20 35 55)" />
      <ellipse cx="25" cy="50" rx="3.5" ry="1.5" transform="rotate(10 25 50)" />
      <ellipse cx="15" cy="52" rx="3.5" ry="1.5" transform="rotate(-40 15 52)" />
      <ellipse cx="40" cy="48" rx="3.5" ry="1.5" transform="rotate(45 40 48)" />
      <ellipse cx="42" cy="38" rx="3.5" ry="1.5" transform="rotate(-15 42 38)" />
      <ellipse cx="28" cy="60" rx="3.5" ry="1.5" transform="rotate(25 28 60)" />
      <ellipse cx="18" cy="58" rx="3.5" ry="1.5" transform="rotate(80 18 58)" />
      <ellipse cx="45" cy="56" rx="3.5" ry="1.5" transform="rotate(-60 45 56)" />
    </g>

    {/* Right side (Beans) with Yin-Yang S-curve */}
    <path 
      d="M 50,31 C 70,35 25,65 50,69 C 75,69 94,62 94,50 C 94,38 75,31 50,31 Z" 
      fill="#722f27" 
    />
    
    {/* Beans (Texture) - Small reddish/dark outlines */}
    <g fill="#5a231d">
      <ellipse cx="60" cy="40" rx="4" ry="2.5" transform="rotate(-20 60 40)" />
      <ellipse cx="75" cy="45" rx="4" ry="2.5" transform="rotate(40 75 45)" />
      <ellipse cx="65" cy="55" rx="4" ry="2.5" transform="rotate(10 65 55)" />
      <ellipse cx="80" cy="52" rx="4" ry="2.5" transform="rotate(-30 80 52)" />
      <ellipse cx="55" cy="48" rx="4" ry="2.5" transform="rotate(70 55 48)" />
      <ellipse cx="70" cy="60" rx="4" ry="2.5" transform="rotate(-10 70 60)" />
      <ellipse cx="85" cy="45" rx="4" ry="2.5" transform="rotate(20 85 45)" />
      <ellipse cx="65" cy="48" rx="4" ry="2.5" transform="rotate(50 65 48)" />
      <ellipse cx="85" cy="56" rx="4" ry="2.5" transform="rotate(-40 85 56)" />
      <ellipse cx="54" cy="58" rx="4" ry="2.5" transform="rotate(15 54 58)" />
    </g>

    {/* Bean Highlights */}
    <g fill="#fdfdfb" opacity="0.6">
      <circle cx="59" cy="39" r="0.8" />
      <circle cx="74" cy="44" r="0.8" />
      <circle cx="64" cy="54" r="0.8" />
      <circle cx="79" cy="51" r="0.8" />
      <circle cx="54" cy="47" r="0.8" />
      <circle cx="69" cy="59" r="0.8" />
      <circle cx="84" cy="44" r="0.8" />
      <circle cx="64" cy="47" r="0.8" />
      <circle cx="84" cy="55" r="0.8" />
      <circle cx="53" cy="57" r="0.8" />
    </g>

    {/* S-curve Stroke and Re-stroke Ellipse */}
    <path 
      d="M 50,31 C 70,35 25,65 50,69" 
      fill="none" 
      stroke="#1d1d1f"
      strokeWidth="2.5"
    />
    <path 
      d="M 6,50 C 6,38 25,31 50,31 C 75,31 94,38 94,50 C 94,62 75,69 50,69 C 25,69 6,62 6,50 Z" 
      fill="none" 
      stroke="#1d1d1f"
      strokeWidth="2.5"
      pointerEvents="none"
    />

    {/* Center Cross (Foreground) */}
    <g stroke="#1d1d1f" strokeWidth="2.5" strokeLinejoin="round">
      <rect x="44" y="20" width="12" height="42" fill="#d2a679" rx="1" />
      <rect x="31" y="32" width="38" height="12" fill="#d2a679" rx="1" />
      {/* Remove inner intersection lines using a borderless overlay block */}
      <rect x="45.5" y="33.5" width="9" height="9" fill="#d2a679" stroke="none" />
      {/* Wood texture lines on cross */}
      <path d="M 47,22 L 47,60 M 53,22 L 53,60 M 33,35 L 43,35 M 57,35 L 67,35 M 33,41 L 43,41 M 57,41 L 67,41" stroke="#b08d57" strokeWidth="1" strokeLinecap="round" opacity="0.6" fill="none"/>
    </g>
  </svg>
)

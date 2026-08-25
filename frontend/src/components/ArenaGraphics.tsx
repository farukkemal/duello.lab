// Vector game illustrations matching Brawl Stars / Clash Royale aesthetic

export function CrossedSwordsGraphic() {
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center my-1">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-violet-600/20 rounded-full blur-xl animate-pulse pointer-events-none" />
      
      <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_8px_16px_rgba(139,92,246,0.5)]">
        <defs>
          <linearGradient id="bladeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="40%" stop-color="#e0e7ff" />
            <stop offset="70%" stop-color="#818cf8" />
            <stop offset="100%" stop-color="#4338ca" />
          </linearGradient>
          <linearGradient id="bladeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="40%" stop-color="#c7d2fe" />
            <stop offset="70%" stop-color="#6366f1" />
            <stop offset="100%" stop-color="#3730a3" />
          </linearGradient>
          <linearGradient id="goldHilt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="50%" stop-color="#eab308" />
            <stop offset="100%" stop-color="#854d0e" />
          </linearGradient>
          <linearGradient id="shieldAura" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#312e81" stop-opacity="0.1" />
          </linearGradient>
        </defs>

        {/* Backdrop Hex Shield Lines */}
        <polygon
          points="80,15 135,45 135,115 80,145 25,115 25,45"
          fill="url(#shieldAura)"
          stroke="#818cf8"
          stroke-width="2"
          stroke-dasharray="4 2"
          opacity="0.6"
        />

        {/* SWORD 1: Top-Left to Bottom-Right */}
        <g transform="rotate(-45 80 80)">
          {/* Blade */}
          <path d="M76 20 L84 20 L84 100 L76 100 Z" fill="url(#bladeGrad1)" />
          {/* Tip */}
          <polygon points="76,20 80,8 84,20" fill="#ffffff" />
          {/* Center Groove */}
          <line x1="80" y1="18" x2="80" y2="95" stroke="#312e81" stroke-width="1.5" />
          {/* Crossguard */}
          <rect x="62" y="98" width="36" height="8" rx="3" fill="url(#goldHilt)" stroke="#713f12" stroke-width="1" />
          <circle cx="80" cy="102" r="3.5" fill="#ec4899" />
          {/* Grip */}
          <rect x="76" y="106" width="8" height="22" rx="2" fill="#78350f" stroke="#451a03" stroke-width="1" />
          <line x1="76" y1="112" x2="84" y2="112" stroke="#b45309" stroke-width="1" />
          <line x1="76" y1="118" x2="84" y2="118" stroke="#b45309" stroke-width="1" />
          <line x1="76" y1="124" x2="84" y2="124" stroke="#b45309" stroke-width="1" />
          {/* Pommel */}
          <circle cx="80" cy="133" r="6.5" fill="url(#goldHilt)" stroke="#713f12" stroke-width="1" />
          <circle cx="80" cy="133" r="2.5" fill="#3b82f6" />
        </g>

        {/* SWORD 2: Top-Right to Bottom-Left */}
        <g transform="rotate(45 80 80)">
          {/* Blade */}
          <path d="M76 20 L84 20 L84 100 L76 100 Z" fill="url(#bladeGrad2)" />
          {/* Tip */}
          <polygon points="76,20 80,8 84,20" fill="#ffffff" />
          {/* Center Groove */}
          <line x1="80" y1="18" x2="80" y2="95" stroke="#312e81" stroke-width="1.5" />
          {/* Crossguard */}
          <rect x="62" y="98" width="36" height="8" rx="3" fill="url(#goldHilt)" stroke="#713f12" stroke-width="1" />
          <circle cx="80" cy="102" r="3.5" fill="#3b82f6" />
          {/* Grip */}
          <rect x="76" y="106" width="8" height="22" rx="2" fill="#78350f" stroke="#451a03" stroke-width="1" />
          <line x1="76" y1="112" x2="84" y2="112" stroke="#b45309" stroke-width="1" />
          <line x1="76" y1="118" x2="84" y2="118" stroke="#b45309" stroke-width="1" />
          <line x1="76" y1="124" x2="84" y2="124" stroke="#b45309" stroke-width="1" />
          {/* Pommel */}
          <circle cx="80" cy="133" r="6.5" fill="url(#goldHilt)" stroke="#713f12" stroke-width="1" />
          <circle cx="80" cy="133" r="2.5" fill="#ec4899" />
        </g>

        {/* Center Clash Light Burst */}
        <circle cx="80" cy="80" r="10" fill="#ffffff" opacity="0.9" />
        <circle cx="80" cy="80" r="18" fill="#a78bfa" opacity="0.5" />
      </svg>
    </div>
  );
}

export function HourglassBombGraphic() {
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center my-1">
      {/* Background Fiery Glow */}
      <div className="absolute inset-0 bg-rose-600/25 rounded-full blur-xl animate-pulse pointer-events-none" />
      
      <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_8px_16px_rgba(244,63,94,0.5)]">
        <defs>
          <linearGradient id="fireSand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24" />
            <stop offset="60%" stop-color="#f97316" />
            <stop offset="100%" stop-color="#ef4444" />
          </linearGradient>
          <linearGradient id="glassFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fed7aa" />
            <stop offset="50%" stop-color="#b45309" />
            <stop offset="100%" stop-color="#78350f" />
          </linearGradient>
        </defs>

        {/* Background Clock Dial */}
        <circle cx="80" cy="80" r="58" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="6 3" opacity="0.4" />
        <line x1="80" y1="28" x2="80" y2="36" stroke="#f43f5e" stroke-width="3" />
        <line x1="80" y1="124" x2="80" y2="132" stroke="#f43f5e" stroke-width="3" />
        <line x1="28" y1="80" x2="36" y2="80" stroke="#f43f5e" stroke-width="3" />
        <line x1="124" y1="80" x2="132" y2="80" stroke="#f43f5e" stroke-width="3" />

        {/* Top/Bottom Wooden Plates */}
        <rect x="42" y="24" width="76" height="10" rx="4" fill="url(#glassFrame)" stroke="#451a03" stroke-width="1.5" />
        <rect x="42" y="126" width="76" height="10" rx="4" fill="url(#glassFrame)" stroke="#451a03" stroke-width="1.5" />

        {/* Pillars */}
        <rect x="45" y="34" width="6" height="92" rx="2" fill="url(#glassFrame)" />
        <rect x="109" y="34" width="6" height="92" rx="2" fill="url(#glassFrame)" />

        {/* Hourglass Glass Shell */}
        <path
          d="M54 34 L106 34 C106 65 88 76 82 80 C88 84 106 95 106 126 L54 126 C54 95 72 84 78 80 C72 76 54 65 54 34 Z"
          fill="#1e1b4b"
          fill-opacity="0.6"
          stroke="#ffffff"
          stroke-width="2.5"
        />

        {/* Glowing Fire Sand Inside */}
        {/* Top Bulb Sand */}
        <path d="M58 46 L102 46 C98 62 88 72 80 76 C72 72 62 62 58 46 Z" fill="url(#fireSand)" />
        {/* Trickling Stream */}
        <line x1="80" y1="76" x2="80" y2="108" stroke="#fef08a" stroke-width="3" stroke-linecap="round" />
        {/* Bottom Bulb Sand Mound */}
        <path d="M60 124 C62 108 72 104 80 104 C88 104 98 108 100 124 Z" fill="url(#fireSand)" />

        {/* Burning Fuse / Spark at Top Right */}
        <path d="M106 34 Q122 22 130 14" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" />
        {/* Spark Blast */}
        <circle cx="130" cy="14" r="5" fill="#fef08a" />
        <polygon points="130,4 133,12 141,14 133,16 130,24 127,16 119,14 127,12" fill="#ef4444" />
      </svg>
    </div>
  );
}

export function ClashCrownsGraphic() {
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center my-1">
      {/* Background Cyan Glow */}
      <div className="absolute inset-0 bg-cyan-600/20 rounded-full blur-xl animate-pulse pointer-events-none" />
      
      <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_8px_16px_rgba(6,182,212,0.45)]">
        <defs>
          <linearGradient id="redCrown" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24" />
            <stop offset="50%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#dc2626" />
          </linearGradient>
          <linearGradient id="blueCrown" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#2563eb" />
            <stop offset="100%" stop-color="#1e3a8a" />
          </linearGradient>
        </defs>

        {/* Crossed Swords in Background */}
        <g stroke="#94a3b8" stroke-width="3" stroke-linecap="round">
          <line x1="30" y1="130" x2="130" y2="30" />
          <line x1="30" y1="30" x2="130" y2="130" />
        </g>
        <circle cx="80" cy="80" r="48" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4" opacity="0.4" />

        {/* LEFT CROWN: Red/Gold */}
        <g transform="translate(18, 48) rotate(-14 40 40)">
          <polygon
            points="10,48 10,18 24,32 38,10 52,32 66,18 66,48"
            fill="url(#redCrown)"
            stroke="#b45309"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <rect x="10" y="44" width="56" height="8" rx="2" fill="#78350f" stroke="#b45309" stroke-width="1" />
          <circle cx="38" cy="24" r="3.5" fill="#ef4444" stroke="#ffffff" stroke-width="1" />
          <circle cx="24" cy="48" r="2.5" fill="#fef08a" />
          <circle cx="52" cy="48" r="2.5" fill="#fef08a" />
        </g>

        {/* RIGHT CROWN: Blue/Cyan */}
        <g transform="translate(74, 48) rotate(14 40 40)">
          <polygon
            points="10,48 10,18 24,32 38,10 52,32 66,18 66,48"
            fill="url(#blueCrown)"
            stroke="#1d4ed8"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <rect x="10" y="44" width="56" height="8" rx="2" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1" />
          <circle cx="38" cy="24" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1" />
          <circle cx="24" cy="48" r="2.5" fill="#67e8f9" />
          <circle cx="52" cy="48" r="2.5" fill="#67e8f9" />
        </g>

        {/* Center Clash Spark */}
        <circle cx="80" cy="74" r="7" fill="#ffffff" />
        <circle cx="80" cy="74" r="14" fill="#38bdf8" opacity="0.6" />
      </svg>
    </div>
  );
}

export function RobotMascotGraphic() {
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center my-1">
      {/* Background Emerald Glow */}
      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse pointer-events-none" />
      
      <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_8px_16px_rgba(16,185,129,0.45)]">
        <defs>
          <linearGradient id="robotHead" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="60%" stop-color="#e2e8f0" />
            <stop offset="100%" stop-color="#94a3b8" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e293b" />
          </linearGradient>
          <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ec4899" />
            <stop offset="100%" stop-color="#f43f5e" />
          </linearGradient>
        </defs>

        {/* Antennas / Ears */}
        {/* Left Ear */}
        <rect x="22" y="66" width="10" height="28" rx="5" fill="url(#earGrad)" stroke="#881337" stroke-width="1.5" />
        <line x1="27" y1="46" x2="27" y2="66" stroke="#94a3b8" stroke-width="3" />
        <circle cx="27" cy="44" r="5.5" fill="#f43f5e" />
        
        {/* Right Ear */}
        <rect x="128" y="66" width="10" height="28" rx="5" fill="url(#earGrad)" stroke="#881337" stroke-width="1.5" />
        <line x1="133" y1="46" x2="133" y2="66" stroke="#94a3b8" stroke-width="3" />
        <circle cx="133" cy="44" r="5.5" fill="#f43f5e" />

        {/* Top Antenna Cap */}
        <rect x="75" y="24" width="10" height="8" rx="3" fill="#f59e0b" stroke="#78350f" stroke-width="1" />
        <line x1="80" y1="24" x2="80" y2="14" stroke="#94a3b8" stroke-width="3" />
        <circle cx="80" cy="12" r="5" fill="#38bdf8" />

        {/* Robot Head Body */}
        <rect x="30" y="32" width="100" height="96" rx="28" fill="url(#robotHead)" stroke="#cbd5e1" stroke-width="3" />

        {/* Visor Screen */}
        <rect x="42" y="52" width="76" height="46" rx="14" fill="url(#visorGrad)" stroke="#0f172a" stroke-width="2" />

        {/* Glowing Eyes */}
        <rect x="52" y="62" width="18" height="18" rx="5" fill="#38bdf8" className="animate-pulse" />
        <rect x="90" y="62" width="18" height="18" rx="5" fill="#38bdf8" className="animate-pulse" />
        
        {/* Cute Smile / Mouth Line */}
        <path d="M68 85 Q80 92 92 85" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />

        {/* Cheek Blushes */}
        <circle cx="48" cy="84" r="3.5" fill="#ec4899" opacity="0.8" />
        <circle cx="112" cy="84" r="3.5" fill="#ec4899" opacity="0.8" />
      </svg>
    </div>
  );
}

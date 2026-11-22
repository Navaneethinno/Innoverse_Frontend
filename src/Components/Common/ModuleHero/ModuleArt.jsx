import { motion } from "motion/react";

// Module pictures for the dashboards' banners: small animated scenes, one
// per module (index.css: .mh-*; still for users who ask for reduced motion).
const P = "var(--primary)";

export function WalletArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <g key={i} className="mh-coin" style={{ animationDelay: `${i * 0.7}s` }}>
          <circle cx={36 + i * 12} cy="10" r="7" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
          <text x={36 + i * 12} y="13.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#92400e">$</text>
        </g>
      ))}
      <rect x="10" y="30" width="76" height="48" rx="10" fill={P} />
      <rect x="10" y="30" width="76" height="12" rx="6" fill="#000" opacity="0.12" />
      <rect x="58" y="46" width="30" height="18" rx="6" fill="#fff" opacity="0.9" />
      <circle cx="67" cy="55" r="3.5" fill={P} />
    </svg>
  );
}

export function StoreArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      <rect x="10" y="30" width="62" height="46" rx="4" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${10 + i * 15.5} 18 h15.5 v12 a7.75 7.75 0 0 1 -15.5 0z`} fill={i % 2 ? "#fff" : P} stroke={P} strokeWidth="1.5" />
      ))}
      <rect x="20" y="48" width="16" height="28" rx="2" fill={P} opacity="0.25" />
      <rect x="44" y="44" width="20" height="14" rx="2" fill={P} opacity="0.15" />
      <g className="mh-float">
        <rect x="70" y="40" width="20" height="32" rx="4" fill="#1e293b" />
        <rect x="73" y="44" width="14" height="9" rx="1.5" fill="#22c55e" className="mh-blink" />
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={73.5 + c * 4.6} y={56 + r * 4.6} width="3.4" height="3" rx="0.8" fill="#64748b" />))}
      </g>
    </svg>
  );
}

export function ShieldArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      <defs>
        <clipPath id="mhShield">
          <path d="M48 6 L80 18 V40 C80 60 66 72 48 80 C30 72 16 60 16 40 V18 Z" />
        </clipPath>
      </defs>
      <path d="M48 6 L80 18 V40 C80 60 66 72 48 80 C30 72 16 60 16 40 V18 Z" fill={P} />
      <g clipPath="url(#mhShield)">
        <rect className="mh-scan" x="10" y="0" width="76" height="10" fill="#fff" opacity="0.45" />
      </g>
      <path d="M36 42 l8 8 l16 -18" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GearsArt() {
  const gear = (cx, cy, r, teeth) => {
    const pts = [];
    for (let i = 0; i < teeth * 2; i++) {
      const a = (Math.PI * i) / teeth;
      const rr = i % 2 ? r : r * 1.25;
      pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
    }
    return pts.join(" ");
  };
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      <g className="mh-spin" style={{ transformOrigin: "38px 44px" }}>
        <polygon points={gear(38, 44, 20, 10)} fill={P} />
        <circle cx="38" cy="44" r="7" fill="var(--card)" />
      </g>
      <g className="mh-spin-rev" style={{ transformOrigin: "70px 26px" }}>
        <polygon points={gear(70, 26, 12, 8)} fill={P} opacity="0.6" />
        <circle cx="70" cy="26" r="4.5" fill="var(--card)" />
      </g>
    </svg>
  );
}

export function InboxArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect key={i} className="mh-paper" style={{ animationDelay: `${i * 0.9}s` }} x={32 + i * 3} y="8" width="30" height="36" rx="3" fill="#fff" stroke="var(--border)" strokeWidth="1.5" />
      ))}
      <path d="M12 46 L24 30 H72 L84 46 V72 a6 6 0 0 1 -6 6 H18 a6 6 0 0 1 -6 -6z" fill={P} />
      <path d="M12 46 H34 a14 8 0 0 0 28 0 H84" fill="none" stroke="#fff" strokeWidth="3" opacity="0.6" />
    </svg>
  );
}

export function BankArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      <path d="M48 6 L86 26 H10 Z" fill={P} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={16 + i * 14} y="30" width="8" height="36" rx="2" fill={P} opacity={0.35 + i * 0.1} />
      ))}
      <rect x="8" y="68" width="80" height="10" rx="3" fill={P} />
      <g className="mh-float">
        <circle cx="48" cy="18" r="5" fill="#fbbf24" />
      </g>
    </svg>
  );
}

export function LedgerArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      <rect x="16" y="10" width="56" height="68" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.rect key={i} x="24" y={22 + i * 11} height="5" rx="2.5" fill={P} opacity={0.7 - i * 0.1} initial={{ width: 0 }} animate={{ width: 40 - (i % 3) * 9 }} transition={{ delay: i * 0.05, duration: 0.35 }} />
      ))}
      <g className="mh-float">
        <circle cx="74" cy="62" r="14" fill={P} />
        <path d="M68 62 l4 4 l8 -9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function PeopleArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      {[
        [30, 0.55],
        [66, 0.55],
        [48, 1],
      ].map(([x, o], i) => (
        <g key={i} opacity={o} className={i === 2 ? "mh-float" : undefined}>
          <circle cx={x} cy={i === 2 ? 30 : 36} r={i === 2 ? 12 : 9} fill={P} />
          <path d={`M${x - (i === 2 ? 20 : 15)} ${i === 2 ? 76 : 74} a${i === 2 ? 20 : 15} ${i === 2 ? 20 : 15} 0 0 1 ${i === 2 ? 40 : 30} 0z`} fill={P} />
        </g>
      ))}
    </svg>
  );
}

export function ChartArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      <rect x="12" y="10" width="72" height="66" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      {[18, 32, 24, 44, 36].map((h, i) => (
        <motion.rect key={i} x={22 + i * 12} width="8" rx="2" fill={P} opacity={0.5 + i * 0.1} initial={{ height: 0, y: 66 }} animate={{ height: h, y: 66 - h }} transition={{ delay: i * 0.05, duration: 0.35 }} />
      ))}
    </svg>
  );
}

export function CardsArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      {[-14, 0, 14].map((rot, i) => (
        <g key={rot} transform={`rotate(${rot} 48 60)`} className={i === 2 ? "mh-float" : undefined}>
          <rect x="18" y="24" width="60" height="38" rx="6" fill={P} opacity={0.45 + i * 0.27} />
          <rect x="24" y="32" width="10" height="8" rx="2" fill="#fbbf24" />
          <rect x="24" y="50" width="30" height="3" rx="1.5" fill="#fff" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

export function VaultArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true">
      <rect x="12" y="10" width="72" height="66" rx="8" fill={P} />
      <circle cx="48" cy="43" r="20" fill="#fff" opacity="0.92" />
      <g className="mh-spin-slow" style={{ transformOrigin: "48px 43px" }}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect key={a} x="46.5" y="26" width="3" height="10" rx="1.5" fill={P} transform={`rotate(${a} 48 43)`} />
        ))}
        <circle cx="48" cy="43" r="5" fill={P} />
      </g>
    </svg>
  );
}

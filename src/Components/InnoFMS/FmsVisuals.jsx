import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/Utils/Lib/utils";

// InnoFMS visuals (fuel tanks, pumps, drops): pictures that carry a number,
// so a fuel screen reads at a glance. Every animation is gentle and stops for
// users who ask for reduced motion (index.css: .fms-*).

// The fuel's colour by how full a limit is: green, then amber, then red.
export const levelColour = (level) => (level >= 0.9 ? "#ef4444" : level >= 0.7 ? "#f59e0b" : "#10b981");

// A tank, filled to `level` (0–1) with a slowly moving wave and rising bubbles.
// `colour` the fuel; `label` / `caption` under it; `children` inside (a number).
export function FuelTank({ level = 0, colour = "var(--primary)", size = 96, label, caption, children, className, title }) {
  const id = useId().replace(/:/g, "");
  const lv = Math.max(0, Math.min(1, Number(level) || 0));
  const w = size;
  const h = Math.round(size * 1.25);
  // The fuel's top, inside the tank's body (y from 14 to h-6).
  const top = 14;
  const bottom = h - 6;
  const surface = bottom - (bottom - top) * lv;
  // Waves drawn at y 0; the group moves them to the fuel's surface.
  const wave = (y, amp) => `M0 ${y} Q ${w / 4} ${y - amp} ${w / 2} ${y} T ${w} ${y} T ${w * 1.5} ${y} T ${w * 2} ${y} V ${h * 2} H 0 Z`;
  return (
    <figure className={cn("inline-flex flex-col items-center", className)} title={title}>
      <div className="relative" style={{ width: w, height: h }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          <defs>
            <clipPath id={`tank${id}`}>
              <rect x="4" y="10" width={w - 8} height={h - 14} rx={w * 0.22} />
            </clipPath>
            <linearGradient id={`glass${id}`} x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="0.35" stopColor="#fff" stopOpacity="0.08" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          {/* cap */}
          <rect x={w / 2 - 10} y="2" width="20" height="10" rx="3" fill="var(--border)" />
          {/* body */}
          <rect x="4" y="10" width={w - 8} height={h - 14} rx={w * 0.22} fill="var(--muted)" stroke="var(--border)" strokeWidth="2" />
          <g clipPath={`url(#tank${id})`}>
            <motion.g initial={{ y: bottom }} animate={{ y: surface }} transition={{ duration: 0.55, ease: "easeOut" }}>
              <path className="fms-wave-slow" d={wave(0, 5)} fill={colour} opacity="0.35" />
              <path className="fms-wave" d={wave(3, 4)} fill={colour} opacity="0.9" />
            </motion.g>
            {lv > 0.05 &&
              [0.3, 0.55, 0.75].map((x, i) => <circle key={i} className="fms-bubble" style={{ animationDelay: `${i * 1.1}s` }} cx={w * x} cy={bottom - 4} r={2 + (i % 2)} fill="#fff" opacity="0.6" />)}
            <rect x="4" y="10" width={w - 8} height={h - 14} fill={`url(#glass${id})`} />
          </g>
          {/* level marks */}
          {[0.25, 0.5, 0.75].map((m) => (
            <line key={m} x1={w - 14} x2={w - 6} y1={bottom - (bottom - top) * m} y2={bottom - (bottom - top) * m} stroke="var(--muted-foreground)" strokeOpacity="0.35" strokeWidth="1.5" />
          ))}
        </svg>
        {children != null && <div className="absolute inset-x-0 flex justify-center text-center" style={{ top: h * 0.38 }}>{children}</div>}
      </div>
      {label && <figcaption className="mt-1.5 text-center text-xs font-bold text-foreground">{label}</figcaption>}
      {caption && <p className="text-center text-[11px] text-muted-foreground">{caption}</p>}
    </figure>
  );
}

// A fuel pump; `flowing` shows drops falling from the nozzle (a recent sale).
export function FuelPump({ size = 72, flowing = false, colour = "var(--primary)", className }) {
  const s = size / 72;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className={className} aria-hidden="true">
      <rect x="10" y="10" width="30" height="52" rx="6" fill={colour} />
      <rect x="15" y="16" width="20" height="14" rx="3" fill="#fff" opacity="0.9" />
      <rect x="18" y="20" width="14" height="2.5" rx="1" fill={colour} opacity="0.5" />
      <rect x="18" y="24.5" width="9" height="2.5" rx="1" fill={colour} opacity="0.35" />
      <rect x="6" y="60" width="38" height="6" rx="3" fill="var(--border)" />
      <path d="M40 22 h8 a6 6 0 0 1 6 6 v18 a4 4 0 0 0 8 0 v-16" fill="none" stroke={colour} strokeWidth="4" strokeLinecap="round" />
      <rect x="56" y="22" width="10" height="9" rx="2" fill={colour} />
      <circle cx="25" cy="44" r="5" fill="#fff" opacity="0.25" />
      {flowing &&
        [0, 1, 2].map((i) => (
          <path key={i} className="fms-drop" style={{ animationDelay: `${i * 0.35}s`, transformOrigin: `${61 * s}px ${34 * s}px` }} d="M61 33 c-2 3 -3 4.5 -3 6 a3 3 0 0 0 6 0 c0 -1.5 -1 -3 -3 -6z" fill={colour} />
        ))}
    </svg>
  );
}

// A drop of a product's colour (POS button colour).
export function FuelDrop({ colour, size = 16, title }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 16 20" aria-label={title} role="img">
      <path d="M8 1 C5 6 2 9 2 13 a6 6 0 0 0 12 0 C14 9 11 6 8 1z" fill={colour || "var(--muted)"} stroke="var(--border)" strokeWidth="1" />
      <ellipse cx="5.6" cy="12.5" rx="1.4" ry="2.2" fill="#fff" opacity="0.45" />
    </svg>
  );
}

// A page's picture band: a pump on a forecourt, a title, a line and facts.
export function ForecourtBanner({ title, text, facts = [], flowing = true, children }) {
  return (
    <div className="relative mb-5 min-h-[8.5rem] overflow-hidden rounded-3xl border border-border p-5" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--primary) 14%, var(--card)), var(--card) 60%)" }}>
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-20" style={{ background: "var(--primary)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-3 opacity-30" style={{ background: "repeating-linear-gradient(90deg, var(--muted-foreground) 0 24px, transparent 24px 48px)" }} />
      <div className="relative flex flex-wrap items-center gap-5">
        <div className="fms-float shrink-0">
          <FuelPump size={84} flowing={flowing} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black tracking-tight text-foreground">{title}</h2>
          {text && <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{text}</p>}
          {facts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {facts.map(([k, v]) => (
                <span key={k} className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs">
                  <span className="text-muted-foreground">{k}</span> <span className="font-bold text-foreground">{v}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

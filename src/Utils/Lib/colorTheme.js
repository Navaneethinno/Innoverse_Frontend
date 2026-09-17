// Derives the small brand-color shade set (hover/light/foreground) that the
// rest of the app already expects as CSS custom properties (see theme.css)
// from just the two colors a tenant/login response is expected to supply:
// primary_color and secondary_color. Keeping the derivation here means the
// backend only ever owns two raw hex values — never a full palette — the
// same "one source value, frontend derives shades" shape this project
// already uses for light/dark (see ColorModeProvider.jsx).

function normalizeHex(hex) {
  if (typeof hex !== "string") return null;
  const value = hex.trim();
  const match = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.exec(value);
  if (!match) return null;
  const raw = match[1];
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  return `#${full.toLowerCase()}`;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const int = parseInt(normalized.slice(1), 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

// Mixes `hex` toward white (ratio > 0) or black (ratio < 0). Same idea as
// Sass's darken()/lighten() but dependency-free.
function mix(hex, ratio) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = ratio >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const amount = Math.abs(ratio);
  return rgbToHex({
    r: rgb.r + (target.r - rgb.r) * amount,
    g: rgb.g + (target.g - rgb.g) * amount,
    b: rgb.b + (target.b - rgb.b) * amount,
  });
}

// WCAG-style relative luminance, used only to pick a legible black/white
// foreground for an arbitrary brand color — not full contrast compliance.
function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function bestForeground(hex) {
  return luminance(hex) > 0.5 ? "#0b1220" : "#ffffff";
}

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// Produces the full set of CSS custom properties this app's theme.css
// defines for primary/secondary in a given mode, keyed exactly as they
// appear in :root / .dark so callers can setProperty() them directly.
// Any input that isn't a valid hex is dropped from the result, so a partial
// or malformed API response only overrides the tokens it actually supplies
// and leaves theme.css's fallback values in place for the rest.
export function deriveBrandThemeVars({ primary, secondary }, mode = "light") {
  const vars = {};
  const primaryHex = normalizeHex(primary);
  const secondaryHex = normalizeHex(secondary);
  const isDark = mode === "dark";

  if (primaryHex) {
    vars["--primary"] = primaryHex;
    // Dark mode wants a lightened primary for contrast against dark
    // surfaces (mirrors theme.css's own light vs dark primary values);
    // light mode wants a darkened one for the hover state.
    vars["--primary-hover"] = isDark ? mix(primaryHex, 0.2) : mix(primaryHex, -0.15);
    vars["--primary-light"] = isDark ? mix(primaryHex, -0.75) : mix(primaryHex, 0.9);
    vars["--primary-foreground"] = bestForeground(primaryHex);
    vars["--ring"] = primaryHex;
    vars["--sidebar-primary"] = primaryHex;
    vars["--sidebar-primary-foreground"] = bestForeground(primaryHex);
    vars["--accent-foreground"] = primaryHex;
    vars["--chart-1"] = primaryHex;
    vars["--gradient-start"] = primaryHex;
    vars["--gradient-end"] = primaryHex;
    const glassTint = hexToRgba(primaryHex, isDark ? 0.22 : 0.16);
    if (glassTint) {
      vars["--glass-gradient"] =
        `linear-gradient(135deg, ${glassTint} 0%, ${hexToRgba(secondaryHex ?? primaryHex, 0.08) ?? glassTint} 50%, rgba(255, 255, 255, 0) 100%)`;
    }
  }

  if (secondaryHex) {
    vars["--secondary"] = secondaryHex;
    vars["--secondary-foreground"] = bestForeground(secondaryHex);
    vars["--chart-4"] = secondaryHex;
  }

  return vars;
}

export function isValidHexColor(value) {
  return normalizeHex(value) !== null;
}

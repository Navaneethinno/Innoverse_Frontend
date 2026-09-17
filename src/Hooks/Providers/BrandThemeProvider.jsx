import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { deriveBrandThemeVars } from "@/Utils/Lib/colorTheme";

const STORAGE_KEY = "innoverse-brand-theme";
const BrandThemeContext = createContext(null);

function readStoredColors() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Clears every custom property this provider may have set, letting
// theme.css's :root/.dark fallback values take back over untouched — this
// is the "no tenant colors yet / logged out" state, not a second palette.
function clearBrandVars() {
  const root = document.documentElement;
  const tokens = [
    "--primary",
    "--primary-hover",
    "--primary-light",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--ring",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--accent-foreground",
    "--chart-1",
    "--chart-4",
    "--gradient-start",
    "--gradient-end",
    "--glass-gradient",
  ];
  tokens.forEach((token) => root.style.removeProperty(token));
}

function applyBrandVars(colors, mode) {
  const root = document.documentElement;
  clearBrandVars();
  if (!colors) return;
  const vars = deriveBrandThemeVars(colors, mode);
  Object.entries(vars).forEach(([token, value]) => root.style.setProperty(token, value));
}

// Applies a tenant's primary/secondary brand colors (from the login
// response) as inline CSS custom properties on <html>, which take
// precedence over theme.css's :root/.dark rules without touching those
// rules at all — so every existing component that already reads
// var(--primary) etc. themes correctly with zero changes, and any tenant
// with no colors configured (or before login resolves) transparently falls
// back to the current fixed light/dark palette in theme.css.
export function BrandThemeProvider({ children }) {
  const { mode } = useColorMode();
  const [colors, setColors] = useState(readStoredColors);

  useEffect(() => {
    applyBrandVars(colors, mode);
  }, [colors, mode]);

  const setBrandTheme = useCallback((nextColors) => {
    setColors(nextColors ?? null);
    try {
      if (nextColors) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextColors));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage failures should not prevent the in-memory theme from updating.
    }
  }, []);

  const clearBrandTheme = useCallback(() => setBrandTheme(null), [setBrandTheme]);

  const value = useMemo(
    () => ({ colors, setBrandTheme, clearBrandTheme }),
    [colors, setBrandTheme, clearBrandTheme],
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme() {
  const ctx = useContext(BrandThemeContext);
  if (!ctx) throw new Error("useBrandTheme must be used within a BrandThemeProvider");
  return ctx;
}

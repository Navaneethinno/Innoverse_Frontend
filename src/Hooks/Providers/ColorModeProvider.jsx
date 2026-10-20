import { createContext, useContext, useEffect, useMemo, useState } from "react";

// New key: the old one saved the system theme on every visit, so everyone
// now starts in light mode until they pick dark themselves.
const STORAGE_KEY = "innoverse-color-mode-v2";

const ColorModeContext = createContext(null);

function getInitialMode() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
      setMode,
    }),
    [mode],
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error("useColorMode must be used within a ColorModeProvider");
  return ctx;
}

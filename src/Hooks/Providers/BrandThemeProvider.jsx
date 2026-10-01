import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { deriveBrandThemeVars } from "@/Utils/Lib/colorTheme";
import { asBrand, brandColors } from "@/Utils/Lib/branding";
import { getAccessToken } from "@/Services/api/authStorage";
import { institutionBrandingApi } from "@/Services/Institution/institutionBranding.api";

const STORAGE_KEY = "innoverse-brand-theme";
// The last signed-in institution's images (small ones, as data URLs) and
// code, kept after sign-out so its login page can show them.
const ASSETS_KEY = "innoverse-brand-assets";
const MAX_CACHED_IMAGE = 400 * 1024;
const DEFAULT_TITLE = document.title;
const BrandThemeContext = createContext(null);

const readJson = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeJson = (key, value) => {
  try {
    if (value) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage full or blocked: the in-memory brand still applies.
  }
};

// Clears every custom property this provider may have set, letting
// theme.css's :root/.dark fallback values take back over untouched — this
// is the "no tenant colors yet / logged out" state, not a second palette.
const BRAND_TOKENS = [
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
  "--mesh-1",
  "--mesh-2",
  "--bg-tint-primary",
  "--bg-tint-secondary",
  "--bg-tint-accent",
];

function applyBrandVars(colors, mode) {
  const root = document.documentElement;
  BRAND_TOKENS.forEach((token) => root.style.removeProperty(token));
  if (!colors) return;
  Object.entries(deriveBrandThemeVars(colors, mode)).forEach(([token, value]) => root.style.setProperty(token, value));
}

function setFavicon(href) {
  let link = document.querySelector("link[rel~='icon']");
  if (!href) {
    if (link?.dataset.brand) link.remove();
    return;
  }
  if (!link) {
    link = Object.assign(document.createElement("link"), { rel: "icon" });
    document.head.appendChild(link);
  }
  link.dataset.brand = "1";
  link.href = href;
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Each stored image path -> a URL the page can show. Downloaded with the
// signed-in user's token; small images are also cached for the next visit.
async function loadAssets(brand, cached) {
  const paths = { logo: brand.logo, logoDark: brand.logoDark, favicon: brand.favicon, loginBackground: brand.loginBackground };
  const out = {};
  await Promise.all(
    Object.entries(paths).map(async ([name, path]) => {
      if (!path) return;
      if (cached?.paths?.[name] === path && cached.urls?.[name]) {
        out[name] = { path, url: cached.urls[name], cache: true };
        return;
      }
      try {
        const blob = await institutionBrandingApi.file({ path });
        const small = blob.size <= MAX_CACHED_IMAGE;
        out[name] = { path, url: small ? await blobToDataUrl(blob) : URL.createObjectURL(blob), cache: small };
      } catch {
        // A missing image leaves the default in place.
      }
    }),
  );
  return out;
}

// Applies the institution's branding from the login response: brand
// colours as inline CSS custom properties on <html> (dark-mode colours in
// dark mode), plus its name, logo, favicon and login background. Inline
// properties beat theme.css's :root/.dark rules, so every component that
// reads var(--primary) etc. follows the brand with no changes, and with no
// branding the fixed palette in theme.css applies.
export function BrandThemeProvider({ children }) {
  const { mode } = useColorMode();
  const [brand, setBrand] = useState(() => asBrand(readJson(STORAGE_KEY)));
  const [assets, setAssets] = useState(() => readJson(ASSETS_KEY));

  useEffect(() => {
    applyBrandVars(brandColors(brand, mode), mode);
  }, [brand, mode]);

  // Images: fetched while signed in, whenever the brand's paths change.
  useEffect(() => {
    if (!brand || !getAccessToken()) return undefined;
    let cancelled = false;
    void loadAssets(brand, readJson(ASSETS_KEY)).then((loaded) => {
      if (cancelled) return;
      const next = {
        institutionCode: brand.institutionCode ?? null,
        paths: Object.fromEntries(Object.entries(loaded).map(([k, v]) => [k, v.path])),
        urls: Object.fromEntries(Object.entries(loaded).map(([k, v]) => [k, v.url])),
      };
      setAssets(next);
      const cacheable = Object.keys(loaded).filter((k) => loaded[k].cache);
      writeJson(ASSETS_KEY, {
        ...next,
        paths: Object.fromEntries(cacheable.map((k) => [k, next.paths[k]])),
        urls: Object.fromEntries(cacheable.map((k) => [k, next.urls[k]])),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [brand]);

  const signedIn = Boolean(brand);
  const logoUrl = signedIn ? (assets?.urls?.[mode === "dark" && brand.logoDark ? "logoDark" : "logo"] ?? null) : null;
  const faviconUrl = signedIn ? (assets?.urls?.favicon ?? null) : null;

  useEffect(() => {
    document.title = brand?.displayName ?? DEFAULT_TITLE;
    setFavicon(faviconUrl);
  }, [brand?.displayName, faviconUrl]);

  // `next`: a normalized brand (login/refresh) or a { primary, secondary }
  // pair (Institution Branding's live preview). Null clears it.
  const setBrandTheme = useCallback((next) => {
    setBrand((prev) => {
      const value = asBrand(next);
      // A colour-only preview keeps the rest of the current brand.
      const merged = value && prev && !next?.light && (next?.primary || next?.secondary) ? { ...prev, light: value.light } : value;
      writeJson(STORAGE_KEY, merged);
      return merged;
    });
  }, []);

  const clearBrandTheme = useCallback(() => setBrandTheme(null), [setBrandTheme]);

  // What the login page may show before sign-in: the last institution's
  // background, only when the code typed matches it.
  const loginAssetsFor = useCallback(
    (institutionCode) => {
      const code = String(institutionCode ?? "").trim().toUpperCase();
      if (!code || String(assets?.institutionCode ?? "").toUpperCase() !== code) return null;
      return { loginBackground: assets?.urls?.loginBackground ?? null, logo: assets?.urls?.logo ?? null };
    },
    [assets],
  );

  const value = useMemo(
    () => ({
      brand,
      colors: brandColors(brand, mode),
      logoUrl,
      displayName: brand?.displayName ?? null,
      setBrandTheme,
      clearBrandTheme,
      loginAssetsFor,
    }),
    [brand, mode, logoUrl, setBrandTheme, clearBrandTheme, loginAssetsFor],
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme() {
  const ctx = useContext(BrandThemeContext);
  if (!ctx) throw new Error("useBrandTheme must be used within a BrandThemeProvider");
  return ctx;
}

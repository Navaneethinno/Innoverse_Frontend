// The institution's branding, as the login (and refresh) response sends it:
//
//   branding: { display_name, logo, logo_dark, favicon, login_background,
//               primary_color_light, secondary_color_light,
//               primary_color_dark, secondary_color_dark }
//
// normalizeBranding turns that into one shape the app uses everywhere. A
// dark colour or logo that isn't set falls back to the light one. Empty
// strings count as "not set".
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function normalizeBranding(raw) {
  if (!raw || typeof raw !== "object") return null;
  const lightPrimary = text(raw.primary_color_light);
  const lightSecondary = text(raw.secondary_color_light);
  const brand = {
    displayName: text(raw.display_name),
    logo: text(raw.logo),
    logoDark: text(raw.logo_dark),
    favicon: text(raw.favicon),
    loginBackground: text(raw.login_background),
    light: { primary: lightPrimary, secondary: lightSecondary },
    dark: { primary: text(raw.primary_color_dark), secondary: text(raw.secondary_color_dark) },
  };
  const hasAny = brand.displayName || brand.logo || brand.favicon || brand.loginBackground || lightPrimary || lightSecondary || brand.dark.primary || brand.dark.secondary;
  return hasAny ? brand : null;
}

// A brand object from anything stored or handed over: a normalized brand,
// or the older { primary, secondary } colour pair (Institution Branding's
// live preview, and what earlier versions kept in localStorage).
export function asBrand(value) {
  if (!value || typeof value !== "object") return null;
  if (value.light || value.dark) return value;
  if (value.primary || value.secondary) return { light: { primary: value.primary ?? null, secondary: value.secondary ?? null }, dark: { primary: null, secondary: null } };
  return normalizeBranding(value);
}

// The colours for a colour mode: dark ones in dark mode, each falling back
// to its light colour.
export function brandColors(brand, mode) {
  if (!brand) return null;
  const light = brand.light ?? {};
  const dark = mode === "dark" ? (brand.dark ?? {}) : {};
  const colors = { primary: dark.primary ?? light.primary ?? null, secondary: dark.secondary ?? light.secondary ?? null };
  return colors.primary || colors.secondary ? colors : null;
}


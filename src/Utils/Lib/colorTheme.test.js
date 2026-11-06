import { describe, expect, it } from "vitest";
import { deriveBrandThemeVars, inkFor } from "./colorTheme";

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c((n >> 16) & 255) + 0.7152 * c((n >> 8) & 255) + 0.0722 * c(n & 255);
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe("brand text color", () => {
  it("makes a bright brand readable on white and on the slate panels", () => {
    const ink = inkFor("#ffcc00");
    expect(contrast(ink, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink, "#f1f5f9")).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a brand that already reads well almost as it is", () => {
    expect(inkFor("#0f766e")).toBe("#0f766e");
  });

  it("is lighter in dark mode and set with the rest of the brand", () => {
    expect(contrast(inkFor("#2266ee", "dark"), "#0f172a")).toBeGreaterThanOrEqual(4.5);
    expect(deriveBrandThemeVars({ primary: "#ffcc00" })["--primary-ink"]).toBe(inkFor("#ffcc00"));
  });
});

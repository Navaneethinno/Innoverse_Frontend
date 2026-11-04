import { describe, expect, it, vi } from "vitest";

vi.mock("@/Utils/Lib/environment", () => ({ getEnvironment: () => null, onEnvironmentChange: () => {} }));
const { isLockedEnvironment, isPrintShortcut, shouldBlock } = await import("./uiLock");

const el = (matches) => ({ nodeType: 1, closest: (selector) => (matches.some((m) => selector.includes(m)) ? {} : null) });
const text = el([]);
const field = el(["input,"]);
const secret = el(['type="password"']);

describe("UI lock", () => {
  it("spots Ctrl+P only", () => {
    expect(isPrintShortcut({ ctrlKey: true, key: "p" })).toBe(true);
    expect(isPrintShortcut({ ctrlKey: true, key: "c" })).toBe(false);
    expect(isPrintShortcut({ key: "p" })).toBe(false);
  });
  it("is on in UAT only for now", () => {
    expect(isLockedEnvironment("UAT")).toBe(true);
    expect(isLockedEnvironment("PRODUCTION")).toBe(false);
  });
  it("an unknown environment is not", () => expect(isLockedEnvironment(null)).toBe(false));
  it("blocks right click, and copying page text", () => {
    expect(shouldBlock("contextmenu", text)).toBe(true);
    expect(shouldBlock("copy", text)).toBe(true);
  });
  it("leaves ordinary form fields usable", () => expect(shouldBlock("copy", field)).toBe(false));
  it("blocks copying out of a password", () => expect(shouldBlock("copy", secret)).toBe(true));
});

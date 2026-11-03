import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ format: "WESTERN" }));
vi.mock("@/Redux/Store", () => ({
  default: { getState: () => ({ token: { user: { formats: { number_format: state.format } } } }) },
}));

const { decimalSeparator, formatNumber, plainDecimal } = await import("./numberFormat");

// Runtimes differ in which space they group with: compare without.
const plainSpaces = (text) => text.replace(/\s/g, " ");

describe("formatNumber", () => {
  beforeEach(() => {
    state.format = "WESTERN";
  });

  it("follows the institution's format", () => {
    expect(formatNumber(1234567.89)).toBe("1,234,567.89");
    state.format = "INDIAN";
    expect(formatNumber(1234567.89)).toBe("12,34,567.89");
    state.format = "EUROPEAN";
    expect(formatNumber(1234567.89)).toBe("1.234.567,89");
    state.format = "SPACE";
    expect(plainSpaces(formatNumber(1234567.89))).toBe("1 234 567,89");
  });

  it("falls back to Western for an unknown format", () => {
    state.format = "NOPE";
    expect(formatNumber(1000)).toBe("1,000.00");
  });

  it("keeps at least two decimals and accepts decimal strings", () => {
    expect(formatNumber("22")).toBe("22.00");
    expect(formatNumber("0.125")).toBe("0.125");
  });

  it("shows what is not a number as it came", () => {
    expect(formatNumber("abc")).toBe("abc");
    expect(formatNumber(undefined)).toBe("");
  });
});

describe("plainDecimal", () => {
  beforeEach(() => {
    state.format = "WESTERN";
  });

  it("drops grouping and limits decimals", () => {
    expect(plainDecimal("1,234,567.891", 2)).toBe("1234567.89");
  });

  it("reads the decimal separator of the format", () => {
    state.format = "EUROPEAN";
    expect(decimalSeparator()).toBe(",");
    expect(plainDecimal("1.234,50", 2)).toBe("1234.50");
  });

  it("gives empty for nothing, and a leading zero for a bare fraction", () => {
    expect(plainDecimal("", 2)).toBe("");
    expect(plainDecimal(".5", 2)).toBe("0.5");
  });

  it("gives a whole number when the currency has no decimals", () => {
    expect(plainDecimal("1,000.75", 0)).toBe("1000");
  });
});

import { describe, expect, it } from "vitest";
import { amountInput, percentInput } from "./amountInput";

describe("amountInput", () => {
  it("keeps digits and one point", () => {
    expect(amountInput("1a2b.3c")).toBe("12.3");
    expect(amountInput("1.2.3")).toBe("1.23");
  });

  it("limits decimals to the currency's", () => {
    expect(amountInput("10.999", 2)).toBe("10.99");
    expect(amountInput("10.5", 0)).toBe("10.");
  });

  it("never allows a minus sign", () => {
    expect(amountInput("-50")).toBe("50");
  });

  it("drops a leading zero once a digit follows, and keeps 0.5", () => {
    expect(amountInput("05")).toBe("5");
    expect(amountInput("0.5")).toBe("0.5");
  });

  it("stays a string, so large amounts keep every digit", () => {
    expect(amountInput("12345678901234567890.12")).toBe("12345678901234567890.12");
  });

  it("is empty for nothing", () => {
    expect(amountInput(null)).toBe("");
  });
});

describe("percentInput", () => {
  it("is never above 100", () => {
    expect(percentInput("150")).toBe("100");
    expect(percentInput("100")).toBe("100");
  });

  it("keeps up to six decimals", () => {
    expect(percentInput("1.12345678")).toBe("1.123456");
  });
});

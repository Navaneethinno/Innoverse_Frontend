import { describe, expect, it } from "vitest";
import { toBody } from "./feeBody";

const rule = (patch) => toBody({ rules: [{ rule_code: "r1", calculation_type: "FIXED", pay_from: "SENDER", ...patch }] }).rules[0];

describe("fee rule body", () => {
  it("defaults to a fee on top of the amount", () => {
    expect(rule({}).amount_mode).toBe("EXCLUSIVE");
  });

  it("lets a sender's fee be included in the amount", () => {
    expect(rule({ amount_mode: "INCLUSIVE" }).amount_mode).toBe("INCLUSIVE");
  });

  it("never sends INCLUSIVE for a fee the sender does not pay", () => {
    expect(rule({ pay_from: "INSTITUTION", amount_mode: "INCLUSIVE" }).amount_mode).toBe("EXCLUSIVE");
    expect(rule({ pay_from: "RECEIVER", amount_mode: "INCLUSIVE" }).amount_mode).toBe("EXCLUSIVE");
  });

  it("sends amounts as strings, empty as 0, and the code in capitals", () => {
    const r = rule({ fixed_amount: "", percent_value: 1.5 });
    expect(r.fixed_amount).toBe("0");
    expect(r.percent_value).toBe("1.5");
    expect(r.rule_code).toBe("R1");
  });

  it("drops a share with no purpose", () => {
    expect(rule({ shares: [{ purpose: "AGENT", percent: 10 }, { purpose: "", percent: 90 }] }).shares).toEqual([{ purpose: "AGENT", percent: "10" }]);
  });

  it("keeps an existing rule's id only", () => {
    expect(rule({ id: 7 }).id).toBe(7);
    expect("id" in rule({})).toBe(false);
  });
});

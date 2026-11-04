import { describe, expect, it } from "vitest";
import { fileMatches } from "./fileDrop";

describe("a dropped file against accept", () => {
  it("takes an extension, a family or anything", () => {
    expect(fileMatches(".csv,.xlsx", { name: "A.CSV", type: "" })).toBe(true);
    expect(fileMatches("image/*", { name: "a.png", type: "image/png" })).toBe(true);
    expect(fileMatches("*/*", { name: "a.bin", type: "" })).toBe(true);
    expect(fileMatches("", { name: "a.bin", type: "" })).toBe(true);
  });
  it("refuses what the input would not offer", () => {
    expect(fileMatches("image/*", { name: "a.pdf", type: "application/pdf" })).toBe(false);
    expect(fileMatches(".csv", { name: "a.txt", type: "text/plain" })).toBe(false);
  });
});

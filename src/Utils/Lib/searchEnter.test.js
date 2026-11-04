import { describe, expect, it } from "vitest";
import { installSearchEnterGuard } from "./searchEnter";

const form = (role) => ({ getAttribute: () => role });
const press = (target, form) => {
  const event = { key: "Enter", target: { tagName: "INPUT", ...target, form }, preventDefault() { this.stopped = true; } };
  let handler;
  installSearchEnterGuard({ addEventListener: (_, h) => (handler = h), removeEventListener() {} });
  handler(event);
  return Boolean(event.stopped);
};

describe("Enter in a form", () => {
  it("a search box does not submit the form", () => expect(press({ type: "search" }, form(null))).toBe(true));
  it("a search form still runs its Find", () => expect(press({ type: "search" }, form("search"))).toBe(false));
  it("an ordinary field still does", () => expect(press({ type: "text" }, form(null))).toBe(false));
});

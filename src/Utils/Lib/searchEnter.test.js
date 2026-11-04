import { describe, expect, it } from "vitest";
import { installSearchEnterGuard } from "./searchEnter";

const press = (target, form) => {
  const event = { key: "Enter", target: { tagName: "INPUT", ...target, form }, preventDefault() { this.stopped = true; } };
  let handler;
  installSearchEnterGuard({ addEventListener: (_, h) => (handler = h), removeEventListener() {} });
  handler(event);
  return Boolean(event.stopped);
};

describe("Enter in a form", () => {
  it("a search box does not submit the form", () => expect(press({ type: "search" }, {})).toBe(true));
  it("an ordinary field still does", () => expect(press({ type: "text" }, {})).toBe(false));
});

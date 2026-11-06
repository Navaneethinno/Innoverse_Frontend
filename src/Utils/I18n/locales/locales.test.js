import { describe, expect, it } from "vitest";
import en from "./en";
import pt from "./pt";
import ar from "./ar";

const PLACEHOLDER = /\{\{\s*\w+\s*\}\}/g;
const holes = (text) => (String(text).match(PLACEHOLDER) ?? []).sort();

// A text added in English must be added in every language, or users of that
// language see English there.
describe.each([
  ["Portuguese", pt],
  ["Arabic", ar],
])("%s", (_, other) => {
  it("has every English text", () => {
    const missing = Object.entries(en).flatMap(([ns, keys]) =>
      Object.keys(keys).filter((key) => !(other[ns] && key in other[ns])).map((key) => `${ns}:${key}`),
    );
    expect(missing).toEqual([]);
  });

  it("keeps every placeholder", () => {
    const broken = Object.entries(en).flatMap(([ns, keys]) =>
      Object.entries(keys)
        .filter(([key, text]) => other[ns]?.[key] != null && typeof text === "string")
        // A singular may spell out "one" instead of {{count}}.
        .filter(([key, text]) => {
          const want = holes(text).filter((h) => !(key.endsWith("_one") && h.includes("count")));
          const got = holes(other[ns][key]);
          return want.some((h) => !got.includes(h)) || got.some((h) => !holes(text).includes(h));
        })
        .map(([key]) => `${ns}:${key}`),
    );
    expect(broken).toEqual([]);
  });
});

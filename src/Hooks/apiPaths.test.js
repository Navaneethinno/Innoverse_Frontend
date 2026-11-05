import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { API_ENDPOINTS } from "@/Utils/Constant";

// Every API path lives in Utils/Constant.jsx (API_ENDPOINTS). requiredFields.js
// is a table keyed by route; apiScope.js rewrites prefixes.
const ROOT = path.resolve("src");
const ALLOWED = ["Utils/Constant.jsx", "Utils/Lib/requiredFields.js", "Utils/Lib/apiScope.js"];
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.jsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
const PATH = /["'`]\/(config|customer|merchant|master|auth)\/[\w./-]*\w/;

describe("API paths", () => {
  it("are written only in Constant.jsx", () => {
    const found = files(ROOT)
      .map((file) => path.relative(ROOT, file).replaceAll("\\", "/"))
      .filter((file) => !ALLOWED.includes(file) && !file.startsWith("Router/") && !file.startsWith("Utils/I18n/"))
      .filter((file) => readFileSync(path.join(ROOT, file), "utf8").split("\n").some((line) => !/^\s*(\/\/|\*)/.test(line) && PATH.test(line.split(" // ")[0])));
    expect(found).toEqual([]);
  }, 30000);

  it("each have one key", () => {
    const seen = new Map();
    const walk = (node, name) =>
      Object.entries(node).forEach(([key, value]) => {
        if (typeof value === "object") return walk(value, `${name}.${key}`);
        seen.set(value, [...(seen.get(value) ?? []), `${name}.${key}`]);
      });
    walk(API_ENDPOINTS, "API_ENDPOINTS");
    expect([...seen.values()].filter((keys) => keys.length > 1)).toEqual([]);
  });

  it("are used only through keys that exist", () => {
    const missing = files(ROOT).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/API_ENDPOINTS((?:\.[A-Z][A-Z0-9_]*)+)/g)]
        .filter(([, keys]) => keys.split(".").slice(1).reduce((node, key) => node?.[key], API_ENDPOINTS) === undefined)
        .map(([used]) => `${path.basename(file)}: ${used}`),
    );
    expect(missing).toEqual([]);
  }, 30000);
});

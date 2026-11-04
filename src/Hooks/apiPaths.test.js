import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
  });
});

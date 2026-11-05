import { afterEach, describe, expect, it, vi } from "vitest";
import { monthStartDate, todayDate, tomorrowDate } from "./dateFormat";

describe("calendar dates", () => {
  afterEach(() => vi.useRealTimers());

  it("use the local day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 31, 0, 30));
    expect(todayDate()).toBe("2026-01-31");
    expect(tomorrowDate()).toBe("2026-02-01");
    expect(monthStartDate()).toBe("2026-01-01");
  });
});

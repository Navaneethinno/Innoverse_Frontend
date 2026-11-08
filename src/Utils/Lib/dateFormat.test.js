import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateTime, monthStartDate, platformToday, todayDate, tomorrowDate } from "./dateFormat";

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

describe("platformToday", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  const at = (browserZone, instant) => {
    vi.stubEnv("TZ", browserZone);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
  };

  it("stays on the platform day when the local day is ahead", () => {
    at("Pacific/Auckland", "2026-03-01T15:00:00Z");
    expect(todayDate()).toBe("2026-03-02");
    expect(platformToday()).toBe("2026-03-01");
  });

  it("moves to the platform day when the local day is behind", () => {
    at("America/New_York", "2026-03-01T20:00:00Z");
    expect(todayDate()).toBe("2026-03-01");
    expect(platformToday()).toBe("2026-03-02");
  });

  it("turns over at midnight in Asia/Kolkata", () => {
    at("UTC", "2026-03-01T18:29:59Z");
    expect(platformToday()).toBe("2026-03-01");
    vi.setSystemTime(new Date("2026-03-01T18:30:00Z"));
    expect(platformToday()).toBe("2026-03-02");
  });
});

describe("formatDateTime IST label", () => {
  it("marks a value in platform time, as written", () => {
    expect(formatDateTime("2026-10-31 12:35:28")).toBe("2026-10-31 12:35 IST");
    expect(formatDateTime("2026-10-31T12:35:28.5")).toBe("2026-10-31 12:35 IST");
  });

  it("leaves instants and Date objects unmarked", () => {
    expect(formatDateTime("2026-10-31T12:35:28Z")).not.toContain("IST");
    expect(formatDateTime("2026-10-31T12:35:28+05:30")).not.toContain("IST");
    expect(formatDateTime(new Date(2026, 9, 31, 12, 35))).toBe("2026-10-31 12:35");
  });
});

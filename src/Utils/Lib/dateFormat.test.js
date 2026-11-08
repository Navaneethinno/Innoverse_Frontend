import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateTime, formatDay, formatIstPlain, istInputValue, istToUtc, monthStartDate, platformToday, todayDate, tomorrowDate } from "./dateFormat";

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

describe.each(["America/New_York", "Pacific/Auckland", "UTC", "Asia/Kolkata"])("IST display in a browser on %s", (zone) => {
  beforeEach(() => vi.stubEnv("TZ", zone));
  afterEach(() => vi.unstubAllEnvs());

  it("converts the API's UTC value and labels it", () => {
    expect(formatDateTime("2026-10-31T07:05:28.000000Z")).toBe("2026-10-31 12:35 IST");
    expect(formatIstPlain("2026-10-31T07:05:28.000000Z")).toBe("2026-10-31 12:35:28");
  });

  it("crosses midnight on the IST calendar", () => {
    expect(formatDateTime("2026-10-31T18:30:00.000000Z")).toBe("2026-11-01 00:00 IST");
    expect(formatDay("2026-10-31T18:30:00.000000Z")).toBe("2026-11-01");
  });

  it("converts a Date the same way", () => {
    expect(formatDateTime(new Date("2026-10-31T07:05:28Z"))).toBe("2026-10-31 12:35 IST");
  });

  it("reads a value with no zone as platform time", () => {
    expect(formatDateTime("2026-10-31 12:35:28")).toBe("2026-10-31 12:35 IST");
    expect(formatDateTime("2026-10-31T12:35:28.5")).toBe("2026-10-31 12:35 IST");
  });

  it("never shifts a date-only value", () => {
    expect(formatDay("2026-10-31")).toBe("2026-10-31");
    expect(formatDateTime("2026-10-31")).toBe("2026-10-31");
    expect(formatIstPlain("2026-10-31")).toBe("2026-10-31");
  });

  it("fills and reads a datetime box on the IST clock", () => {
    expect(istInputValue("2026-10-31T07:05:28.000000Z")).toBe("2026-10-31T12:35");
    expect(istToUtc("2026-10-31T12:35")).toBe("2026-10-31T07:05:00.000Z");
  });
});

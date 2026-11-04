import { describe, expect, it, vi } from "vitest";
import { sharedReader } from "./useVisiblePoll";

describe("sharedReader", () => {
  it("sends one request for repeats, and again when forced", async () => {
    const call = vi.fn(() => Promise.resolve(1));
    const read = sharedReader(call);
    read({ a: 1 });
    read({ a: 1 });
    await read({ a: 1 });
    expect(call).toHaveBeenCalledTimes(1);
    await read({ a: 1 });
    expect(call).toHaveBeenCalledTimes(1);
    await read({ a: 1 }, { force: true });
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("keeps different bodies apart", async () => {
    const call = vi.fn(() => Promise.resolve(1));
    const read = sharedReader(call);
    await Promise.all([read({ a: 1 }), read({ a: 2 })]);
    expect(call).toHaveBeenCalledTimes(2);
  });
});

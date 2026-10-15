import { describe, expect, it, vi, beforeEach } from "vitest";
import { cachedFetch, clearReadCache } from "@/Services/api/readCache";

const reply = (data) => () => Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } }));
const post = (body = "{}") => ({ method: "POST", body, headers: {} });

describe("readCache", () => {
  beforeEach(() => clearReadCache());

  it("shares one request between identical concurrent reads", async () => {
    const send = vi.fn(reply({ status: "success", data: [1] }));
    const [a, b] = await Promise.all([cachedFetch("https://x/a/list", post(), send), cachedFetch("https://x/a/list", post(), send)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await a.json()).toEqual(await b.json());
  });

  it("caches dropdowns until a change is made", async () => {
    const send = vi.fn(reply({ status: "success", data: [] }));
    await cachedFetch("https://x/a/get_active", post(), send);
    await cachedFetch("https://x/a/get_active", post(), send);
    expect(send).toHaveBeenCalledTimes(1);
    await cachedFetch("https://x/a/add", post(), reply({ status: "success" }));
    await cachedFetch("https://x/a/get_active", post(), send);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("never caches a list or a failed reply", async () => {
    const list = vi.fn(reply({ status: "success", data: [] }));
    await cachedFetch("https://x/a/list", post(), list);
    await cachedFetch("https://x/a/list", post(), list);
    expect(list).toHaveBeenCalledTimes(2);
    const fail = vi.fn(reply({ status: "fail" }));
    await cachedFetch("https://x/a/get_active", post(), fail);
    await cachedFetch("https://x/a/get_active", post(), fail);
    expect(fail).toHaveBeenCalledTimes(2);
  });
});

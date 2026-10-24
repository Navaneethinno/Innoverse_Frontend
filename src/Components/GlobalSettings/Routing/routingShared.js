// Transaction Routing: the setup as the server takes it, and the rules the
// form follows (which fields a rule shows, which groups it may use, how
// specific it is).

export const SECTIONS = ["interfaces", "issuers", "bin_ranges", "route_groups", "rules"];
export const CARD_DIRECTIONS = ["ACQUIRE", "ISSUE"];

export const code = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
const text = (v) => String(v ?? "").trim();
const amount = (v) => text(v);
const num = (v, fallback) => (v === "" || v == null || Number.isNaN(Number(v)) ? fallback : Number(v));

// on_us as the form holds it ("" any, "OURS", "OTHERS") and as the server does (null / true / false).
export const onUsIn = (v) => (v === true ? "OURS" : v === false ? "OTHERS" : "");
const onUsOut = (v) => (v === "OURS" ? true : v === "OTHERS" ? false : null);

// A setup from the server, ready for the form (on_us as a choice, ranks in order).
export const toForm = (config) => ({
  interfaces: (config?.interfaces ?? []).map((x) => ({ ...x, failure_threshold: String(x.failure_threshold ?? 3), cooldown_seconds: String(x.cooldown_seconds ?? 60) })),
  issuers: config?.issuers ?? [],
  bin_ranges: config?.bin_ranges ?? [],
  route_groups: (config?.route_groups ?? []).map((g) => ({ ...g, members: [...(g.members ?? [])].sort((a, b) => a.rank - b.rank) })),
  rules: (config?.rules ?? []).map((r) => ({ ...r, on_us: onUsIn(r.on_us), priority: String(r.priority ?? 100) })),
});

// The form as the server takes it: whole lists, everything by code.
export const toBody = (f) => ({
  interfaces: f.interfaces.map((x) => ({
    code: code(x.code),
    name: text(x.name),
    kind: x.kind,
    provider: x.kind === "PROVIDER" ? x.provider ?? "" : "",
    network: x.kind === "CARD_NETWORK" ? x.network ?? "" : "",
    txn_types: x.txn_types ?? [],
    failover_codes: x.failover_codes ?? [],
    failure_threshold: num(x.failure_threshold, 3),
    cooldown_seconds: num(x.cooldown_seconds, 60),
    cost_note: text(x.cost_note),
    active: Boolean(x.active),
  })),
  issuers: f.issuers.map((x) => ({ code: code(x.code), name: text(x.name), country: text(x.country), network: x.network ?? "", active: Boolean(x.active) })),
  bin_ranges: f.bin_ranges.map((x) => ({ issuer: x.issuer ?? "", low: text(x.low), high: text(x.high) || text(x.low), product_class: x.product_class ?? "", active: Boolean(x.active) })),
  // Ranks follow the order shown: 1, 2, 3...
  route_groups: f.route_groups.map((g) => ({
    code: code(g.code),
    name: text(g.name),
    active: Boolean(g.active),
    members: (g.members ?? []).map((m, i) => ({ interface: m.interface, rank: i + 1, min_amount: amount(m.min_amount), max_amount: amount(m.max_amount), active: Boolean(m.active) })),
  })),
  rules: f.rules.map((r) => {
    const card = CARD_DIRECTIONS.includes(r.direction);
    return {
      code: code(r.code),
      name: text(r.name),
      direction: r.direction,
      txn_type: r.txn_type ?? "",
      channel: r.channel ?? "",
      service: r.direction === "SERVICE" ? r.service ?? "" : "",
      on_us: card ? onUsOut(r.on_us) : null,
      network: card ? r.network ?? "" : "",
      issuer: card ? r.issuer ?? "" : "",
      product_class: card ? r.product_class ?? "" : "",
      currency: r.currency ?? "",
      min_amount: amount(r.min_amount),
      max_amount: amount(r.max_amount),
      group: r.group ?? "",
      priority: num(r.priority, 100),
      active: Boolean(r.active),
    };
  }),
});

// How specific a rule is: the most specific matching rule wins.
export const specificity = (r) => {
  const card = CARD_DIRECTIONS.includes(r.direction);
  return (
    (r.txn_type ? 8 : 0) +
    (r.direction === "SERVICE" && r.service ? 8 : 0) +
    (card && r.issuer ? 8 : 0) +
    (card && r.network ? 4 : 0) +
    (card && r.on_us ? 4 : 0) +
    (r.channel ? 2 : 0) +
    (card && r.product_class ? 2 : 0) +
    (r.currency ? 1 : 0) +
    (r.min_amount || r.max_amount ? 1 : 0)
  );
};

// The groups a rule may use: SERVICE rules only groups of PROVIDER
// interfaces; card rules only groups of LOCAL or CARD_NETWORK ones. A group
// with no members yet fits either.
export const groupFits = (group, direction, interfaces) => {
  const kinds = (group.members ?? []).map((m) => interfaces.find((x) => code(x.code) === m.interface)?.kind).filter(Boolean);
  if (!kinds.length) return true;
  return direction === "SERVICE" ? kinds.every((k) => k === "PROVIDER") : kinds.every((k) => k === "LOCAL" || k === "CARD_NETWORK");
};

// A BIN range's digits: 6 to 12, both ends the same length, low <= high.
export const rangeProblem = (r) => {
  const low = text(r.low);
  const high = text(r.high) || low;
  if (!/^\d{6,12}$/.test(low) || !/^\d{6,12}$/.test(high)) return "digits";
  if (low.length !== high.length) return "length";
  if (low > high) return "order";
  return null;
};

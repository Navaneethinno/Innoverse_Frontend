import { NAV_ITEMS } from "@/Utils/Config/navigation";

// Innoverse's implemented pages are a small, fixed set of top-level routes
// (see src/Router/index and NAV_ITEMS) — unlike payseFrontend, module/menu
// names are NOT slugged into fabricated routes. Per Phase 24C spec: "Do not
// fabricate routes for backend menus whose pages have not yet been
// implemented. Keep menu/navigation data independent from current page
// implementation."
//
// So a dynamic module/menu name is only navigable when it normalizes to the
// label of an already-implemented route below. Anything else renders in the
// sidebar (so the user can see their permitted navigation tree) but is
// inert — clicking it does nothing rather than guessing/fabricating a URL.
const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const IMPLEMENTED_ROUTES_BY_LABEL = new Map(
  NAV_ITEMS.map((item) => [normalize(item.label), item.path]),
);

// A couple of common backend synonyms for the same implemented pages.
const ALIASES = {
  usermanagement: "users",
  user: "users",
  kyc: "kyc",
};

export function resolveImplementedRoute(name) {
  const key = normalize(name);
  const aliased = ALIASES[key] ?? key;
  return IMPLEMENTED_ROUTES_BY_LABEL.get(aliased) ?? null;
}

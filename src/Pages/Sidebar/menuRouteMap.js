// A menu's page is registered under a one-segment slug (the old menu name,
// slugged); MENU_PAGES below maps each menu of the current tree to it. A
// menu with no registered page shows the app's not-found screen (the
// protected route group's errorElement, RouteError).
function slugifyMenuName(menuName) {
  return String(menuName ?? "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

// Menu names repeat — every EPURSE menu is copied into MMS — so the sidebar
// routes by module + full menu path: EPURSE > Settings > Form Builder ->
// /epurse/settings/form-builder. MenuPage resolves the path back to its
// menu. A per-click nonce in history state remounts the page when the same
// menu is clicked again.
export function buildMenuPathForItem(item, menuItems) {
  return menuPathForItem(item, menuItems);
}

export const kebab = (text) =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const byId = (menuItems, id) => menuItems?.find((m) => String(m?.menu_id) === String(id));

// The menu and its ancestors, top-level first.
export function menuChain(item, menuItems) {
  const chain = [];
  const seen = new Set();
  for (let m = item; m && !seen.has(String(m.menu_id)); m = byId(menuItems, m.parent_menu_id)) {
    seen.add(String(m.menu_id));
    chain.unshift(m);
  }
  return chain;
}

export function menuPathForItem(item, menuItems) {
  const segments = [item?.module_name, ...menuChain(item, menuItems).map((m) => m.menu_name)].map(kebab).filter(Boolean);
  return `/${segments.join("/")}`;
}

// A module's own dashboard: /<module>/dashboard (opened by picking the
// module in the sidebar). A real menu at that path still wins.
export const moduleDashboardPath = (moduleName) => `/${kebab(moduleName)}/dashboard`;

// The module whose dashboard a path names, or null.
export function findModuleByDashboardPath(menuItems, pathname) {
  const target = String(pathname ?? "").toLowerCase().replace(/\/+$/, "");
  return (menuItems ?? []).find((m) => moduleDashboardPath(m.module_name) === target)?.module_name ?? null;
}

// The menu a /<module>/<menu>/<...> path names, or null.
export function findMenuByPath(menuItems, pathname) {
  const target = `/${String(pathname ?? "").split("/").filter(Boolean).map((s) => decodeURIComponent(s).toLowerCase()).join("/")}`;
  return (menuItems ?? []).find((m) => menuPathForItem(m, menuItems) === target) ?? null;
}

// Each menu's page, by menu name (Admin menu tree, 2026-10-18). EPURSE and
// MMS share names and pages; the module picks the API prefix. A menu not
// listed here opens the page registered under its slugged name.
//   "slug"              the page registered under that slug
//   { slug, branch }    the Individual or Corporate half of a shared page
//   { views }           one menu over several pages, picked by a switch on
//                       the page (the first is the default)
//   { soon: true }      a new menu with no backend yet
//   also                old one-segment links that belong to this menu
const indvCorp = (slug) => ({ views: [{ key: "individual", slug }, { key: "corporate", slug: `corp${slug}` }] });
const ACCOUNT_CONFIGS = ["productownership", "productpartytype", "producttransaction", "productchannel", "productbalanceconfiguration", "productgroupconfiguration", "interestconfiguration", "jointconfiguration", "lifecycleconfiguration", "dormancyconfiguration", "minorconfiguration", "alertconfiguration", "nomineeconfiguration", "numberingconfiguration", "openingconfiguration", "statementconfiguration"];
const MENU_PAGES = {
  // Institution
  profile: "institutionprofile",
  modules: "institutionmodule",
  currencies: "institutioncurrency",
  channels: "institutionchannel",
  "phone codes": "institutionphonecode",
  branding: "institutionbranding",
  legal: "institutionlegal",
  documents: "institutiondocuments",
  // User Management
  profiles: "profile",
  users: "user",
  "user kyc": "kyc",
  // EPURSE / MMS > Settings > Lists
  "relationship type": indvCorp("relationshiptype"),
  "address type": indvCorp("addresstype"),
  "document type": indvCorp("documenttype"),
  "business nature": indvCorp("businessnature"),
  "company type": "corpcompanytype",
  "identification type": "corpidentificationtype",
  "tax type": "corptaxtype",
  "screening type": "corpscreeningtype",
  "industry sector": "corpindustrysector",
  "merchant category": "corpmerchantcategory",
  "merchant group": "corpmerchantgroup",
  "gst registration status": "corpgstregistrationstatus",
  "tax exemption status": "corptaxexemptionstatus",
  // EPURSE / MMS > Settings
  "form builder": { views: [{ key: "fields", slug: "formfields" }, { key: "sections", slug: "formsections" }] },
  "risk actions": "riskaction",
  "risk assessment": { views: [{ key: "individual", slug: "individualrisk" }, { key: "corporate", slug: "corporaterisk" }] },
  // EPURSE / MMS
  "individual customers": { slug: "onboardingwizard", branch: "individual" },
  "corporate customers": { slug: "onboardingwizard", branch: "corporate" },
  "individual merchants": { slug: "onboardingwizard", branch: "individual" },
  "corporate merchants": { slug: "onboardingwizard", branch: "corporate" },
  // Finance
  "account products": { slug: "accountproduct", also: ACCOUNT_CONFIGS },
  "finance transaction": "manualjournal",
  "term deposits": "deposits",
  // InnoCMS
  bins: "cardbins",
  "receive cards": { soon: true },
  // Global Settings
  notifications: { views: [{ key: "groups", slug: "notificationgroup" }, { key: "alerts", slug: "notificationalerts" }] },
  limits: "limit",
  "digital products": "digitalproduct",
  // Reports
  "kyc report": { views: [{ key: "customer", slug: "customerkycreport" }, { key: "merchant", slug: "merchantkycreport" }] },
};

// { slug, branch, views, soon, slugs } for a menu; slugs is every
// one-segment page the menu covers.
export function menuPage(item) {
  const entry = MENU_PAGES[String(item?.menu_name ?? "").trim().toLowerCase()] ?? slugifyMenuName(item?.menu_name);
  const page = typeof entry === "string" ? { slug: entry } : entry;
  const slug = page.slug ?? page.views?.[0]?.slug ?? null;
  return { ...page, slug, slugs: [...(page.views ?? []).map((v) => v.slug), ...(page.slug ? [page.slug] : []), ...(page.also ?? [])] };
}

// The Individual / Corporate half a menu opens, or null.
export const menuBranch = (item) => menuPage(item).branch ?? null;

// The page registry key for a menu (the slug its page is registered under).
export const menuSlugForItem = (item) => menuPage(item).slug;

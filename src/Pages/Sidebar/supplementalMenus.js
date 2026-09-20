// The backend's menu_array doesn't yet include the Customer Onboarding
// Configuration screens or the onboarding masters (only Institution Profile,
// Profile, User and Customer Individual exist), so without this they're only
// reachable by typing a URL. Until the backend adds real menus, append them
// client-side as two groups in the same module as "Customer Individual".
// A real backend menu of the same name always wins: any entry whose name
// already exists in menu_array is skipped, and once the backend registers a
// whole group its own items are used instead. Slugs are slugified menu names
// (menuRouteMap.js), matching routes registered in onboardingConfigRoutes.jsx
// and masterConfigRoutes.jsx. Permissions for these fall through to "allowed"
// (see useMenuPermission) — the server still enforces them.
const GROUPS = [
  {
    name: "Onboarding Configuration",
    children: ["Customer Types", "Onboarding Versions", "KYC Schemes"],
  },
  {
    name: "Onboarding Masters",
    children: [
      "Title",
      "Kinship",
      "Business Nature",
      "Validation Rule",
      "Risk Category",
      "Document Type",
      "Annual Income Range",
      "Monthly Income Range",
      "Net Worth Range",
      "Turnover Range",
      "Marital Status",
      "Visa Type",
      "Immigration Status",
      "Address Type",
      "Relationship Type",
      "Verification Status",
      "Verification Method",
      "Tax Status",
      "Tax Classification",
      "PEP Status",
      "PEP Category",
      "Ownership Sub Type",
    ],
  },
];

const BASE_ID = 900000;
const norm = (name) => String(name ?? "").trim().toLowerCase();

export function withSupplementalMenus(menuArray) {
  const menus = menuArray ?? [];
  if (menus.length === 0) return menus;
  const active = menus.filter((m) => m?.status === 1);
  // Same module as the customer menu, else the first module the user has.
  const anchor = active.find((m) => norm(m.menu_name) === "customer individual") ?? active[0];
  if (!anchor) return menus;
  const have = new Set(menus.map((m) => norm(m.menu_name)));
  const extra = [];
  let nextId = BASE_ID;
  GROUPS.forEach((group, groupIndex) => {
    const missing = group.children.filter((child) => !have.has(norm(child)));
    if (missing.length === 0 || have.has(norm(group.name))) return;
    const parentId = nextId++;
    extra.push({
      menu_id: parentId,
      parent_menu_id: 0,
      module_id: anchor.module_id,
      menu_name: group.name,
      status: 1,
      priority: 900 + groupIndex,
      actions: [],
    });
    missing.forEach((child, index) => {
      extra.push({
        menu_id: nextId++,
        parent_menu_id: parentId,
        module_id: anchor.module_id,
        menu_name: child,
        status: 1,
        priority: index,
        actions: [],
      });
    });
  });
  return extra.length ? [...menus, ...extra] : menus;
}

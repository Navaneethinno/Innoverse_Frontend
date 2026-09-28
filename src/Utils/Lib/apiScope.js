// EPURSE and MMS share the same customer-facing screens (masters, onboarding,
// risk); only the API prefix differs: EPURSE calls /customer/..., MMS calls
// /merchant/... with identical bodies and responses (Menus handoff 12). The
// page being shown sets the prefix (MenuPage, from the menu's module), and
// every request / live channel path under those three groups is rewritten
// to it. Every other path (/config, /master, /customer/web, ...) is left
// untouched.
const SCOPED = /^\/customer\/(master_config|risk|admin)\//;

// Module name (menu_array's module_name) -> API prefix.
const PREFIX_BY_MODULE = { MMS: "merchant" };

let prefix = "customer";

export function setApiScope(moduleName) {
  prefix = PREFIX_BY_MODULE[String(moduleName ?? "").trim().toUpperCase()] ?? "customer";
}

export function scopedPath(path) {
  return prefix === "customer" ? path : String(path).replace(SCOPED, `/${prefix}/$1/`);
}

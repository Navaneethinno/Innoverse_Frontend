// Existing UI hover text is maintained here. This is intentionally static:
// tooltip labels do not load from APIs or other runtime data sources.
export const UI_TOOLTIP_TEXT = {
  "User Management": "User Management",
  Users: "Users",
  Profiles: "Profiles",
  Institution: "Institution",
  Institutions: "Institutions",
  "Institution Profile": "Institution Profile",
  InnoRisk: "InnoRisk",
  Settings: "Settings",
  "Black Listing": "Black Listing",
  "Select module": "Select module",
  "Expand sidebar": "Expand sidebar",
  "Collapse sidebar": "Collapse sidebar",
  View: "View",
  Edit: "Edit",
  Audit: "Audit",
  Authorize: "Authorize",
  Deauthorize: "Deauthorize",
  Delete: "Delete",
  Deactivate: "Deactivate",
  Reactivate: "Reactivate",
  "Submit Draft": "Submit Draft",
  "Add user": "Add user",
  "New profile": "New profile",
  "Copy to clipboard": "Copy to clipboard",
  "Copied!": "Copied!",
  "Keyboard shortcuts (Ctrl/Cmd + K)": "Keyboard shortcuts (Ctrl/Cmd + K)",
  "Switch to light mode": "Switch to light mode",
  "Switch to dark mode": "Switch to dark mode",
  "Toggle Sidebar": "Toggle Sidebar",
};

export function getUiTooltipText(label) {
  const value = String(label ?? "").trim();
  if (!value) return undefined;

  const configuredKey = Object.keys(UI_TOOLTIP_TEXT).find(
    (key) => key.toLowerCase() === value.toLowerCase(),
  );
  return configuredKey ? UI_TOOLTIP_TEXT[configuredKey] : value;
}

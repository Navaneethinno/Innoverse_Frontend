import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Access comes from the backend's menu_array and `actions` flags only. These
// checks read the source, so a new screen that saves without asking, or that
// decides access from a role itself, fails here before it ships.
const ROOT = path.resolve("src/Components");
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.jsx$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
const sources = files(ROOT).map((file) => ({ file: path.relative(ROOT, file).replaceAll("\\", "/"), text: readFileSync(file, "utf8") }));

const WRITES = /\b\w*[aA]pi(?:\.\w+)*\.(add|edit|delete|auth|deauth|deactivate|reactivate|submit|cancel|release)\(/;
const ASKS = /usePagePermission|useMenuPermission|usePartyMenuPermission|LifecycleList|getMakerCheckerButtons|\.actions\b|actions\?\.|\bcan\w*\b/;

// Forms and panels opened only by a parent screen that has already asked.
// Adding one here means checking that parent first.
const OPENED_BY_A_CHECKED_SCREEN = [
  "Epurse/Customers/StaffOnboardingWizard.jsx",
  "Epurse/Settings/FormBuilder/DefinitionFormWizard.jsx",
  "Finance/Loans/Applications/ApplicationForm.jsx",
  "Finance/Settings/DepositProducts/DepositProductWizard.jsx",
  "Finance/Settings/LoanProducts/LoanProductWizard.jsx",
  "GlobalSettings/DigitalProducts/AddDigitalProductWizard.jsx",
  "GlobalSettings/Limits/LimitRulesEditor.jsx",
  "GlobalSettings/Notifications/NotificationAlerts/NotificationAlertForm.jsx",
  "Institution/Profile/InstitutionWizard.jsx",
];

describe("permissions", () => {
  it("every screen that saves asks the backend's permissions", () => {
    const missing = sources
      .filter(({ file, text }) => WRITES.test(text) && !ASKS.test(text) && !OPENED_BY_A_CHECKED_SCREEN.includes(file))
      .map(({ file }) => file);
    expect(missing).toEqual([]);
  });

  it("no screen decides access from a role name of its own", () => {
    const derived = /\b(role_name|profile_name|user_type|userType|is_admin|isAdmin|isSuperAdmin)\b\s*(===|!==)|["']SuperAdmin\d?["']/;
    expect(sources.filter(({ text }) => derived.test(text)).map(({ file }) => file)).toEqual([]);
  });
});

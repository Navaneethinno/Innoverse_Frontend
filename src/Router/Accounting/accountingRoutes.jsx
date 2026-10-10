import { lazy } from "react";
import { pageElement } from "../routeSupport";

// ACCOUNTING (module 12): Chart of Accounts (213), GL Mapping (214),
// Manual Journal (215), GL Reports (216).
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const PAGES = {
  chartofaccounts: page(() => import("@/Components/Accounting/ChartOfAccounts.jsx"), "ChartOfAccounts"),
  glmapping: page(() => import("@/Components/Accounting/GlMapping.jsx"), "GlMapping"),
  manualjournal: page(() => import("@/Components/Accounting/ManualJournal.jsx"), "ManualJournal"),
  glreports: page(() => import("@/Components/Accounting/GlReports.jsx"), "GlReports"),
};

export const accountingRoutes = Object.entries(PAGES).map(([path, Page]) => ({ path, element: pageElement(Page) }));

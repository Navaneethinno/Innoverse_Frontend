import { lazy } from "react";
import { pageElement } from "../routeSupport";

// ACCOUNTING (module 12): Chart of Accounts (213), GL Mapping (214),
// Manual Journal (215), GL Reports (216).
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const PAGES = {
  chartofaccounts: page(() => import("@/Components/Finance/Settings/ChartOfAccounts.jsx"), "ChartOfAccounts"),
  glmapping: page(() => import("@/Components/Finance/Settings/GlMapping.jsx"), "GlMapping"),
  manualjournal: page(() => import("@/Components/Finance/ManualJournal.jsx"), "ManualJournal"),
  glreports: page(() => import("@/Components/Finance/GlReports.jsx"), "GlReports"),
  // Core Banking (FINANCE): Core Banking Setup (193), Accounting Periods (195), Teller (196).
  corebankingsetup: page(() => import("@/Components/Finance/Settings/CoreBanking/CoreBankingSetup.jsx"), "CoreBankingSetup"),
  accountingperiods: page(() => import("@/Components/Finance/Settings/CoreBanking/AccountingPeriods.jsx"), "AccountingPeriods"),
  teller: page(() => import("@/Components/Finance/Teller/Teller.jsx"), "Teller"),
};

export const accountingRoutes = Object.entries(PAGES).map(([path, Page]) => ({ path, element: pageElement(Page) }));

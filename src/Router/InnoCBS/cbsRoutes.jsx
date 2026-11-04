import { lazy } from "react";
import { pageElement } from "../routeSupport";

// InnoCBS: the setup's sections (Settings), Teller (196), Borrower Groups (194), Treasury (201).
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const PAGES = {
  branches: page(() => import("@/Components/InnoCBS/Settings/Branches.jsx"), "Branches"),
  branchstaff: page(() => import("@/Components/InnoCBS/Settings/BranchStaff.jsx"), "BranchStaff"),
  withholdingtax: page(() => import("@/Components/InnoCBS/Settings/WithholdingTax.jsx"), "WithholdingTax"),
  expectedcreditloss: page(() => import("@/Components/InnoCBS/Settings/ExpectedCreditLoss.jsx"), "ExpectedCreditLoss"),
  creditbureau: page(() => import("@/Components/InnoCBS/Settings/CreditBureau.jsx"), "CreditBureau"),
  treasurysettings: page(() => import("@/Components/InnoCBS/Settings/TreasurySettings.jsx"), "TreasurySettings"),
  tellersettings: page(() => import("@/Components/InnoCBS/Settings/TellerSettings.jsx"), "TellerSettings"),
  teller: page(() => import("@/Components/InnoCBS/Teller/Teller.jsx"), "Teller"),
  borrowergroups: page(() => import("@/Components/InnoCBS/Loans/Groups/BorrowerGroups.jsx"), "BorrowerGroups"),
  treasury: page(() => import("@/Components/InnoCBS/Treasury/Treasury.jsx"), "Treasury"),
};

export const cbsRoutes = Object.entries(PAGES).map(([path, Page]) => ({ path, element: pageElement(Page) }));

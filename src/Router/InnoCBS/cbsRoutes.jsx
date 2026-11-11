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
  // Interest Rate Management (Admin 19).
  interestschemes: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "InterestSchemes"),
  agecategories: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "AgeCategories"),
  customerparameters: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "CustomerParameters"),
  benchmarkrates: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "BenchmarkRates"),
  interestrateconfiguration: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "InterestRateConfiguration"),
  productinterestmapping: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "ProductInterestMapping"),
  interestrateapproval: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "InterestRateApproval"),
  interestsimulation: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "InterestSimulation"),
  accountinterestinquiry: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "AccountInterestInquiry"),
  interestratehistory: page(() => import("@/Components/InnoCBS/Interest/Interest.jsx"), "InterestRateHistory"),
};

export const cbsRoutes = Object.entries(PAGES).map(([path, Page]) => ({ path, element: pageElement(Page) }));

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
  // Deposits (Admin 20).
  recurringdepositproducts: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "RecurringDepositProducts"),
  islamicdepositproducts: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "IslamicDepositProducts"),
  depositproductrules: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "DepositProductRules"),
  depositcharges: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "DepositCharges"),
  prematureclosurerules: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "PrematureClosureRules"),
  noticedepositterms: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "NoticeDepositTerms"),
  groupsavingsschemes: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "GroupSavingsSchemes"),
  depositinsurance: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "DepositInsurance"),
  "sweep&flexideposits": page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "SweepFlexiDeposits"),
  accountmandates: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "AccountMandates"),
  depositortaxprofiles: page(() => import("@/Components/InnoCBS/Deposits/DepositSettings.jsx"), "DepositorTaxProfiles"),
  recurringdeposits: page(() => import("@/Components/InnoCBS/Deposits/DepositOps.jsx"), "RecurringDeposits"),
  noticedeposits: page(() => import("@/Components/InnoCBS/Deposits/DepositOps.jsx"), "NoticeDeposits"),
  savingsgroups: page(() => import("@/Components/InnoCBS/Deposits/DepositOps.jsx"), "SavingsGroups"),
  profitdistribution: page(() => import("@/Components/InnoCBS/Deposits/DepositOps.jsx"), "ProfitDistribution"),
  depositreports: page(() => import("@/Components/InnoCBS/Deposits/DepositOps.jsx"), "DepositReports"),
};

export const cbsRoutes = Object.entries(PAGES).map(([path, Page]) => ({ path, element: pageElement(Page) }));

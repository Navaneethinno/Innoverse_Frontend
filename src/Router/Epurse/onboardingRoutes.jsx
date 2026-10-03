import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { pageElement } from "../routeSupport";

// "Frontend fixes — onboarding menus and corporate masters", 2026-09,
// fixes 1-2: ONE "Onboarding Configuration" menu (path onboardingconfiguration)
// and ONE "Onboarding Wizard" menu (path onboardingwizard) — individual and
// corporate share the same page behind an Individual|Corporate switch
// (OnboardingConfiguration/OnboardingWizard), kept in ?type=. The
// separate corporate menus/pages are gone; old corporate-only links redirect
// to the unified page with ?type=corporate instead of 404ing or staying
// pages of their own.
const OnboardingConfigHub = lazy(() =>
  import("@/Components/Epurse/Onboarding/OnboardingConfiguration/OnboardingConfiguration.jsx").then((m) => ({ default: m.OnboardingConfiguration })),
);
const OnboardingWizard = lazy(() =>
  import("@/Components/Epurse/Onboarding/OnboardingWizard/OnboardingWizard.jsx").then((m) => ({ default: m.OnboardingWizard })),
);

// The old `/customer/indv_profile/*` maker-checker list+wizard is gone —
// those endpoints 404 across the board. The sidebar's "Customer" menu item
// (slug "customer") now opens the real runtime onboarding work list from
// "Customer Onboarding (Individual) — Frontend Guide" (/customer/individual/*),
// via the same Individual|Corporate hub as "Onboarding Wizard" below.
export const onboardingRoutes = [
  { path: "customer", element: pageElement(OnboardingWizard) },
  { path: "customer/:id", element: pageElement(OnboardingWizard) },
];

// Sidebar menu "Onboarding Wizard" -> confirmed path "onboardingwizard"
// (+ the per-click uuid).
onboardingRoutes.push(
  { path: "onboardingwizard", element: pageElement(OnboardingWizard) },
  { path: "onboardingwizard/:id", element: pageElement(OnboardingWizard) },
);

// Sidebar menu "Onboarding Configuration" -> confirmed path
// "onboardingconfiguration" (+ the per-click uuid). The CONFIGURATION entry
// point (customer types and their maker-checker state), not the
// customer-facing onboarding itself.
onboardingRoutes.push(
  { path: "onboardingconfiguration", element: pageElement(OnboardingConfigHub) },
  { path: "onboardingconfiguration/:id", element: pageElement(OnboardingConfigHub) },
);

// Onboarding form builder: the institution's field library and sections
// (menus "Form Fields" / "Form Sections", customers and merchants).
const FormFields = lazy(() => import("@/Components/Epurse/Onboarding/FormBuilder/FormFields.jsx").then((m) => ({ default: m.FormFields })));
const FormSections = lazy(() => import("@/Components/Epurse/Onboarding/FormBuilder/FormSections.jsx").then((m) => ({ default: m.FormSections })));
onboardingRoutes.push(
  { path: "formfields", element: pageElement(FormFields) },
  { path: "formfields/:id", element: pageElement(FormFields) },
  { path: "formsections", element: pageElement(FormSections) },
  { path: "formsections/:id", element: pageElement(FormSections) },
);

// EPURSE > Accounts (menu 178): customers' and merchants' accounts, read only.
const Accounts = lazy(() => import("@/Components/Epurse/Accounts/Accounts.jsx").then((m) => ({ default: m.Accounts })));
onboardingRoutes.push({ path: "accounts", element: pageElement(Accounts) }, { path: "accounts/:id", element: pageElement(Accounts) });

// CASE MANAGEMENT > Onboarding Cases (menu 179).
const OnboardingCases = lazy(() => import("@/Components/CaseManagement/OnboardingCases/OnboardingCases.jsx").then((m) => ({ default: m.OnboardingCases })));
onboardingRoutes.push({ path: "onboardingcases", element: pageElement(OnboardingCases) }, { path: "onboardingcases/:id", element: pageElement(OnboardingCases) });

// Term Deposits (Admin Portal: Term Deposits handoff): TERM DEPOSITS >
// Deposit Products (180) and Deposits (181), EPURSE > Balance Adjustments
// (182), GLOBAL SETTINGS > Scheduled Jobs (183).
const DepositProducts = lazy(() => import("@/Components/TermDeposits/DepositProducts/DepositProducts.jsx").then((m) => ({ default: m.DepositProducts })));
const Deposits = lazy(() => import("@/Components/TermDeposits/Deposits/Deposits.jsx").then((m) => ({ default: m.Deposits })));
const BalanceAdjustments = lazy(() => import("@/Components/TermDeposits/BalanceAdjustments/BalanceAdjustments.jsx").then((m) => ({ default: m.BalanceAdjustments })));
const ScheduledJobs = lazy(() => import("@/Components/TermDeposits/ScheduledJobs/ScheduledJobs.jsx").then((m) => ({ default: m.ScheduledJobs })));
onboardingRoutes.push(
  ...Object.entries({ depositproducts: DepositProducts, deposits: Deposits, balanceadjustments: BalanceAdjustments, scheduledjobs: ScheduledJobs }).flatMap(([path, Page]) => [
    { path, element: pageElement(Page) },
    { path: `${path}/:id`, element: pageElement(Page) },
  ]),
);

// Loans (Admin Portal: Loans handoff), module LOANS: Loan Products (184),
// Lending Regulatory Profile (185), Loan Applications (186), Loan
// Facilities (187), Regulatory Submissions (188).
const LoanProducts = lazy(() => import("@/Components/Loans/LoanProducts/LoanProducts.jsx").then((m) => ({ default: m.LoanProducts })));
const RegulatoryProfile = lazy(() => import("@/Components/Loans/RegulatoryProfile/RegulatoryProfile.jsx").then((m) => ({ default: m.RegulatoryProfile })));
const LoanApplications = lazy(() => import("@/Components/Loans/Applications/LoanApplications.jsx").then((m) => ({ default: m.LoanApplications })));
const LoanFacilities = lazy(() => import("@/Components/Loans/Facilities/LoanFacilities.jsx").then((m) => ({ default: m.LoanFacilities })));
const RegulatorySubmissions = lazy(() => import("@/Components/Loans/Submissions/RegulatorySubmissions.jsx").then((m) => ({ default: m.RegulatorySubmissions })));
onboardingRoutes.push(
  ...Object.entries({ loanproducts: LoanProducts, lendingregulatoryprofile: RegulatoryProfile, loanapplications: LoanApplications, loanfacilities: LoanFacilities, regulatorysubmissions: RegulatorySubmissions }).flatMap(([path, Page]) => [
    { path, element: pageElement(Page) },
    { path: `${path}/:id`, element: pageElement(Page) },
  ]),
);

// CARDS (Card setup handoff): Card BINs (195), Card Products (196),
// Issuance Groups (197).
const cardPage = (name) => lazy(() => import("@/Components/Cards/CardPages.jsx").then((m) => ({ default: m[name] })));
onboardingRoutes.push(
  ...Object.entries({ cardbins: cardPage("CardBins"), cardproducts: cardPage("CardProducts"), issuancegroups: cardPage("IssuanceGroups") }).flatMap(([path, Page]) => [
    { path, element: pageElement(Page) },
    { path: `${path}/:id`, element: pageElement(Page) },
  ]),
);

// EPURSE > Transactions (menu 189): the journal and staff requests.
const Transactions = lazy(() => import("@/Components/Transactions/Transactions.jsx").then((m) => ({ default: m.Transactions })));
onboardingRoutes.push({ path: "transactions", element: pageElement(Transactions) }, { path: "transactions/:id", element: pageElement(Transactions) });

// Old corporate-only links (this app's own earlier best-guess slugs, since
// the real menu names weren't confirmed yet at the time) now redirect into
// the unified pages with ?type=corporate rather than staying separate pages
// — fix 1/2 explicitly call out keeping /corporateonboardingconfiguration
// as exactly this kind of redirect so old links still work; the others
// below are this app's own prior guesses getting the same treatment for
// consistency, not routes the fix document itself names.
const redirectToCorporate = (to) => <Navigate to={`${to}?type=corporate`} replace />;
// Sidebar links always carry a trailing /<uuid>, so an old bookmark is
// /corporateonboardingconfiguration/<uuid> — register the :id form too.
const corporateRedirects = {
  corporateonboardingconfiguration: "/onboardingconfiguration",
  corporatecustomertypes: "/onboardingconfiguration",
  corporatecustomertype: "/onboardingconfiguration",
  corporateonboardingdefinition: "/onboardingconfiguration",
  corporateonboardingwizard: "/onboardingwizard",
  corporatecustomer: "/onboardingwizard",
};
onboardingRoutes.push(
  ...Object.entries(corporateRedirects).flatMap(([path, to]) => [
    { path, element: redirectToCorporate(to) },
    { path: `${path}/:id`, element: redirectToCorporate(to) },
  ]),
);

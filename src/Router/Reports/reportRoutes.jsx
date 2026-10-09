import { lazy } from "react";
import { pageElement } from "../routeSupport";

// Reports (read-only). Slugs are the menu names, as everywhere else.
const UserActivity = lazy(() => import("@/Components/Reports/UserActivity").then((m) => ({ default: m.UserActivity })));
const AMLScoreBreakdown = lazy(() => import("@/Components/Reports/AMLScoreBreakdown").then((m) => ({ default: m.AMLScoreBreakdown })));
const RiskScoreBreakdown = lazy(() => import("@/Components/Reports/RiskScoreBreakdown").then((m) => ({ default: m.RiskScoreBreakdown })));

// Report Builder (211) and Saved Reports (212).
const REPORTS = {
  reportbuilder: lazy(() => import("@/Components/Reports/Builder/ReportBuilder.jsx").then((m) => ({ default: m.ReportBuilder }))),
  savedreports: lazy(() => import("@/Components/Reports/Builder/SavedReports.jsx").then((m) => ({ default: m.SavedReports }))),
  // KYC Report (group 204): Customer (206) and Merchant (205).
  customerkycreport: lazy(() => import("@/Components/Reports/KycReport/KycReport.jsx").then((m) => ({ default: m.CustomerKycReport }))),
  merchantkycreport: lazy(() => import("@/Components/Reports/KycReport/KycReport.jsx").then((m) => ({ default: m.MerchantKycReport }))),
};

export const reportRoutes = [
  ...Object.entries(REPORTS).flatMap(([path, Page]) => [
    { path, element: pageElement(Page) },
    { path: `${path}/:id`, element: pageElement(Page) },
  ]),
  { path: "useractivity", element: pageElement(UserActivity) }, // Reports > User Activity (menu 106)
  { path: "useractivity/:id", element: pageElement(UserActivity) },
  { path: "riskscorebreakdown", element: pageElement(RiskScoreBreakdown) }, // Reports > Risk Score Breakdown (menu 107)
  { path: "riskscorebreakdown/:id", element: pageElement(RiskScoreBreakdown) },
  { path: "amlscorebreakdown", element: pageElement(AMLScoreBreakdown) }, // Reports > AML Score Breakdown (menu 108)
  { path: "amlscorebreakdown/:id", element: pageElement(AMLScoreBreakdown) },
];

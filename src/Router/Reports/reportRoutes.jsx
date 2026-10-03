import { lazy } from "react";
import { pageElement } from "../routeSupport";

// Reports (read-only). Slugs are the menu names, as everywhere else.
const UserActivity = lazy(() => import("@/Components/Reports/UserActivity").then((m) => ({ default: m.UserActivity })));
const AMLScoreBreakdown = lazy(() => import("@/Components/Reports/AMLScoreBreakdown").then((m) => ({ default: m.AMLScoreBreakdown })));
const RiskScoreBreakdown = lazy(() => import("@/Components/Reports/RiskScoreBreakdown").then((m) => ({ default: m.RiskScoreBreakdown })));

// Transaction reports (menus 191-194).
const txnReport = (name) => lazy(() => import("@/Components/Reports/Transactions/TxnReports.jsx").then((m) => ({ default: m[name] })));
const TXN_REPORTS = { transactionsummary: txnReport("TransactionSummary"), feeincome: txnReport("FeeIncome"), failedtransactions: txnReport("FailedTransactions"), reversals: txnReport("Reversals") };

export const reportRoutes = [
  ...Object.entries(TXN_REPORTS).flatMap(([path, Page]) => [
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

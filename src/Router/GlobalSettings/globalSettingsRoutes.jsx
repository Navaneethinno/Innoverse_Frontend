import { lazy } from "react";
import { pageElement } from "../routeSupport";

// GLOBAL SETTINGS > Limit: limit groups, their rules and members.
const LimitGroups = lazy(() => import("@/Components/GlobalSettings/Limits/LimitGroups.jsx").then((m) => ({ default: m.LimitGroups })));

// GLOBAL SETTINGS > Fee Schedules (menu 190).
const FeeSchedules = lazy(() => import("@/Components/GlobalSettings/FeeSchedules/FeeSchedules.jsx").then((m) => ({ default: m.FeeSchedules })));

// GLOBAL SETTINGS > External Providers (menu 210).
const ExtProviders = lazy(() => import("@/Components/GlobalSettings/ExternalProviders/ExtProviders.jsx").then((m) => ({ default: m.ExtProviders })));

// GLOBAL SETTINGS > Transaction Routing (menu 192).
const TransactionRouting = lazy(() => import("@/Components/GlobalSettings/Routing/TransactionRouting.jsx").then((m) => ({ default: m.TransactionRouting })));

// GLOBAL SETTINGS > Expiry Rules (menu 197).
const ExpiryRules = lazy(() => import("@/Components/GlobalSettings/ExpiryRules/ExpiryRules.jsx").then((m) => ({ default: m.ExpiryRules })));

// GLOBAL SETTINGS > Approval Policies (menu 202) and Approval Delegations (203).
const ApprovalPolicies = lazy(() => import("@/Components/GlobalSettings/Approvals/ApprovalPolicies.jsx").then((m) => ({ default: m.ApprovalPolicies })));
const ApprovalDelegations = lazy(() => import("@/Components/GlobalSettings/Approvals/ApprovalDelegations.jsx").then((m) => ({ default: m.ApprovalDelegations })));

export const globalSettingsRoutes = [
  { path: "approvalpolicies", element: pageElement(ApprovalPolicies) },
  { path: "approvalpolicies/:id", element: pageElement(ApprovalPolicies) },
  { path: "approvaldelegations", element: pageElement(ApprovalDelegations) },
  { path: "approvaldelegations/:id", element: pageElement(ApprovalDelegations) },
  { path: "expiryrules", element: pageElement(ExpiryRules) },
  { path: "feeschedules", element: pageElement(FeeSchedules) },
  { path: "feeschedules/:id", element: pageElement(FeeSchedules) },
  { path: "externalproviders", element: pageElement(ExtProviders) },
  { path: "externalproviders/:id", element: pageElement(ExtProviders) },
  { path: "transactionrouting", element: pageElement(TransactionRouting) },
  { path: "limit", element: pageElement(LimitGroups) },
  { path: "limit/:id", element: pageElement(LimitGroups) },
];

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

// GLOBAL SETTINGS > App Versions (menu 218).
const AppVersions = lazy(() => import("@/Components/GlobalSettings/AppVersions/AppVersions.jsx").then((m) => ({ default: m.AppVersions })));

// GLOBAL SETTINGS > Approval Policies (menu 202) and Approval Delegations (203).
const ApprovalPolicies = lazy(() => import("@/Components/GlobalSettings/Approvals/ApprovalPolicies.jsx").then((m) => ({ default: m.ApprovalPolicies })));
const ApprovalDelegations = lazy(() => import("@/Components/GlobalSettings/Approvals/ApprovalDelegations.jsx").then((m) => ({ default: m.ApprovalDelegations })));

// GLOBAL SETTINGS > Request Money & QR (220), Payment Requests (221), Device
// Security (224), Bound Devices (225), Guest Payments (244), Partner API (261).
const RequestMoney = lazy(() => import("@/Components/GlobalSettings/PaysePay/RequestMoney.jsx").then((m) => ({ default: m.RequestMoney })));
const PaymentRequests = lazy(() => import("@/Components/GlobalSettings/PaysePay/PaymentRequests.jsx").then((m) => ({ default: m.PaymentRequests })));
const DeviceSecurity = lazy(() => import("@/Components/GlobalSettings/PaysePay/DeviceSecurity.jsx").then((m) => ({ default: m.DeviceSecurity })));
const BoundDevices = lazy(() => import("@/Components/GlobalSettings/PaysePay/BoundDevices.jsx").then((m) => ({ default: m.BoundDevices })));
const GuestPayments = lazy(() => import("@/Components/GlobalSettings/PaysePay/GuestPayments.jsx").then((m) => ({ default: m.GuestPayments })));
const PartnerApi = lazy(() => import("@/Components/GlobalSettings/PaysePay/PartnerApi.jsx").then((m) => ({ default: m.PartnerApi })));

// GLOBAL SETTINGS > Campaigns (menu 248) and EPURSE > Campaigns (226,
// rewards): one slug, the menu picks the page.
const CampaignsMenu = lazy(() => import("@/Components/Campaigns/CampaignsMenu.jsx").then((m) => ({ default: m.CampaignsMenu })));
// EPURSE rewards: Rewards Campaigns (226), Loyalty & Referral (227), Vouchers (228), Rewards Report (229).
const RewardsCampaigns = lazy(() => import("@/Components/Campaigns/RewardsCampaigns.jsx").then((m) => ({ default: m.RewardsCampaigns })));
const LoyaltyReferral = lazy(() => import("@/Components/Campaigns/LoyaltyReferral.jsx").then((m) => ({ default: m.LoyaltyReferral })));
const Vouchers = lazy(() => import("@/Components/Campaigns/Vouchers.jsx").then((m) => ({ default: m.Vouchers })));
const RewardsReport = lazy(() => import("@/Components/Campaigns/RewardsReport.jsx").then((m) => ({ default: m.RewardsReport })));

export const globalSettingsRoutes = [
  { path: "campaigns", element: pageElement(CampaignsMenu) },
  { path: "rewardscampaigns", element: pageElement(RewardsCampaigns) },
  { path: "loyaltyreferral", element: pageElement(LoyaltyReferral) },
  { path: "vouchers", element: pageElement(Vouchers) },
  { path: "rewardsreport", element: pageElement(RewardsReport) },
  { path: "requestmoneyqr", element: pageElement(RequestMoney) },
  { path: "paymentrequests", element: pageElement(PaymentRequests) },
  { path: "devicesecurity", element: pageElement(DeviceSecurity) },
  { path: "bounddevices", element: pageElement(BoundDevices) },
  { path: "guestpayments", element: pageElement(GuestPayments) },
  { path: "partnerapi", element: pageElement(PartnerApi) },
  { path: "appversions", element: pageElement(AppVersions) },
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

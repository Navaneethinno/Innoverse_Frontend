import { lazy } from "react";
import { pageElement } from "./routeSupport";

// Definitions now renders OnboardingConfigurationHub (Individual|Corporate
// switch), not the plain individual-only page — "Frontend fixes —
// onboarding menus and corporate masters", 2026-09, fix 1: there is ONE
// Onboarding Configuration menu/page, not a separate one per ownership
// type. The confirmed real path (onboardingconfiguration) is registered in
// customerRoutes.jsx; the guesses below are this app's own earlier
// best-guess aliases for the individual-flavored menu names, kept as
// aliases into the same unified hub (defaulting to Individual) rather than
// removed outright, in case any of them is actually still in use. The
// corporate-only slug guesses that used to point at a separate
// CorporateOnboardingConfigurationPage here now redirect to
// onboardingconfiguration?type=corporate instead — see customerRoutes.jsx.
const Definitions = lazy(() =>
  import("@/Components/OnboardingConfig/OnboardingConfigurationHub.jsx").then((m) => ({ default: m.OnboardingConfigurationHub })),
);
const Master = lazy(() => import("@/Components/OnboardingConfig/MasterResource.jsx").then((m) => ({ default: m.MasterResource })));
const KycSchemes = lazy(() => import("@/Components/OnboardingConfig/KycSchemePage.jsx").then((m) => ({ default: m.KycSchemePage })));

const slugs = {
  Definitions: ["customertypes", "customertype", "onboardingdefinition", "onboardingdefinitions"],
  KycSchemes: ["kycschemes", "kycscheme", "kycschemeconfig"],
};
const components = { Definitions, KycSchemes };
// Both screens open a specific record by id (Definitions' wizard, KycSchemes'
// own edit view via its "Add KYC scheme" shortcut from
// OnboardingConfigurationPage/OnboardingDefinitionWizard's FilterSelect) —
// needs the same `path` + `path/:id` pair masterSlugs registers below, or
// navigate(`/kycschemes/${id}`) 404s with no route matching the id segment.
export const onboardingConfigRoutes = Object.entries(slugs).flatMap(([name, paths]) =>
  paths.flatMap((path) => [
    { path, element: pageElement(components[name]) },
    { path: `${path}/:id`, element: pageElement(components[name]) },
  ]),
);

// Masters with extra fields (guide §5) on one schema-driven page. document_type
// lives here too (its purpose_id replaced the old category field).
const masterSlugs = {
  title: ["title", "titles"],
  kinship: ["kinship"],
  business_nature: ["businessnature", "business-nature"],
  annual_income_range: ["annualincomerange", "annual-income-range"],
  monthly_income_range: ["monthlyincomerange", "monthly-income-range"],
  net_worth_range: ["networthrange", "net-worth-range"],
  turnover_range: ["turnoverrange", "turnover-range"],
  risk_category: ["riskcategory", "risk-category"],
  validation_rule: ["validationrule", "validation-rule"],
  document_type: ["documenttype", "document-type"],
  // Corporate Onboarding Master (Corporate_Onboarding_Configuration_API.md
  // §2, 2026-09; slugs per "Frontend fixes — onboarding menus and corporate
  // masters", 2026-09, fix 3). "Address Type"/"Relationship Type"/
  // "Document Type"/"Business Nature" exist under BOTH the Individual and
  // Corporate Onboarding Master groups and share the exact menu_name —
  // MenuItem.jsx's buildMenuPathForItem now prefixes every direct child of
  // a "Corporate" parent menu with "corp" precisely to avoid this collision
  // (Individual keeps the plain slug). Every corp_ master gets its
  // corp-prefixed slug registered here regardless of whether its plain name
  // actually collides, since that prefixing is unconditional for any menu
  // under "Corporate" — the plain slugs stay registered too, so a direct/
  // bookmarked link to the old path still works.
  corp_company_type: ["corpcompanytype", "corp-company-type", "companytype", "company-type"],
  corp_address_type: ["corpaddresstype", "corp-address-type"],
  corp_relationship_type: ["corprelationshiptype", "corp-relationship-type"],
  corp_document_type: ["corpdocumenttype", "corp-document-type"],
  corp_identification_type: ["corpidentificationtype", "corp-identification-type", "identificationtype", "identification-type"],
  corp_tax_type: ["corptaxtype", "corp-tax-type", "taxtype", "tax-type"],
  corp_screening_type: ["corpscreeningtype", "corp-screening-type", "screeningtype", "screening-type"],
  corp_business_nature: ["corpbusinessnature", "corp-business-nature"],
  corp_industry_sector: ["corpindustrysector", "corp-industry-sector", "industrysector", "industry-sector"],
  corp_merchant_category: ["corpmerchantcategory", "corp-merchant-category", "merchantcategory", "merchant-category"],
  corp_merchant_group: ["corpmerchantgroup", "corp-merchant-group", "merchantgroup", "merchant-group"],
  corp_gst_registration_status: ["corpgstregistrationstatus", "corp-gst-registration-status", "gstregistrationstatus", "gst-registration-status"],
  corp_tax_exemption_status: ["corptaxexemptionstatus", "corp-tax-exemption-status", "taxexemptionstatus", "tax-exemption-status"],
  // Settings > Master (shared, not corp_-prefixed) — the settlement account
  // bank/branch masters.
  bank: ["bank", "banks"],
  bank_branch: ["bankbranch", "bank-branch"],
};
onboardingConfigRoutes.push(
  ...Object.entries(masterSlugs).flatMap(([entity, paths]) =>
    paths.flatMap((path) => [
      { path, element: pageElement(Master, { entity }) },
      { path: path + "/:id", element: pageElement(Master, { entity }) },
    ]),
  ),
);

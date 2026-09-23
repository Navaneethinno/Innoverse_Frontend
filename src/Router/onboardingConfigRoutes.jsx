import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Definitions = lazy(() =>
  import("@/Components/OnboardingConfig/OnboardingConfigurationPage.jsx").then((m) => ({ default: m.OnboardingConfigurationPage })),
);
const CorpDefinitions = lazy(() =>
  import("@/Components/OnboardingConfig/CorporateOnboardingConfigurationPage.jsx").then((m) => ({ default: m.CorporateOnboardingConfigurationPage })),
);
const Master = lazy(() => import("@/Components/OnboardingConfig/MasterResource.jsx").then((m) => ({ default: m.MasterResource })));
const KycSchemes = lazy(() => import("@/Components/OnboardingConfig/KycSchemePage.jsx").then((m) => ({ default: m.KycSchemePage })));

// Customer Onboarding Configuration screens (customer types, and KYC
// schemes). There is no separate "versions" screen any more — a customer
// type IS one maker-checker row (Onboarding_Configuration_API.md §8.1), so
// Definitions' own list carries the maker-checker actions directly. Each
// sidebar leaf's slug is slugifyMenuName(menu_name), and those menu names
// aren't confirmed yet, so each screen answers on a few plausible slugs.
const slugs = {
  Definitions: ["customertypes", "customertype", "onboardingdefinition", "onboardingdefinitions"],
  KycSchemes: ["kycschemes", "kycscheme", "kycschemeconfig"],
  // Corporate customer-type definitions (Corporate_Onboarding_Configuration_
  // API.md §4) — same "answer on a few plausible slugs" hedge as Definitions
  // above, since the real corporate menu_name isn't confirmed yet either.
  CorpDefinitions: ["corporatecustomertypes", "corporatecustomertype", "corporateonboardingdefinition", "corporateonboardingconfiguration"],
};
const components = { Definitions, KycSchemes, CorpDefinitions };
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
  // §2, 2026-09). "Address Type"/"Relationship Type"/"Document Type"/
  // "Business Nature" exist under BOTH the Individual and Corporate
  // Onboarding Master groups — if the backend sends the exact same
  // menu_name for both, slugifyMenuName collides and only one can win a
  // given slug. Individual already owns the plain slug above (established
  // first); these four get "corp"-prefixed slugs as their best-guess
  // fallback pending the real sidebar menu_name strings.
  corp_company_type: ["companytype", "company-type"],
  corp_address_type: ["corpaddresstype", "corp-address-type"],
  corp_relationship_type: ["corprelationshiptype", "corp-relationship-type"],
  corp_document_type: ["corpdocumenttype", "corp-document-type"],
  corp_identification_type: ["identificationtype", "identification-type"],
  corp_tax_type: ["taxtype", "tax-type"],
  corp_screening_type: ["screeningtype", "screening-type"],
  corp_business_nature: ["corpbusinessnature", "corp-business-nature"],
  corp_industry_sector: ["industrysector", "industry-sector"],
  corp_merchant_category: ["merchantcategory", "merchant-category"],
  corp_merchant_group: ["merchantgroup", "merchant-group"],
  corp_gst_registration_status: ["gstregistrationstatus", "gst-registration-status"],
  corp_tax_exemption_status: ["taxexemptionstatus", "tax-exemption-status"],
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

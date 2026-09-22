import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Definitions = lazy(() =>
  import("@/Components/OnboardingConfig/OnboardingConfigurationPage.jsx").then((m) => ({ default: m.OnboardingConfigurationPage })),
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
};
const components = { Definitions, KycSchemes };
export const onboardingConfigRoutes = Object.entries(slugs).flatMap(([name, paths]) =>
  paths.map((path) => ({ path, element: pageElement(components[name]) })),
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
};
onboardingConfigRoutes.push(
  ...Object.entries(masterSlugs).flatMap(([entity, paths]) =>
    paths.flatMap((path) => [
      { path, element: pageElement(Master, { entity }) },
      { path: path + "/:id", element: pageElement(Master, { entity }) },
    ]),
  ),
);

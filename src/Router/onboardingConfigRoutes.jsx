import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Definitions = lazy(() =>
  import("@/Components/OnboardingConfig/OnboardingDefinitionPage.jsx").then((m) => ({ default: m.OnboardingDefinitionPage })),
);
const Versions = lazy(() =>
  import("@/Components/OnboardingConfig/OnboardingVersionPage.jsx").then((m) => ({ default: m.OnboardingVersionPage })),
);
const KycSchemes = lazy(() => import("@/Components/OnboardingConfig/KycSchemePage.jsx").then((m) => ({ default: m.KycSchemePage })));

// Customer Onboarding Configuration screens (customer types + their
// versions, and KYC schemes). Each sidebar leaf's slug is
// slugifyMenuName(menu_name), and those menu names aren't confirmed yet, so
// each screen answers on a few plausible slugs.
const slugs = {
  Definitions: ["customertypes", "customertype", "onboardingdefinition", "onboardingdefinitions"],
  Versions: ["onboardingversions", "onboardingversion", "customertypeversions"],
  KycSchemes: ["kycschemes", "kycscheme", "kycschemeconfig"],
};
const components = { Definitions, Versions, KycSchemes };
export const onboardingConfigRoutes = Object.entries(slugs).flatMap(([name, paths]) =>
  paths.map((path) => ({ path, element: pageElement(components[name]) })),
);

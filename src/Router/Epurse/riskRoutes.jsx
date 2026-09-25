import { lazy } from "react";
import { pageElement } from "../routeSupport";

// EPURSE > Risk Assessment.
const IndividualRisk = lazy(() =>
  import("@/Components/Epurse/RiskAssessment").then((m) => ({ default: m.IndividualRisk })),
);
const CorporateRisk = lazy(() =>
  import("@/Components/Epurse/RiskAssessment").then((m) => ({ default: m.CorporateRisk })),
);

export const riskRoutes = [
  { path: "individualrisk", element: pageElement(IndividualRisk) },
  { path: "individualrisk/:id", element: pageElement(IndividualRisk) },
  { path: "corporaterisk", element: pageElement(CorporateRisk) },
  { path: "corporaterisk/:id", element: pageElement(CorporateRisk) },
];

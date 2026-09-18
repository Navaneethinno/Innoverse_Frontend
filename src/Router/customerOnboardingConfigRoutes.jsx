import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Resource = lazy(() =>
  import("@/Components/Config/CustomerOnboardingConfigResource.jsx").then((module) => ({ default: module.CustomerOnboardingConfigResource })),
);

// Individual Customer Onboarding Configuration (2026-09) — confirmed live
// against a real sidebar: 6 leaves under a "Customer" parent group (menu
// header, non-clickable — see MenuItem.jsx's hasChildren behavior), each
// slug = slugifyMenuName(menu_name) of the exact labels shown there
// (Individual/Identification/Address Type Config, Employment Config,
// Document Requirement Config, Document Type Config). The 7th entity from
// the API doc, the global master_config/document_type list ("Document Type
// (Master)"), is NOT one of these 6 sidebar leaves — no confirmed menu_name
// or slug for it yet, so no route is registered for it (CustomerOnboarding-
// ConfigResource.jsx still supports entity="document_type" for whenever one
// is confirmed; indv_document_type_config's own document_type_id dropdown
// works regardless, via documentTypeApi.getActive() directly).
const paths = [
  "individualtypeconfig",
  "identificationtypeconfig",
  "addresstypeconfig",
  "employmentconfig",
  "documentrequirementconfig",
  "documenttypeconfig",
];
const entities = [
  "indv_type_config",
  "indv_identification_type",
  "indv_address_type",
  "indv_employment_config",
  "indv_document_requirement_config",
  "indv_document_type_config",
];
export const customerOnboardingConfigRoutes = paths.flatMap((path, index) => [
  { path, element: pageElement(Resource, { entity: entities[index] }) },
  { path: `${path}/:id`, element: pageElement(Resource, { entity: entities[index] }) },
]);

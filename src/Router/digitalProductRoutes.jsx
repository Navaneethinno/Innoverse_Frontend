import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { pageElement } from "./routeSupport";
const Resource = lazy(() => import("@/Components/Epurse/DigitalProduct/DigitalProduct/DigitalProduct.jsx").then((m) => ({ default: m.DigitalProduct })));
// Confirmed against a real /user/login menu_array: the "product" entity's
// own menu_name is literally "Digital Product" (menu_id 31, a child of the
// top-level "Digital Product" folder, menu_id 30 — same name, different
// menu_id) -> slug "digitalproduct". Earlier assumed this collided with
// Account's own product entity (thought to be named bare "Product"), but
// that one's real name is "Account Product" -> "accountproduct" — the two
// were never actually the same slug, just similar-looking truncated
// sidebar labels.
//
// Only the product itself has routes on the server
// (/config/digital_product/product/*). Security, KYC, channel, eligibility
// and residency settings are sections of that one record, edited in the
// product wizard — their old standalone menu slugs now open the Digital
// Product page instead of a list that could only 404.
const SECTION_SLUGS = ["productmap", "securityconfig", "kycconfig", "kyclevel", "channelconfig", "channeltransaction", "eligibilityconfig", "residency"];
const toProduct = <Navigate to="/digitalproduct" replace />;
export const digitalProductRoutes = [
  { path: "digitalproduct", element: pageElement(Resource, { entity: "product" }) },
  { path: "digitalproduct/:id", element: pageElement(Resource, { entity: "product" }) },
  ...SECTION_SLUGS.flatMap((path) => [
    { path, element: toProduct },
    { path: `${path}/:id`, element: toProduct },
  ]),
];

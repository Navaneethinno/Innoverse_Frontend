import { lazy } from "react";
import { pageElement } from "./routeSupport";
const Resource = lazy(() => import("@/Components/DigitalProduct/DigitalProductResource.jsx").then((m) => ({ default: m.DigitalProductResource })));
const names = ["product", "productmap", "securityconfig", "kycconfig", "kyclevel", "channelconfig", "channeltransaction", "eligibilityconfig", "residency"];
const entities = ["product", "product_map", "security_config", "kyc_config", "kyc_level", "channel_config", "channel_transaction", "eligibility_config", "residency"];
export const digitalProductRoutes = names.flatMap((path, index) => [{ path, element: pageElement(Resource, { entity: entities[index] }) }, { path: `${path}/:id`, element: pageElement(Resource, { entity: entities[index] }) }]);

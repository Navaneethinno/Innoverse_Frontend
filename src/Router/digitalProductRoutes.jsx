import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Renders the horizontal Digital Product workflow (stepper + the existing
// DigitalProductResource for the active step) instead of the bare resource
// directly — see DigitalProductWorkflow.jsx. Every route path/entity below
// is unchanged from before that workflow existed, so existing deep links
// keep resolving exactly as they did.
const Workflow = lazy(() => import("@/Components/DigitalProduct/DigitalProductWorkflow.jsx").then((m) => ({ default: m.DigitalProductWorkflow })));
// Confirmed against a real /user/login menu_array: the "product" entity's
// own menu_name is literally "Digital Product" (menu_id 31, a child of the
// top-level "Digital Product" folder, menu_id 30 — same name, different
// menu_id) -> slug "digitalproduct". Earlier assumed this collided with
// Account's own product entity (thought to be named bare "Product"), but
// that one's real name is "Account Product" -> "accountproduct" — the two
// were never actually the same slug, just similar-looking truncated
// sidebar labels.
const names = ["digitalproduct", "productmap", "securityconfig", "kycconfig", "kyclevel", "channelconfig", "channeltransaction", "eligibilityconfig", "residency"];
const entities = ["product", "product_map", "security_config", "kyc_config", "kyc_level", "channel_config", "channel_transaction", "eligibility_config", "residency"];
export const digitalProductRoutes = names.flatMap((path, index) => [{ path, element: pageElement(Workflow, { entity: entities[index] }) }, { path: `${path}/:id`, element: pageElement(Workflow, { entity: entities[index] }) }]);

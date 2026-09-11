import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Resource = lazy(() => import("@/Components/Config/KycConfigResource.jsx").then((module) => ({ default: module.KycConfigResource })));
// Paths are parent-qualified ("kyc" + leaf menu name, see MenuItem.jsx's
// depth-2+ qualification) to match what the sidebar actually navigates to —
// these are all children of the "KYC" menu under Configuration, and "Group"
// alone would otherwise collide with nothing today but is inconsistent with
// its siblings and with how the sidebar builds the path.
const paths = ["kycgroup", "kycgrouplevel", "kycgroupleveldata", "kycgrouplevelprocess", "kycgroupleveldocument"];
const entities = ["kyc_group", "kyc_group_level", "kyc_group_level_data", "kyc_group_level_process", "kyc_group_level_document"];
export const configKycRoutes = paths.flatMap((path, index) => [{ path, element: pageElement(Resource, { entity: entities[index] }) }, { path: `${path}/:id`, element: pageElement(Resource, { entity: entities[index] }) }]);

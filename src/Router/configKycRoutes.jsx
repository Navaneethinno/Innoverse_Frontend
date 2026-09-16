import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Resource = lazy(() => import("@/Components/Config/KycConfigResource.jsx").then((module) => ({ default: module.KycConfigResource })));
// Bare slugs of each menu's own name (e.g. "Group Level" -> "grouplevel") —
// none of these names collide with anything elsewhere in the sidebar, so
// MenuItem.jsx's navigation leaves them unqualified. Only the sixth sibling
// under this same "KYC" parent, "Profile", collides with the top-level User
// Management > Profile menu and gets parent-qualified to "kycprofile" — see
// MenuItem.jsx's DISAMBIGUATE_BY_PARENT. That entity/route isn't known yet,
// so it isn't registered here.
const paths = ["group", "grouplevel", "groupleveldata", "grouplevelprocess", "groupleveldocument"];
const entities = ["kyc_group", "kyc_group_level", "kyc_group_level_data", "kyc_group_level_process", "kyc_group_level_document"];
export const configKycRoutes = paths.flatMap((path, index) => [{ path, element: pageElement(Resource, { entity: entities[index] }) }, { path: `${path}/:id`, element: pageElement(Resource, { entity: entities[index] }) }]);

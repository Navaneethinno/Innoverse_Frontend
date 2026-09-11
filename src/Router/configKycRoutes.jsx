import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Resource = lazy(() => import("@/Components/Config/KycConfigResource.jsx").then((module) => ({ default: module.KycConfigResource })));
const paths = ["kycgroup", "grouplevel", "groupleveldata", "grouplevelprocess", "groupleveldocument"];
const entities = ["kyc_group", "kyc_group_level", "kyc_group_level_data", "kyc_group_level_process", "kyc_group_level_document"];
export const configKycRoutes = paths.flatMap((path, index) => [{ path, element: pageElement(Resource, { entity: entities[index] }) }, { path: `${path}/:id`, element: pageElement(Resource, { entity: entities[index] }) }]);

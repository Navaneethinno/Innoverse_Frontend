import { lazy } from "react";
import { pageElement } from "./routeSupport";

const KycSchemes = lazy(() => import("@/Components/Epurse/Configuration/KYC/KycScheme/KycScheme.jsx").then((m) => ({ default: m.KycScheme })));
// The old KYC Group / Group Level / Level Data / Level Process / Level
// Document endpoints (/config/kyc_group*) no longer exist on the backend — a
// KYC scheme and all its levels are now one record edited whole via
// /config/kyc/group (see KycScheme.jsx). The existing sidebar slugs stay
// valid and all open the scheme screen, whose levels editor covers what the
// four child pages used to.
const paths = ["group", "grouplevel", "groupleveldata", "grouplevelprocess", "groupleveldocument"];
export const configKycRoutes = paths.flatMap((path) => [
  { path, element: pageElement(KycSchemes) },
  { path: `${path}/:id`, element: pageElement(KycSchemes) },
]);

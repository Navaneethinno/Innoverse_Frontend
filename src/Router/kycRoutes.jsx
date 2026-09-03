import { lazy } from "react";
import { pageElement } from "./routeSupport";
const KycPage = lazy(() => import("@/Pages/KYC/KycPage").then((m) => ({ default: m.KycPage })));
export const kycRoutes = [{ path: "/kyc", element: pageElement(KycPage) }];

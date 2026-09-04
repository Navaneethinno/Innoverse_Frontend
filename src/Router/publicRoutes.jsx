import { lazy } from "react";
import { pageElement } from "./routeSupport";
import { AccessDenied } from "@/Components/Common/AccessDenied";
const LoginPage = lazy(() =>
  import("@/Pages/Login/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SetupPage = lazy(() =>
  import("@/Pages/Login/SetupPage").then((m) => ({ default: m.SetupPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/Pages/Login/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
// "/" is no longer a public redirect — the protected route group now
// registers its own "/" route (Dashboard), guarded by ProtectRoute, so an
// unauthenticated visit to "/" goes straight to /login (matching payse's
// single-hop root -> auth-gate behavior) instead of bouncing through
// /dashboard first.
export const publicRoutes = [
  { path: "/login", element: pageElement(LoginPage) },
  { path: "/setup", element: pageElement(SetupPage) },
  { path: "/forgot-password", element: pageElement(ForgotPasswordPage) },
  { path: "/access-denied", element: <AccessDenied /> },
];

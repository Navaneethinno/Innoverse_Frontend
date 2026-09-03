import { lazy } from "react";
import { Navigate } from "react-router-dom";
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
export const publicRoutes = [
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: pageElement(LoginPage) },
  { path: "/setup", element: pageElement(SetupPage) },
  { path: "/forgot-password", element: pageElement(ForgotPasswordPage) },
  { path: "/access-denied", element: <AccessDenied /> },
];

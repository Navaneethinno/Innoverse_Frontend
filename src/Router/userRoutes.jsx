import { lazy } from "react";
import { pageElement } from "./routeSupport";
import { PasswordPolicy } from "@/Components/UserManagement/PasswordPolicy";
const UsersPage = lazy(() =>
  import("@/Components/UserManagement/User").then((m) => ({ default: m.User })),
);
const KycPage = lazy(() =>
  import("@/Components/UserManagement/KYC").then((m) => ({ default: m.KYC })),
);
const PasswordPolicyPage = PasswordPolicy;
// The sidebar's leaf-click navigation (MenuItem.jsx, ported from
// payseFrontend) slugifies menu_name and always navigates to
// `/{slug}/{uuid}`, regardless of whether the real page needs an id — same
// mechanism payse uses (see the "Institution Profile" -> /institutionprofile/:id
// fix for the same class of issue). The real backend menu item under User
// Management is named "User" (singular, confirmed live — a click produced
// /user/<uuid>, not /users/<uuid>), same surprise as "Profile" vs
// "Profiles". Kept the plural "/users" path too as this page's own natural
// route name.
export const userRoutes = [
  { path: "passwordpolicy", element: pageElement(PasswordPolicyPage) },
  { path: "passwordpolicy/:id", element: pageElement(PasswordPolicyPage) },
  { path: "passwordpolicy/*", element: pageElement(PasswordPolicyPage) },
  { path: "password-policy", element: pageElement(PasswordPolicyPage) },
  { path: "password-policy/:id", element: pageElement(PasswordPolicyPage) },
  { path: "user/passwordpolicy", element: pageElement(PasswordPolicyPage) },
  { path: "user/passwordpolicy/:id", element: pageElement(PasswordPolicyPage) },
  { path: "kyc", element: pageElement(KycPage) },
  { path: "kyc/:id", element: pageElement(KycPage) },
  { path: "userkyc/:id", element: pageElement(KycPage) },
  { path: "users", element: pageElement(UsersPage) },
  { path: "users/:id", element: pageElement(UsersPage) },
  { path: "user/:id", element: pageElement(UsersPage) },
];

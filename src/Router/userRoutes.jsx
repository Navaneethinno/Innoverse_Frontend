import { lazy } from "react";
import { pageElement } from "./routeSupport";
const UsersPage = lazy(() =>
  import("@/Pages/Users/UsersPage").then((m) => ({ default: m.UsersPage })),
);
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
  { path: "/users", element: pageElement(UsersPage) },
  { path: "/users/:id", element: pageElement(UsersPage) },
  { path: "/user/:id", element: pageElement(UsersPage) },
];

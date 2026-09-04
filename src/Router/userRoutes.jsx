import { lazy } from "react";
import { pageElement } from "./routeSupport";
const UsersPage = lazy(() =>
  import("@/Pages/Users/UsersPage").then((m) => ({ default: m.UsersPage })),
);
// The sidebar's leaf-click navigation (MenuItem.jsx, ported from
// payseFrontend) slugifies menu_name and always navigates to
// `/{slug}/{uuid}`, regardless of whether the real page needs an id — same
// mechanism payse uses (see the "Institution Profile" -> /institutionprofile/:id
// fix for the same class of issue). The backend menu "Users" slugifies to
// "users", so a bare `/users` route without a trailing :id 404s on every
// click.
export const userRoutes = [
  { path: "/users", element: pageElement(UsersPage) },
  { path: "/users/:id", element: pageElement(UsersPage) },
];

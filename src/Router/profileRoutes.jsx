import { lazy } from "react";
import { pageElement } from "./routeSupport";
const ProfilesPage = lazy(() =>
  import("@/Pages/Profiles/ProfilesPage").then((m) => ({ default: m.ProfilesPage })),
);
const ChangePasswordPage = lazy(() =>
  import("@/Pages/Profiles/ChangePasswordPage").then((m) => ({ default: m.ChangePasswordPage })),
);
// Same fabricated-route fix as userRoutes.jsx: the sidebar's leaf-click
// navigation slugifies menu_name verbatim (no pluralization) and always
// appends a uuid. The real backend menu item that lands here is named
// exactly "Profile" (singular, confirmed live: a click produced
// /profile/<uuid>, not /profiles/<uuid>) — kept the plural "/profiles"
// path too since that's this page's own natural route name and may still
// be used elsewhere (e.g. any direct/manual navigation), but the singular
// alias is what the actual sidebar menu name requires.
export const profileRoutes = [
  { path: "/profiles", element: pageElement(ProfilesPage) },
  { path: "/profiles/:id", element: pageElement(ProfilesPage) },
  { path: "/profile/:id", element: pageElement(ProfilesPage) },
  { path: "/change-password", element: pageElement(ChangePasswordPage) },
];

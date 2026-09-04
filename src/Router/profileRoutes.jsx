import { lazy } from "react";
import { pageElement } from "./routeSupport";
const ProfilesPage = lazy(() =>
  import("@/Pages/Profiles/ProfilesPage").then((m) => ({ default: m.ProfilesPage })),
);
const ChangePasswordPage = lazy(() =>
  import("@/Pages/Profiles/ChangePasswordPage").then((m) => ({ default: m.ChangePasswordPage })),
);
// Same fabricated-route fix as userRoutes.jsx: the sidebar's "Profiles"
// menu click navigates to `/profiles/{uuid}`, which needs a matching
// `:id` route or it 404s.
export const profileRoutes = [
  { path: "/profiles", element: pageElement(ProfilesPage) },
  { path: "/profiles/:id", element: pageElement(ProfilesPage) },
  { path: "/change-password", element: pageElement(ChangePasswordPage) },
];

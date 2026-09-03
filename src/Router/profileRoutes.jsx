import { lazy } from "react";
import { pageElement } from "./routeSupport";
const ProfilesPage = lazy(() =>
  import("@/Pages/Profiles/ProfilesPage").then((m) => ({ default: m.ProfilesPage })),
);
const ChangePasswordPage = lazy(() =>
  import("@/Pages/Profiles/ChangePasswordPage").then((m) => ({ default: m.ChangePasswordPage })),
);
export const profileRoutes = [
  { path: "/profiles", element: pageElement(ProfilesPage) },
  { path: "/change-password", element: pageElement(ChangePasswordPage) },
];

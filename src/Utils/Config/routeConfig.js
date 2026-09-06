// Matches by the URL's first path segment rather than the full path,
// because the sidebar's fabricated navigation (MenuItem.jsx, ported from
// payseFrontend) always appends a random id — a click lands on paths like
// /user/<uuid> or /profile/<uuid>, not the clean /users or /profiles this
// file used to list as exact/prefix matches. Matching on the full path (or
// even a full-path prefix) meant almost every real page fell through to no
// match at all, and TopBar's breadcrumb silently showed "Dashboard"
// everywhere. Segment-based matching handles every current fabricated
// route (and any future one with the same slug) without needing this file
// hand-kept in sync with the router every time a new alias route is added.
// Two-level breadcrumb (module / menu) matching the sidebar's own module
// grouping (e.g. the "USER MANAGEMENT" section header containing "User" and
// "Profile" rows) so the top bar reads as a clear route, not just a bare
// page name.
const SEGMENT_LABELS = {
  dashboard: { title: "Dashboard", breadcrumb: ["Dashboard"] },
  institutions: { title: "Institutions", breadcrumb: ["Institution", "Institutions"] },
  institutionprofile: {
    title: "Institution Profile",
    breadcrumb: ["Institution", "Institution Profile"],
  },
  users: { title: "Users", breadcrumb: ["User Management", "User"] },
  user: { title: "Users", breadcrumb: ["User Management", "User"] },
  profiles: { title: "Profiles", breadcrumb: ["User Management", "Profile"] },
  profile: { title: "Profiles", breadcrumb: ["User Management", "Profile"] },
  "change-password": { title: "Change Password", breadcrumb: ["Settings", "Change Password"] },
};

export function getRouteMetadata(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return SEGMENT_LABELS[firstSegment] ?? SEGMENT_LABELS.dashboard;
}

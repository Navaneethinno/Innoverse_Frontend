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
const SEGMENT_LABELS = {
  dashboard: { title: "Dashboard", breadcrumb: ["Dashboard"] },
  institutions: { title: "Institutions", breadcrumb: ["Institutions"] },
  institutionprofile: { title: "Institution Profile", breadcrumb: ["Institutions"] },
  users: { title: "Users", breadcrumb: ["Users"] },
  user: { title: "Users", breadcrumb: ["Users"] },
  profiles: { title: "Profiles", breadcrumb: ["Profiles"] },
  profile: { title: "Profiles", breadcrumb: ["Profiles"] },
  "change-password": { title: "Change Password", breadcrumb: ["Settings", "Change Password"] },
};

export function getRouteMetadata(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return SEGMENT_LABELS[firstSegment] ?? SEGMENT_LABELS.dashboard;
}

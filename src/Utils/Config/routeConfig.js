import { ROUTES } from "@/Utils/Config/routes";
export const ROUTE_METADATA = [
  {
    id: "dashboard",
    path: ROUTES.dashboard,
    title: "Dashboard",
    breadcrumb: ["Dashboard"],
    feature: "dashboard",
  },
  {
    id: "institutions",
    path: ROUTES.institutions,
    title: "Institutions",
    breadcrumb: ["Institutions"],
    feature: "institutions",
  },
  {
    id: "institution-detail",
    path: "/institutions/:id",
    title: "Institution Detail",
    breadcrumb: ["Institutions", "Detail"],
    feature: "institutions",
  },
  { id: "users", path: ROUTES.users, title: "Users", breadcrumb: ["Users"], feature: "users" },
  {
    id: "profiles",
    path: ROUTES.profiles,
    title: "Profiles",
    breadcrumb: ["Profiles"],
    feature: "profiles",
  },
];
export function getRouteMetadata(pathname) {
  return ROUTE_METADATA.find((route) => {
    if (route.path.includes(":id")) return pathname.startsWith(route.path.replace("/:id", "/"));
    return pathname === route.path || pathname.startsWith(`${route.path}/`);
  });
}

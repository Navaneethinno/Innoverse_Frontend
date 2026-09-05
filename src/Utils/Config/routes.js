export const ROUTES = {
  root: "/",
  login: "/login",
  setup: "/setup",
  dashboard: "/dashboard",
  institutions: "/institutions",
  institutionCreate: "/institutions/create",
  institutionDetail: (id = ":id") => "/institutions/" + id,
  users: "/users",
  profiles: "/profiles",
};

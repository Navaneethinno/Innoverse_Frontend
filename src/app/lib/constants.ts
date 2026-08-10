export const APP_NAME = "InstitutionOS";

export const ROUTES = {
  login: "/login",
  setup: "/setup",
  dashboard: "/dashboard",
  institutions: "/institutions",
  institutionDetail: (id = ":id") => `/institutions/${id}`,
};


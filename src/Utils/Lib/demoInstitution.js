// The shared DEMO institution (code DEMO): its users must not open My
// profile or Change password, so one demo login keeps working for everyone.
// Frontend-only, by the institution code typed at sign-in.
const DEMO_CODE = "DEMO";

export const isDemoUser = (user) =>
  [user?.institution_code, user?.inst_profile_code, user?.scope?.institution_code].some((code) => String(code ?? "").trim().toUpperCase() === DEMO_CODE);

// The pages a demo user can't open.
export const DEMO_BLOCKED_PATHS = ["/my-profile", "/change-password"];

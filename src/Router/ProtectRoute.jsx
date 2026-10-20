import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken, readAuthUser } from "@/Services/api/authStorage";
import { DEMO_BLOCKED_PATHS, isDemoUser } from "@/Utils/Lib/demoInstitution";

// Signed in, or off to sign-in. A user who must change their password
// (is_force_pwd, e.g. at first sign-in) sees only Change password until done.
export function ProtectRoute({ children }) {
  const { pathname } = useLocation();
  const accessToken = getAccessToken();
  if (!accessToken) return <Navigate to="/login" replace />;
  const user = readAuthUser();
  // The DEMO institution never opens My profile or Change password (and is
  // never forced to change it).
  if (isDemoUser(user)) return DEMO_BLOCKED_PATHS.includes(pathname) ? <Navigate to="/" replace /> : children;
  if (Number(user?.is_force_pwd) === 1 && pathname !== "/change-password") return <Navigate to="/change-password" replace />;
  return children;
}

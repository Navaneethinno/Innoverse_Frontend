import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken, readAuthUser } from "@/Services/api/authStorage";

// Signed in, or off to sign-in. A user who must change their password
// (is_force_pwd, e.g. at first sign-in) sees only Change password until done.
export function ProtectRoute({ children }) {
  const { pathname } = useLocation();
  const accessToken = getAccessToken();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (Number(readAuthUser()?.is_force_pwd) === 1 && pathname !== "/change-password") return <Navigate to="/change-password" replace />;
  return children;
}

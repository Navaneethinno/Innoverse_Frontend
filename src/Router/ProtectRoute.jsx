import { Navigate } from "react-router-dom";
import { getAccessToken } from "@/Services/api/authStorage";
export function ProtectRoute({ children }) {
  const accessToken = getAccessToken();
  return accessToken ? children : <Navigate to="/login" replace />;
}

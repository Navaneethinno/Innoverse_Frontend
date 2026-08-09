import { Navigate } from "react-router";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../features/auth/auth.store";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

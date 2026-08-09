import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{children}</div>;
}

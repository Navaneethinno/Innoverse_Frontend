import { ReactNode } from "react";

export function WorkspaceContainer({ children }: { children: ReactNode }) {
  return <div className="min-h-screen pt-20 pb-12 px-4 relative">{children}</div>;
}


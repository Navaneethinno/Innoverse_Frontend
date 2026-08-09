import { ReactNode } from "react";

export function WorkspaceContainer({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pt-[4.5rem] pb-10 px-6">
      {children}
    </div>
  );
}

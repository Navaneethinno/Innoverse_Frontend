import { Wrench } from "lucide-react";

// Shown in place of the whole site while MAINTENANCE is on
// (Utils/Config/maintenance.js). Plain text: no sign-in, no API calls.
export function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
          <Wrench size={22} />
        </span>
        <h1 className="text-lg font-bold text-foreground">Under maintenance</h1>
        <p className="mt-2 text-sm text-muted-foreground">The admin portal is not available right now. Please check back later.</p>
      </div>
    </main>
  );
}

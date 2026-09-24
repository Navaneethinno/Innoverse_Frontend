import { cn } from "@/Utils/Lib/cn";
import { useBackendHealth } from "@/Hooks/Health/healthHooks";
export function BackendConnectionIndicator() {
  const { isPending, isSuccess } = useBackendHealth();
  const label = isPending
    ? "Connecting..."
    : isSuccess
      ? "Backend Connected"
      : "Backend Disconnected";
  const tone = isPending ? "text-amber-600" : isSuccess ? "text-emerald-600" : "text-red-600";
  const dotTone = isPending ? "bg-amber-400" : isSuccess ? "bg-emerald-500" : "bg-red-500";
  return (
    <div className={cn("mt-3 inline-flex items-center gap-2 text-xs font-medium", tone)}>
      <span className={cn("h-2 w-2 rounded-full", dotTone)} aria-hidden="true" />
      <span role="status" aria-live="polite">
        {label}
      </span>
    </div>
  );
}

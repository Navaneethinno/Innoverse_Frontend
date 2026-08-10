import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { ApprovalCard } from "./components/ApprovalCard";
import { useReviewStore } from "../../features/review/review.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { toast } from "sonner";

export function ReviewCenterPage() {
  const navigate = useNavigate();
  const { changes, isLoading, error, fetchChanges, updateChangeStatus } = useReviewStore();
  const currentUser = useAuthStore((s) => s.user);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void fetchChanges();
  }, [fetchChanges]);

  const pending = useMemo(() => changes.filter((c) => c.auth_status?.toUpperCase() === "PENDING" || c.status?.toUpperCase() === "PENDING"), [changes]);
  const resolved = useMemo(() => changes.filter((c) => c.auth_status?.toUpperCase() !== "PENDING" && c.status?.toUpperCase() !== "PENDING"), [changes]);

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Approvals</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Review Center</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{pending.length} pending · {resolved.length} resolved today</p>
        </div>
      </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load approvals</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <button className="text-sm font-medium underline" onClick={() => void fetchChanges()}>Retry</button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pending.length === 0 && resolved.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle size={26} className="text-emerald-500" />
            </div>
            <p className="text-slate-700 font-bold">All caught up</p>
            <p className="text-sm text-slate-400 mt-1 font-medium">No pending reviews at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {changes.map((change) => (
              <ApprovalCard
                key={change.id}
                change={change}
                expanded={expanded === String(change.id)}
                isOwnRequest={String(change.created_by?.id) === String(currentUser?.id)}
                onToggleExpanded={() => setExpanded(expanded === String(change.id) ? null : String(change.id))}
                onApprove={async () => {
                  if (String(change.created_by?.id) === String(currentUser?.id)) {
                    toast.error("Maker cannot approve own request");
                    return;
                  }
                  const ok = await updateChangeStatus(String(change.id), "approved");
                  if (ok) toast.success("Approved successfully");
                  else toast.error(useReviewStore.getState().error ?? "Failed to approve");
                }}
                onReject={async () => {
                  if (String(change.created_by?.id) === String(currentUser?.id)) {
                    toast.error("Maker cannot reject own request");
                    return;
                  }
                  const ok = await updateChangeStatus(String(change.id), "rejected");
                  if (ok) toast.success("Rejected successfully");
                  else toast.error(useReviewStore.getState().error ?? "Failed to reject");
                }}
                onCompare={() => navigate(`/review/${change.id}`)}
              />
            ))}
          </div>
        )}
    </div>
  );
}

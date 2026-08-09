import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { GradientMesh } from "../../legacy/legacy-components";
import { ApprovalCard } from "./components/ApprovalCard";
import { useReviewStore } from "../../features/review/review.store";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { toast } from "sonner";

export function ReviewCenterPage() {
  const navigate = useNavigate();
  const { changes, isLoading, error, fetchChanges, updateChangeStatus } = useReviewStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void fetchChanges();
  }, [fetchChanges]);

  const pending = useMemo(() => changes.filter((c) => c.status === "pending"), [changes]);
  const resolved = useMemo(() => changes.filter((c) => c.status !== "pending"), [changes]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
      <GradientMesh />
      <div className="relative max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8 pt-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Review Center</h1>
            <p className="text-sm text-slate-500 mt-1">{pending.length} pending · {resolved.length} resolved today</p>
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
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
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
            <p className="text-slate-700 font-medium">All caught up</p>
            <p className="text-sm text-slate-400 mt-1">No pending reviews at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {changes.map((change) => (
              <ApprovalCard
                key={change.id}
                change={change}
                expanded={expanded === change.id}
                onToggleExpanded={() => setExpanded(expanded === change.id ? null : change.id)}
                onApprove={async () => {
                  const ok = await updateChangeStatus(change.id, "approved");
                  if (ok) toast.success("Approval approved");
                  else toast.error(useReviewStore.getState().error ?? "Failed to approve");
                }}
                onReject={async () => {
                  const ok = await updateChangeStatus(change.id, "rejected");
                  if (ok) toast.success("Approval rejected");
                  else toast.error(useReviewStore.getState().error ?? "Failed to reject");
                }}
                onCompare={() => navigate(`/review/${change.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

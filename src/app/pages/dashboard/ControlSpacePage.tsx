import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Bell, CheckCircle, Plus, Shield } from "lucide-react";
import { GradientMesh } from "../../legacy/legacy-components";
import { cn } from "../../lib/utils";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useReviewStore } from "../../features/review/review.store";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";

export function ControlSpacePage() {
  const navigate = useNavigate();
  const { institutions, isLoading: institutionLoading, error: institutionError, fetchInstitutions } = useInstitutionStore();
  const { changes, isLoading: reviewLoading, error: reviewError, fetchChanges } = useReviewStore();

  useEffect(() => {
    void fetchInstitutions();
    void fetchChanges();
  }, [fetchInstitutions, fetchChanges]);

  const stats = useMemo(
    () => ({
      total: institutions.length,
      active: institutions.filter((institution) => institution.status === "active").length,
      pending: institutions.filter((institution) => institution.status === "pending" || institution.status === "draft").length,
    }),
    [institutions],
  );

  const feed = [
    { event: "Institution approved", entity: "First National Bank", time: "2 min ago", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { event: "Change request submitted", entity: "Pacific Savings & Trust", time: "18 min ago", icon: Plus, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  if (institutionLoading || reviewLoading) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 relative overflow-hidden bg-[#F9FAFB]">
        <GradientMesh />
        <div className="relative max-w-6xl mx-auto">
          <LoadingState lines={4} />
        </div>
      </div>
    );
  }

  const error = institutionError ?? reviewError;
  if (error) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 relative overflow-hidden bg-[#F9FAFB]">
        <GradientMesh />
        <div className="relative max-w-6xl mx-auto">
          <ErrorState title="Dashboard unavailable" description={error} onRetry={() => {
            void fetchInstitutions();
            void fetchChanges();
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 relative overflow-hidden bg-[#F9FAFB]">
      <GradientMesh />
      <div className="relative max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 pt-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Control Space</h1>
            <p className="text-sm text-slate-500 mt-1">Operational overview for the fintech workspace</p>
          </div>
          <button onClick={() => navigate("/review")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-200/40 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <Bell size={15} />
            Review Center
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Institutions", value: stats.total },
            { label: "Active", value: stats.active },
            { label: "Pending", value: stats.pending },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
              <button onClick={() => navigate("/institutions")} className="text-sm text-indigo-600 font-medium flex items-center gap-1">
                View institutions <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-4">
              {feed.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.event} className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.bg)}>
                      <Icon size={15} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{item.event}</p>
                      <p className="text-xs text-slate-500">{item.entity}</p>
                    </div>
                    <span className="text-xs text-slate-400">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Operational Notes</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>Maker-checker approvals are active across the review workspace.</p>
              <p>Institution updates flow through the same approval pipeline used by the backend API.</p>
              <p>All pages are lazy-loaded and protected when authentication is required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

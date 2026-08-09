import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ArrowRight, Clock, Edit3, Eye, Globe, Mail, MapPin, Plus, Phone } from "lucide-react";
import { GradientMesh, Avatar, InstitutionAvatar, StatusBadge } from "../../legacy/legacy-components";
import { useInstitutionStore } from "../../features/institution/institution.store";
import type { Institution } from "../../features/institution/institution.types";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

export function InstitutionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchInstitutionById, error, isLoading, updateInstitution } = useInstitutionStore();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [values, setValues] = useState<Institution | null>(null);
  const [pendingDialog, setPendingDialog] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void fetchInstitutionById(id).then((item) => {
      if (item) {
        setInstitution(item);
        setValues(item);
      }
    });
  }, [id, fetchInstitutionById]);

  const editableFields = [
    { key: "email", label: "Primary Email", icon: Mail },
    { key: "phone", label: "Phone Number", icon: Phone },
    { key: "address", label: "Street Address", icon: MapPin },
    { key: "city", label: "City & State", icon: Globe },
  ] as const;

  const timeline = [
    { date: "Apr 12, 2024", event: "Email change submitted for review", user: "Sarah Chen", type: "change", Icon: Edit3 },
    { date: "Mar 28, 2024", event: "Compliance audit completed", user: "Michael Torres", type: "review", Icon: Eye },
    { date: "Feb 15, 2024", event: "Status elevated to Active", user: "Platform Admin", type: "status", Icon: Clock },
    { date: "Jan 15, 2024", event: "Institution registered", user: institution?.maker ?? "", type: "create", Icon: Plus },
  ];

  const typeColors: Record<string, string> = {
    change: "bg-indigo-50 text-indigo-600",
    review: "bg-slate-50 text-slate-600",
    status: "bg-emerald-50 text-emerald-600",
    create: "bg-violet-50 text-violet-600",
  };

  const handleSave = (field: string) => {
    if (!institution || !values) return;
    const changed = values[field as keyof Institution] !== institution[field as keyof Institution];
    setEditingField(null);
    if (changed) setPendingDialog(field);
  };

  if (isLoading || !institution) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
        <GradientMesh />
        <div className="relative max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
        <GradientMesh />
        <div className="relative max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Institution unavailable</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <button className="text-sm underline" onClick={() => void fetchInstitutionById(id ?? "")}>Retry</button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
      <GradientMesh />
      <div className="relative max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8 pt-2">
          <button onClick={() => navigate("/institutions")} className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1">
            ← Institutions
          </button>
          <div className="flex-1 flex items-center gap-3">
            <InstitutionAvatar name={institution.name} size="lg" />
            <div>
              <h1 className="text-xl font-semibold text-slate-800 tracking-tight">{institution.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-slate-500">{institution.type}</span>
                <span className="text-slate-300">·</span>
                <StatusBadge status={institution.status} />
              </div>
            </div>
          </div>
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm">
            <Eye size={14} />
            Full Audit Log
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-slate-800">Institution Details</h2>
                <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg font-mono">{institution.regNumber}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editableFields.map(({ key, label, icon: Icon }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5"><Icon size={11} />{label}</label>
                    {editingField === key ? (
                      <input
                        value={String(values[key])}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value } as Institution)}
                        autoFocus
                        onBlur={() => handleSave(key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(key);
                          if (e.key === "Escape") { setEditingField(null); setValues({ ...institution }); }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-indigo-50 border-2 border-indigo-300 text-sm text-slate-800 outline-none"
                      />
                    ) : (
                      <button onClick={() => setEditingField(key)} className="group/field w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                        <span className="flex-1 min-w-0 truncate">{String(values[key])}</span>
                        <Edit3 size={11} className="text-slate-300 opacity-0 group-hover/field:opacity-100 transition-opacity shrink-0" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Accounts", value: institution.totalAccounts.toLocaleString() },
                { label: "Total Volume", value: institution.totalVolume },
                { label: "Uptime SLA", value: "99.98%" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Authorization Chain</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={institution.maker} size="md" gradient="indigo" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Maker</p>
                    <p className="text-sm font-medium text-slate-700">{institution.maker}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 h-px bg-slate-100" />
                  <ArrowRight size={14} className="text-slate-300 shrink-0" />
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                {institution.checker ? (
                  <div className="flex items-center gap-3">
                    <Avatar name={institution.checker} size="md" gradient="teal" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Checker</p>
                      <p className="text-sm font-medium text-slate-700">{institution.checker}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center shrink-0">
                      <Clock size={13} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Checker</p>
                      <p className="text-sm text-amber-600 font-medium">Awaiting review</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-20">
              <h2 className="text-sm font-semibold text-slate-800 mb-5">Audit Trail</h2>
              <div>{timeline.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", typeColors[entry.type])}><entry.Icon size={12} /></div>
                    {i < timeline.length - 1 && <div className="w-px flex-1 min-h-5 bg-slate-100 my-1" />}
                  </div>
                  <div className="pb-5 flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-snug">{entry.event}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{entry.user}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{entry.date}</p>
                  </div>
                </div>
              ))}</div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pendingDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setPendingDialog(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl border border-white p-6 w-full max-w-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-2">Submit Change Request</h3>
              <p className="text-sm text-slate-500 mb-5">This change will be queued for checker approval before taking effect.</p>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-5">
                <p className="text-xs text-indigo-700 font-medium">Maker-Checker enforced</p>
                <p className="text-xs text-indigo-600 mt-0.5">A second approver will review this change</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPendingDialog(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    updateInstitution(values);
                    toast.success("Change request queued");
                    setPendingDialog(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-md transition-all"
                >
                  Submit for Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

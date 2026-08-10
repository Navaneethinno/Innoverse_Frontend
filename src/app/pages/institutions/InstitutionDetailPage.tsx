import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ArrowLeft, Building2, CheckCircle, Clock, Edit3, Eye, Globe, Mail, MapPin, Phone, User } from "lucide-react";
import { useInstitutionStore } from "../../features/institution/institution.store";
import type { Institution } from "../../features/institution/institution.types";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

const glass = {
  background: "rgba(255,255,255,0.68)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.88)",
  boxShadow: "0 4px 20px rgba(108,127,255,0.07), 0 1px 3px rgba(108,127,255,0.04)",
};

const STATUS_STYLES: Record<string, { pill: string; dot: string; label: string }> = {
  ACTIVE:    { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Active" },
  active:    { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Active" },
  PENDING:   { pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   label: "Pending" },
  pending:   { pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   label: "Pending" },
  REJECTED:  { pill: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     label: "Rejected" },
  rejected:  { pill: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     label: "Rejected" },
  SUSPENDED: { pill: "bg-orange-50 text-orange-700 border-orange-200",    dot: "bg-orange-500",  label: "Suspended" },
  DRAFT:     { pill: "bg-slate-50 text-slate-500 border-slate-200",       dot: "bg-slate-400",   label: "Draft" },
};

type EditableKey = "email" | "phone" | "address_line1" | "city";

const EDITABLE_FIELDS: { key: EditableKey; label: string; icon: React.ElementType }[] = [
  { key: "email",        label: "Email",          icon: Mail },
  { key: "phone",        label: "Phone",          icon: Phone },
  { key: "address_line1", label: "Address",       icon: MapPin },
  { key: "city",         label: "City",           icon: Globe },
];

export function InstitutionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchInstitutionById, updateInstitution } = useInstitutionStore();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [values, setValues] = useState<Institution | null>(null);
  const [pendingDialog, setPendingDialog] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const item = await fetchInstitutionById(id);
    if (item) { setInstitution(item); setValues(item); }
    else setError("Institution not found");
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const handleSave = (field: string) => {
    if (!institution || !values) return;
    const changed = values[field as keyof Institution] !== institution[field as keyof Institution];
    setEditingField(null);
    if (changed) setPendingDialog(field);
  };

  if (isLoading || !institution) {
    return (
      <div className="pt-4 pb-8 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-4 flex flex-col items-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-400" />
        </div>
        <p className="text-sm font-bold text-slate-700">{error}</p>
        <button onClick={() => void load()} className="mt-3 text-xs font-bold text-indigo-500 underline">Retry</button>
      </div>
    );
  }

  const displayName = institution.name || institution.legal_name || institution.code || "—";
  const statusKey = String(institution.status ?? "DRAFT");
  const statusCfg = STATUS_STYLES[statusKey] ?? STATUS_STYLES.DRAFT;
  const location = [institution.address_line1, institution.city, institution.state, institution.country].filter(Boolean).join(", ");

  return (
    <div className="pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/institutions")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={13} /> Institutions
        </button>
        <span className="text-slate-200">/</span>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA] flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-200/40 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-800 tracking-tight truncate">{displayName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 font-mono">{institution.code}</span>
              <span className="text-slate-200">·</span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", statusCfg.pill)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />{statusCfg.label}
              </span>
            </div>
          </div>
        </div>
        <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100/80 transition-colors border border-slate-200/60">
          <Eye size={13} /> Audit Log
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Editable fields */}
          <div className="rounded-2xl p-6" style={glass}>
            <h2 className="text-sm font-bold text-slate-800 mb-5">Institution Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EDITABLE_FIELDS.map(({ key, label, icon: Icon }) => {
                const val = values?.[key] ?? null;
                return (
                  <div key={key}>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      <Icon size={10} /> {label}
                    </label>
                    {editingField === key ? (
                      <input
                        value={String(val ?? "")}
                        onChange={(e) => setValues((v) => v ? { ...v, [key]: e.target.value } : v)}
                        autoFocus
                        onBlur={() => handleSave(key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(key);
                          if (e.key === "Escape") { setEditingField(null); setValues(institution); }
                        }}
                        className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        style={{ background: "rgba(108,127,255,0.06)", border: "2px solid rgba(108,127,255,0.30)" }}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingField(key)}
                        className="group/f w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left hover:bg-white/60 transition-colors"
                        style={{ border: "1px solid rgba(108,127,255,0.08)" }}
                      >
                        <span className="flex-1 min-w-0 truncate text-slate-700">{val ?? <span className="text-slate-300 italic">Not set</span>}</span>
                        <Edit3 size={11} className="text-slate-300 opacity-0 group-hover/f:opacity-100 transition-opacity shrink-0" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Owner",      value: institution.owner?.name ?? "—",       icon: User },
              { label: "Version",    value: institution.version ?? "—",            icon: Clock },
              { label: "Created By", value: institution.created_by?.name ?? "—",  icon: Building2 },
              { label: "Approved By", value: institution.approved_by?.name ?? "—", icon: CheckCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl p-4 text-center" style={glass}>
                <Icon size={16} className="text-indigo-400 mx-auto mb-2" />
                <p className="text-lg font-black text-slate-800">{String(value)}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Location */}
          {location && (
            <div className="rounded-2xl p-5" style={glass}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={13} className="text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-800">Location</h2>
              </div>
              <p className="text-sm text-slate-600">{location}</p>
              {institution.postal_code && <p className="text-xs text-slate-400 mt-1">Postal: {institution.postal_code}</p>}
            </div>
          )}
        </div>

        {/* Right: legal info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl p-5 sticky top-20" style={glass}>
            <h2 className="text-sm font-bold text-slate-800 mb-4">Legal Information</h2>
            <div className="space-y-3">
              {[
                { label: "Legal Name",   value: institution.legal_name },
                { label: "Code",         value: institution.code },
                { label: "Address Line 2", value: institution.address_line2 },
                { label: "State",        value: institution.state },
                { label: "Country",      value: institution.country },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                  <p className="text-xs text-slate-700 mt-0.5">{value ?? <span className="text-slate-300 italic">—</span>}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Maker-checker dialog */}
      <AnimatePresence>
        {pendingDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setPendingDialog(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative rounded-2xl p-6 w-full max-w-sm"
              style={{ background: "rgba(255,255,255,0.96)", border: "1px solid rgba(255,255,255,0.95)", boxShadow: "0 24px 64px rgba(108,127,255,0.16)" }}
            >
              <h3 className="text-sm font-bold text-slate-800 mb-1.5">Submit Change Request</h3>
              <p className="text-xs text-slate-500 mb-4">This change will be queued for checker approval before taking effect.</p>
              <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(108,127,255,0.06)", border: "1px solid rgba(108,127,255,0.12)" }}>
                <p className="text-xs font-bold text-indigo-700">Maker-Checker enforced</p>
                <p className="text-xs text-indigo-500 mt-0.5">A second approver will review this change</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPendingDialog(null)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200/60">Cancel</button>
                <button
                  onClick={() => { updateInstitution(values); toast.success("Change request queued"); setPendingDialog(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50"
                  style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
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

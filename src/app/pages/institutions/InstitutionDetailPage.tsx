import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, Building2, CheckCircle } from "lucide-react";
import { useInstitutionStore } from "../../features/institution/institution.store";
import type { Institution } from "../../features/institution/institution.types";
import { Skeleton } from "../../components/ui/skeleton";
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xs text-slate-700 mt-0.5">{value ?? <span className="text-slate-300 italic">—</span>}</p>
    </div>
  );
}

export function InstitutionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchInstitutionById } = useInstitutionStore();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const item = await fetchInstitutionById(id);
    if (item) setInstitution(item);
    else setError("Institution not found");
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

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

  const displayName = institution.name || institution.code || "—";
  const statusKey = String(institution.status ?? institution.auth_status ?? "DRAFT");
  const statusCfg = STATUS_STYLES[statusKey] ?? STATUS_STYLES.DRAFT;
  const kyc = institution.kyc;

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: institution + KYC details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Institution info */}
          <div className="rounded-2xl p-6" style={glass}>
            <h2 className="text-sm font-bold text-slate-800 mb-5">Institution</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Code",        value: institution.code },
                { label: "Type",        value: institution.type },
                { label: "Auth Status", value: institution.auth_status },
                { label: "Status",      value: institution.status },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl p-4 text-center" style={glass}>
                  <p className="text-lg font-black text-slate-800 truncate">{value ?? "—"}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Maker-checker info */}
          <div className="rounded-2xl p-6" style={glass}>
            <h2 className="text-sm font-bold text-slate-800 mb-4">Maker-Checker</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(108,127,255,0.04)", border: "1px solid rgba(108,127,255,0.08)" }}>
                <Building2 size={14} className="text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created By</p>
                  <p className="text-sm font-semibold text-slate-700">{institution.created_by?.name ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(108,127,255,0.04)", border: "1px solid rgba(108,127,255,0.08)" }}>
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved By</p>
                  <p className="text-sm font-semibold text-slate-700">{institution.approved_by?.name ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* KYC details */}
          {kyc && (
            <div className="rounded-2xl p-6" style={glass}>
              <h2 className="text-sm font-bold text-slate-800 mb-4">KYC Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Legal Name"          value={kyc.legal_name} />
                <InfoRow label="Registration Number" value={kyc.registration_number} />
                <InfoRow label="Tax ID"              value={kyc.tax_id} />
                <InfoRow label="Email"               value={kyc.email} />
                <InfoRow label="Phone"               value={kyc.phone} />
                <InfoRow label="Website"             value={kyc.website} />
                <InfoRow label="KYC Status"          value={kyc.kyc_status} />
              </div>
              {(kyc.address_line1 || kyc.city) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow label="Address Line 1" value={kyc.address_line1} />
                    <InfoRow label="Address Line 2" value={kyc.address_line2} />
                    <InfoRow label="City"           value={kyc.city} />
                    <InfoRow label="State"          value={kyc.state} />
                    <InfoRow label="Country"        value={kyc.country} />
                    <InfoRow label="Postal Code"    value={kyc.postal_code} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: summary */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 sticky top-20"
            style={glass}
          >
            <h2 className="text-sm font-bold text-slate-800 mb-4">Summary</h2>
            <div className="space-y-3">
              <InfoRow label="Code"        value={institution.code} />
              <InfoRow label="Name"        value={institution.name} />
              <InfoRow label="Type"        value={institution.type} />
              <InfoRow label="Auth Status" value={institution.auth_status} />
              {kyc?.legal_name && <InfoRow label="Legal Name" value={kyc.legal_name} />}
              {kyc?.city && <InfoRow label="City" value={kyc.city} />}
              {kyc?.country && <InfoRow label="Country" value={kyc.country} />}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

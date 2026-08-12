import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ShieldCheck, Plus, X } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { useUserStore } from "../../features/users/user.store";
import { apiService } from "../../features/api.service";
import { PendingTable } from "../../components/common/PendingTable";
import { MakerCheckerConfig } from "../../components/common/MakerCheckerConfig";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Skeleton } from "../../components/ui/skeleton";
import { notifications } from "../../lib/notifications";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import type { InstitutionKycRecord, UserKycRecord, InstitutionKycPayload, UserKycPayload } from "../../features/kyc/kyc.types";
import type { PendingRequestOut } from "../../features/maker-checker.types";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

type KycTab = "institution" | "user";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xs text-slate-700 mt-0.5">{value ?? <span className="text-slate-300 italic">—</span>}</p>
    </div>
  );
}

export function KycPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { users, fetchUsers } = useUserStore();
  const [activeTab, setActiveTab] = useState<KycTab>("institution");
  const [viewMode, setViewMode] = useState<"current" | "pending">("current");

  // Institution KYC
  const [instKyc, setInstKyc] = useState<InstitutionKycRecord | null>(null);
  const [instKycLoading, setInstKycLoading] = useState(false);
  const [instKycError, setInstKycError] = useState<string | null>(null);
  const [showInstForm, setShowInstForm] = useState(false);
  const [instForm, setInstForm] = useState<InstitutionKycPayload>({});
  const [instCheckerConfig, setInstCheckerConfig] = useState({ checker_mode: "ANY" as const, checker_assignments: [], required_checker_count: 1 });
  const [instSubmitting, setInstSubmitting] = useState(false);

  // User KYC
  const [userKyc, setUserKyc] = useState<UserKycRecord | null>(null);
  const [userKycLoading, setUserKycLoading] = useState(false);
  const [userKycError, setUserKycError] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState<UserKycPayload>({});
  const [userCheckerConfig, setUserCheckerConfig] = useState({ checker_mode: "ANY" as const, checker_assignments: [], required_checker_count: 1 });
  const [userSubmitting, setUserSubmitting] = useState(false);

  // Pending
  const [pending, setPending] = useState<PendingRequestOut[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const institutionId = currentUser?.institution?.id;
  const userId = currentUser?.id;

  const loadInstKyc = async () => {
    if (!institutionId) return;
    setInstKycLoading(true);
    setInstKycError(null);
    try {
      setInstKyc(await apiService.getInstitutionKyc(institutionId));
    } catch (e) {
      setInstKycError(e instanceof Error ? e.message : "Failed to load institution KYC");
    } finally {
      setInstKycLoading(false);
    }
  };

  const loadUserKyc = async () => {
    if (!userId) return;
    setUserKycLoading(true);
    setUserKycError(null);
    try {
      setUserKyc(await apiService.getUserKyc(userId));
    } catch (e) {
      setUserKycError(e instanceof Error ? e.message : "Failed to load user KYC");
    } finally {
      setUserKycLoading(false);
    }
  };

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      if (activeTab === "institution") setPending(await apiService.getPendingInstitutionKyc());
      else setPending(await apiService.getPendingUserKyc());
    } catch {
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
    if (activeTab === "institution") void loadInstKyc();
    else void loadUserKyc();
    void loadPending();
  }, [activeTab, viewMode, fetchUsers]);

  const handleInstSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    setInstSubmitting(true);
    try {
      await apiService.saveInstitutionKyc(institutionId, { ...instForm, ...instCheckerConfig });
      notifications.success("Institution KYC request submitted for approval");
      setShowInstForm(false);
      setInstForm({});
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setInstSubmitting(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setUserSubmitting(true);
    try {
      await apiService.saveUserKyc(userId, { ...userForm, ...userCheckerConfig });
      notifications.success("User KYC request submitted for approval");
      setShowUserForm(false);
      setUserForm({});
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleApprove = async (request_id: string) => {
    try {
      if (activeTab === "institution") await apiService.approveInstitutionKyc(request_id);
      else await apiService.approveUserKyc(request_id);
      toast.success("KYC request approved");
      setPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to approve"); }
  };

  const handleReject = async (request_id: string) => {
    try {
      if (activeTab === "institution") await apiService.rejectInstitutionKyc(request_id);
      else await apiService.rejectUserKyc(request_id);
      toast.success("KYC request rejected");
      setPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to reject"); }
  };

  const instKycFields: Array<[string, keyof InstitutionKycPayload]> = [
    ["Legal Name", "legal_name"], ["Registration Number", "registration_number"],
    ["Tax ID", "tax_id"], ["Email", "email"], ["Phone", "phone"], ["Website", "website"],
    ["Address Line 1", "address_line1"], ["Address Line 2", "address_line2"],
    ["City", "city"], ["State", "state"], ["Country", "country"], ["Postal Code", "postal_code"],
  ];

  const userKycFields: Array<[string, keyof UserKycPayload]> = [
    ["Full Name", "full_name"], ["Date of Birth", "date_of_birth"],
    ["Email", "email"], ["Phone", "phone"], ["ID Type", "id_type"], ["ID Number", "id_number"],
    ["Address Line 1", "address_line1"], ["City", "city"], ["State", "state"],
    ["Country", "country"], ["Postal Code", "postal_code"],
  ];

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Compliance</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">KYC</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Know Your Customer records</p>
        </div>
        {viewMode === "current" && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => activeTab === "institution" ? setShowInstForm(true) : setShowUserForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
            style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
          >
            <Plus size={14} /> Update KYC
          </motion.button>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {(["institution", "user"] as KycTab[]).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize", activeTab === t ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600")}
            style={activeTab === t ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}>
            {t} KYC
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {(["current", "pending"] as const).map((m) => (
          <button key={m} onClick={() => setViewMode(m)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize", viewMode === m ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600")}
            style={viewMode === m ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}>
            {m === "current" ? "Current KYC" : "Pending Approvals"}
          </button>
        ))}
      </div>

      {viewMode === "pending" ? (
        <PendingTable
          requests={pending}
          isLoading={pendingLoading}
          currentUserId={currentUser?.id}
          onApprove={handleApprove}
          onReject={handleReject}
          entityLabel="KYC"
        />
      ) : activeTab === "institution" ? (
        <>
          <AnimatePresence>
            {showInstForm && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-6 mb-6" style={glass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-800">Update Institution KYC</h2>
                  <button onClick={() => setShowInstForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
                </div>
                <form onSubmit={handleInstSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {instKycFields.map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</label>
                      <input
                        value={(instForm[key] as string) ?? ""}
                        onChange={(e) => setInstForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowInstForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                    <motion.button type="submit" disabled={instSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}>
                      {instSubmitting ? "Submitting…" : "Submit for Approval"}
                    </motion.button>
                  </div>
                  <div className="sm:col-span-2">
                    <MakerCheckerConfig
                      value={instCheckerConfig}
                      onChange={setInstCheckerConfig}
                      candidates={users.map((u) => ({ id: u.id, name: u.username, institution_id: u.institution?.id }))}
                      makerInstitutionId={currentUser?.institution?.id}
                      currentMakerId={currentUser?.id}
                    />
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {instKycError && (
            <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle size={14} /> {instKycError}
              <button onClick={loadInstKyc} className="ml-auto text-xs font-bold underline">Retry</button>
            </div>
          )}

          {instKycLoading ? (
            <div className="rounded-2xl p-6" style={glass}><div className="grid grid-cols-2 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></div>
          ) : instKyc ? (
            <div className="rounded-2xl p-6" style={glass}>
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck size={16} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-800">Current Institution KYC</h2>
                <StatusBadge status={instKyc.kyc_status} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Legal Name" value={instKyc.legal_name} />
                <InfoRow label="Registration Number" value={instKyc.registration_number} />
                <InfoRow label="Tax ID" value={instKyc.tax_id} />
                <InfoRow label="Email" value={instKyc.email} />
                <InfoRow label="Phone" value={instKyc.phone} />
                <InfoRow label="Website" value={instKyc.website} />
                <InfoRow label="Address" value={instKyc.address_line1} />
                <InfoRow label="City" value={instKyc.city} />
                <InfoRow label="State" value={instKyc.state} />
                <InfoRow label="Country" value={instKyc.country} />
                <InfoRow label="Postal Code" value={instKyc.postal_code} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                <ShieldCheck size={20} className="text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">No KYC on file</p>
              <p className="text-xs text-slate-400">Submit a KYC record to get started</p>
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Pending Institution KYC</h3>
            <PendingTable
              requests={pending}
              isLoading={pendingLoading}
              currentUserId={currentUser?.id}
              onApprove={handleApprove}
              onReject={handleReject}
              entityLabel="KYC"
            />
          </div>
        </>
      ) : (
        <>
          <AnimatePresence>
            {showUserForm && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-6 mb-6" style={glass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-800">Update User KYC</h2>
                  <button onClick={() => setShowUserForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
                </div>
                <form onSubmit={handleUserSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userKycFields.map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</label>
                      <input
                        value={(userForm[key] as string) ?? ""}
                        onChange={(e) => setUserForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                    <motion.button type="submit" disabled={userSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}>
                      {userSubmitting ? "Submitting…" : "Submit for Approval"}
                    </motion.button>
                  </div>
                  <div className="sm:col-span-2">
                    <MakerCheckerConfig
                      value={userCheckerConfig}
                      onChange={setUserCheckerConfig}
                      candidates={users.map((u) => ({ id: u.id, name: u.username, institution_id: u.institution?.id }))}
                      makerInstitutionId={currentUser?.institution?.id}
                      currentMakerId={currentUser?.id}
                    />
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {userKycError && (
            <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle size={14} /> {userKycError}
              <button onClick={loadUserKyc} className="ml-auto text-xs font-bold underline">Retry</button>
            </div>
          )}

          {userKycLoading ? (
            <div className="rounded-2xl p-6" style={glass}><div className="grid grid-cols-2 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></div>
          ) : userKyc ? (
            <div className="rounded-2xl p-6" style={glass}>
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck size={16} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-800">Current User KYC</h2>
                <StatusBadge status={userKyc.kyc_status} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Full Name" value={userKyc.full_name} />
                <InfoRow label="Date of Birth" value={userKyc.date_of_birth} />
                <InfoRow label="Email" value={userKyc.email} />
                <InfoRow label="Phone" value={userKyc.phone} />
                <InfoRow label="ID Type" value={userKyc.id_type} />
                <InfoRow label="ID Number" value={userKyc.id_number} />
                <InfoRow label="Address" value={userKyc.address_line1} />
                <InfoRow label="City" value={userKyc.city} />
                <InfoRow label="State" value={userKyc.state} />
                <InfoRow label="Country" value={userKyc.country} />
                <InfoRow label="Postal Code" value={userKyc.postal_code} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                <ShieldCheck size={20} className="text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">No KYC on file</p>
              <p className="text-xs text-slate-400">Submit a KYC record to get started</p>
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Pending User KYC</h3>
            <PendingTable
              requests={pending}
              isLoading={pendingLoading}
              currentUserId={currentUser?.id}
              onApprove={handleApprove}
              onReject={handleReject}
              entityLabel="KYC"
            />
          </div>
        </>
      )}
    </div>
  );
}

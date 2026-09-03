import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ShieldCheck, Plus, X } from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Skeleton } from "../../Components/UI/skeleton";
import { notifications } from "../../Utils/Lib/notifications";
import { cn } from "../../Utils/Lib/utils";
import { useInstitutionKycQuery, useUserKycQuery } from "@/Hooks/KYC/kycHooks";
import { useUpdateInstitutionMutation } from "@/Hooks/Institutions/institutionHooks";
import { useUserUpdateMutation } from "@/Hooks/Users/userHooks";
const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};
function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xs text-slate-700 mt-0.5">
        {value ?? <span className="text-slate-300 italic">—</span>}
      </p>
    </div>
  );
}
const instKycFields = [
  ["Legal Name", "legal_name"],
  ["Registration Number", "registration_number"],
  ["Tax ID", "tax_id"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Website", "website"],
  ["Address Line 1", "address_line1"],
  ["Address Line 2", "address_line2"],
  ["City", "city"],
  ["State", "state"],
  ["Country", "country"],
  ["Postal Code", "postal_code"],
];
const userKycFields = [
  ["Full Name", "full_name"],
  ["Date of Birth", "date_of_birth"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["ID Type", "id_type"],
  ["ID Number", "id_number"],
  ["Address Line 1", "address_line1"],
  ["City", "city"],
  ["State", "state"],
  ["Country", "country"],
  ["Postal Code", "postal_code"],
];
export function KycPage() {
  const currentUser = useAuth((s) => s.user);
  const [activeTab, setActiveTab] = useState("institution");
  // Institution KYC
  const institutionQuery = useInstitutionKycQuery(
    currentUser?.institution?.id,
    activeTab === "institution",
  );
  const instKyc = institutionQuery.data ?? null;
  const instKycLoading = institutionQuery.isLoading;
  const instKycError = institutionQuery.error;
  const [showInstForm, setShowInstForm] = useState(false);
  const [instForm, setInstForm] = useState({});
  const [instSubmitting, setInstSubmitting] = useState(false);
  // User KYC
  const userQuery = useUserKycQuery(currentUser?.id, activeTab === "user");
  const userKyc = userQuery.data ?? null;
  const userKycLoading = userQuery.isLoading;
  const userKycError = userQuery.error;
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({});
  const [userSubmitting, setUserSubmitting] = useState(false);
  const institutionId = currentUser?.institution?.id;
  const userId = currentUser?.id;
  const institutionMutation = useUpdateInstitutionMutation();
  const userMutation = useUserUpdateMutation();
  useEffect(() => {
    if (activeTab === "institution") void institutionQuery.refetch();
    else void userQuery.refetch();
  }, [activeTab]);
  // Institution KYC update goes through PUT /institutions/{id} with kyc field
  const handleInstSubmit = async (e) => {
    e.preventDefault();
    if (!institutionId) return;
    setInstSubmitting(true);
    try {
      await institutionMutation.mutateAsync({ id: institutionId, payload: { kyc: instForm } });
      notifications.success("Institution KYC update submitted for approval");
      setShowInstForm(false);
      setInstForm({});
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Failed to submit KYC update");
    } finally {
      setInstSubmitting(false);
    }
  };
  // User KYC update goes through PUT /users/{id} with kyc field
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setUserSubmitting(true);
    try {
      await userMutation.mutateAsync({ id: userId, payload: { kyc: userForm } });
      notifications.success("User KYC update submitted for approval");
      setShowUserForm(false);
      setUserForm({});
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Failed to submit KYC update");
    } finally {
      setUserSubmitting(false);
    }
  };
  return (
    <div className="pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">
            Compliance
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">KYC</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Know Your Customer records</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            activeTab === "institution" ? setShowInstForm(true) : setShowUserForm(true)
          }
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200/50"
          style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
        >
          <Plus size={14} /> Update KYC
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        {["institution", "user"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
              activeTab === t ? "text-white shadow-md" : "text-slate-500 hover:text-blue-600",
            )}
            style={
              activeTab === t ? { background: "linear-gradient(135deg, #2266EE, #26FFFF)" } : {}
            }
          >
            {t} KYC
          </button>
        ))}
      </div>

      {activeTab === "institution" ? (
        <>
          <AnimatePresence>
            {showInstForm && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl p-6 mb-6"
                style={glass}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-800">Update Institution KYC</h2>
                  <button
                    onClick={() => setShowInstForm(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                <form onSubmit={handleInstSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {instKycFields.map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        {label}
                      </label>
                      <input
                        value={instForm[key] ?? ""}
                        onChange={(e) => setInstForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        style={{
                          background: "var(--glass-bg)",
                          border: "1px solid rgba(108,127,255,0.15)",
                        }}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInstForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={instSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-200/50 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
                    >
                      {instSubmitting ? "Submitting…" : "Submit for Approval"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {instKycError && (
            <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle size={14} />{" "}
              {instKycError instanceof Error
                ? instKycError.message
                : "Failed to load institution KYC"}
              <button
                onClick={() => void institutionQuery.refetch()}
                className="ml-auto text-xs font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {instKycLoading ? (
            <div className="rounded-2xl p-6" style={glass}>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            </div>
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
              <p className="text-xs text-slate-400">Use Update KYC to submit a record</p>
            </div>
          )}
        </>
      ) : (
        <>
          <AnimatePresence>
            {showUserForm && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl p-6 mb-6"
                style={glass}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-800">Update User KYC</h2>
                  <button
                    onClick={() => setShowUserForm(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                <form onSubmit={handleUserSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userKycFields.map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        {label}
                      </label>
                      <input
                        value={userForm[key] ?? ""}
                        onChange={(e) => setUserForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        style={{
                          background: "var(--glass-bg)",
                          border: "1px solid rgba(108,127,255,0.15)",
                        }}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={userSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-200/50 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
                    >
                      {userSubmitting ? "Submitting…" : "Submit for Approval"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {userKycError && (
            <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle size={14} />{" "}
              {userKycError instanceof Error ? userKycError.message : "Failed to load user KYC"}
              <button
                onClick={() => void userQuery.refetch()}
                className="ml-auto text-xs font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {userKycLoading ? (
            <div className="rounded-2xl p-6" style={glass}>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            </div>
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
              <p className="text-xs text-slate-400">Use Update KYC to submit a record</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

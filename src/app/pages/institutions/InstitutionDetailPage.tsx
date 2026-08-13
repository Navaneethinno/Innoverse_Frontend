import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import {
  AlertCircle, ArrowLeft, Pencil, Trash2, Power, PowerOff,
  History, X, CheckCircle, Clock, Building2,
} from "lucide-react";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useUserStore } from "../../features/users/user.store";
import { apiService } from "../../features/api.service";
import type { Institution } from "../../features/institution/institution.types";
import type { InstitutionKycRecord } from "../../features/kyc/kyc.types";
import type { AuditEntryOut } from "../../features/maker-checker.types";
import { Skeleton } from "../../components/ui/skeleton";
import { AuditTimeline } from "../../components/common/AuditTimeline";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LifecycleMutationDialog } from "../../components/common/LifecycleMutationDialog";
import { MakerCheckerConfig } from "../../components/common/MakerCheckerConfig";
import { ChangeViewer } from "../../components/common/ChangeViewer";
import { notifications } from "../../lib/notifications";

// ─── helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 font-medium">{value || "—"}</p>
    </div>
  );
}

function EditField({
  label, value, onChange, readOnly, type = "text", error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  readOnly?: boolean; type?: string; error?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">{label}</label>
      {readOnly ? (
        <p className="text-sm text-slate-400 font-medium bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">{value || "—"}</p>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${error ? "border-red-400" : "border-slate-200"}`}
        />
      )}
      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const PENDING_EDIT_STATUSES = ["EDIT_AUTH", "EDIT_DEAUTH"];

// ─── component ────────────────────────────────────────────────────────────────

export function InstitutionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    fetchInstitutionById, getInstitutionAudit,
    updateInstitution, deleteInstitution, activateInstitution, deactivateInstitution,
    continueRejectedAdd,
  } = useInstitutionStore();
  const { users, fetchUsers } = useUserStore();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [kyc, setKyc] = useState<InstitutionKycRecord | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntryOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal actions
  const [action, setAction] = useState<"delete" | "activate" | "deactivate" | null>(null);
  const [remark, setRemark] = useState("");

  // continue rejected ADD
  const [continueTarget, setContinueTarget] = useState<AuditEntryOut | null>(null);
  const [continueMode, setContinueMode] = useState<"edit" | "delete">("edit");
  const [continueJson, setContinueJson] = useState("");

  // edit mode
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [kycForm, setKycForm] = useState({
    legal_name: "", registration_number: "", tax_id: "",
    email: "", phone: "", website: "",
    address_line1: "", address_line2: "", city: "",
    state: "", country: "", postal_code: "",
  });
  const [checkerConfig, setCheckerConfig] = useState<{
    checker_mode: "ANY" | "ASSIGNED_PARALLEL" | "ASSIGNED_SEQUENTIAL";
    checker_assignments: { user_id: string | number; sequence?: number }[];
    required_checker_count: number;
  }>({
    checker_mode: "ANY",
    checker_assignments: [],
    required_checker_count: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPendingChanges, setShowPendingChanges] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const item = await fetchInstitutionById(id);
    if (!item) {
      setError("Institution not found");
      setIsLoading(false);
      return;
    }
    setInstitution(item);
    setEditName(item.name ?? "");
    setEditRemark("");
    const [kycData, audit] = await Promise.all([
      apiService.getInstitutionKyc(id),
      (async () => { setAuditLoading(true); return getInstitutionAudit(id); })(),
    ]);
    void fetchUsers();
    setKyc(kycData);
    if (kycData) {
      setKycForm({
        legal_name: kycData.legal_name ?? "",
        registration_number: kycData.registration_number ?? "",
        tax_id: kycData.tax_id ?? "",
        email: kycData.email ?? "",
        phone: kycData.phone ?? "",
        website: kycData.website ?? "",
        address_line1: kycData.address_line1 ?? "",
        address_line2: kycData.address_line2 ?? "",
        city: kycData.city ?? "",
        state: kycData.state ?? "",
        country: kycData.country ?? "",
        postal_code: kycData.postal_code ?? "",
      });
    }
    setAuditEntries(audit);
    setAuditLoading(false);
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const makerPending = useMemo(
    () => auditEntries.find((e) => e.action === "ADD" && e.auth_status === "REJECTED"),
    [auditEntries],
  );

  const hasPendingEdit = useMemo(
    () => institution && PENDING_EDIT_STATUSES.includes(institution.auth_status ?? ""),
    [institution],
  );

  const pendingEditEntry = useMemo(
    () => hasPendingEdit
      ? [...auditEntries]
          .sort((a, b) => (b.sequence_no ?? 0) - (a.sequence_no ?? 0))
          .find((e) => e.action === "EDIT" && e.event_type === "REQUEST")
      : undefined,
    [auditEntries, hasPendingEdit],
  );

  // ─── edit mode submit ──────────────────────────────────────────────────────

  const handleSubmitEdit = async () => {
    if (!id || !institution) return;

    const errors: Record<string, string> = {};
    if (!editName.trim()) errors.name = "Institution name is required.";
    if (kycForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kycForm.email))
      errors.email = "Enter a valid email address.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    setSubmitting(true);

    const res = await updateInstitution(id, {
      name: editName || null,
      remark: editRemark || null,
      kyc: {
        legal_name: kycForm.legal_name || null,
        registration_number: kycForm.registration_number || null,
        tax_id: kycForm.tax_id || null,
        email: kycForm.email || null,
        phone: kycForm.phone || null,
        website: kycForm.website || null,
        address_line1: kycForm.address_line1 || null,
        address_line2: kycForm.address_line2 || null,
        city: kycForm.city || null,
        state: kycForm.state || null,
        country: kycForm.country || null,
        postal_code: kycForm.postal_code || null,
      },
      checker_mode: checkerConfig.checker_mode,
      checker_assignments: checkerConfig.checker_assignments,
      required_checker_count: checkerConfig.required_checker_count,
    });

    setSubmitting(false);
    if (res) {
      notifications.success("Update submitted for authorization. The institution's current authorized information will remain unchanged until the request is approved.");
      setEditMode(false);
      void load();
    } else {
      notifications.error(useInstitutionStore.getState().error ?? "Failed to submit update");
    }
  };

  const handleCancelEdit = () => {
    if (!institution) return;
    setEditName(institution.name ?? "");
    setEditRemark("");
    if (kyc) {
      setKycForm({
        legal_name: kyc.legal_name ?? "",
        registration_number: kyc.registration_number ?? "",
        tax_id: kyc.tax_id ?? "",
        email: kyc.email ?? "",
        phone: kyc.phone ?? "",
        website: kyc.website ?? "",
        address_line1: kyc.address_line1 ?? "",
        address_line2: kyc.address_line2 ?? "",
        city: kyc.city ?? "",
        state: kyc.state ?? "",
        country: kyc.country ?? "",
        postal_code: kyc.postal_code ?? "",
      });
    }
    setFieldErrors({});
    setCheckerConfig({ checker_mode: "ANY", checker_assignments: [], required_checker_count: 1 });
    setEditMode(false);
  };

  // modal actions

  const submitAction = async () => {
    if (!id || !action) return;
    const payload = { remark: remark || null };
    let result = null;
    if (action === "delete") result = await deleteInstitution(id, payload);
    if (action === "activate") result = await activateInstitution(id, payload);
    if (action === "deactivate") result = await deactivateInstitution(id, payload);
    if (result) {
      notifications.success("Request submitted for approval");
      setAction(null);
      void load();
    } else {
      notifications.error(useInstitutionStore.getState().error ?? "Failed to submit request");
    }
  };

  const submitContinue = async () => {
    if (!continueTarget) return;
    const after_data = continueMode === "delete" ? null : (continueJson ? JSON.parse(continueJson) : undefined);
    const result = await continueRejectedAdd(
      String(continueTarget.request_id),
      { after_data: after_data ?? undefined, remark: remark || null },
      continueMode,
    );
    if (result) {
      notifications.success("Rejected ADD continued");
      setContinueTarget(null);
      void load();
    } else {
      notifications.error(useInstitutionStore.getState().error ?? "Failed to continue rejected ADD");
    }
  };

  // ─── render ────────────────────────────────────────────────────────────────

  if (isLoading || !institution) {
    return (
      <div className="pt-4 pb-8 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
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

  const kf = (k: keyof typeof kycForm) => kycForm[k];
  const setKf = (k: keyof typeof kycForm) => (v: string) => setKycForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="pt-4 pb-8 space-y-5">

      {/* ── top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => navigate("/institutions")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700"
        >
          <ArrowLeft size={13} /> Institutions
        </button>

        {editMode ? (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-slate-600 hover:bg-slate-50"
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={() => void handleSubmitEdit()}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
            >
              <CheckCircle size={13} /> {submitting ? "Submitting…" : "Submit for Approval"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { if (!hasPendingEdit) setEditMode(true); }}
              disabled={!!hasPendingEdit}
              title={hasPendingEdit ? "An edit is already pending approval" : undefined}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => { setAction("delete"); setRemark(""); }}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 hover:bg-slate-50"
            >
              <Trash2 size={13} /> Delete
            </button>
            {institution.status !== "ACTIVE" && (
              <button
                onClick={() => { setAction("activate"); setRemark(""); }}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 hover:bg-slate-50"
              >
                <Power size={13} /> Activate
              </button>
            )}
            {institution.status !== "INACTIVE" && (
              <button
                onClick={() => { setAction("deactivate"); setRemark(""); }}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 hover:bg-slate-50"
              >
                <PowerOff size={13} /> Deactivate
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── header card ── */}
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6C7FFF22 0%, #B39DFA22 100%)" }}>
            <Building2 size={20} className="text-indigo-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">{institution.name}</h1>
            <p className="text-xs text-slate-400 font-mono">{institution.code}</p>
            <p className="text-xs text-slate-500 mt-0.5">Type: {institution.type}</p>
          </div>
        </div>
        <StatusBadge status={institution.auth_status ?? institution.status ?? ""} />
      </div>

      {/* -- pending edit banner -- */}
      {hasPendingEdit && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-amber-50 border border-amber-200 overflow-hidden"
        >
          <div className="px-4 py-3 flex items-start gap-3">
            <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-700">Pending Changes</p>
              <p className="text-[11px] text-amber-600">Awaiting authorization. The current authorized values are shown below.</p>
              {pendingEditEntry && (
                <button
                  onClick={() => setShowPendingChanges((v) => !v)}
                  className="mt-1.5 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 underline"
                >
                  {showPendingChanges ? "Hide Proposed Changes" : "View Proposed Changes"}
                </button>
              )}
            </div>
          </div>
          {showPendingChanges && pendingEditEntry && (
            <div className="px-4 pb-4">
              <ChangeViewer
                action="EDIT"
                before_data={pendingEditEntry.before_data}
                after_data={pendingEditEntry.after_data}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* ── institution information ── */}
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">Institution Information</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {editMode ? (
            <>
              <EditField label="Institution Code" value={institution.code} onChange={() => {}} readOnly />
              <EditField label="Institution Name" value={editName} onChange={setEditName} error={fieldErrors.name} />
              <EditField label="Institution Type" value={institution.type} onChange={() => {}} readOnly />
              <div className="col-span-2 sm:col-span-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Remark</label>
                <textarea
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  placeholder="Optional remark for this change"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[72px] resize-none"
                />
              </div>
            </>
          ) : (
            <>
              <Field label="Institution Code" value={institution.code} />
              <Field label="Institution Name" value={institution.name} />
              <Field label="Institution Type" value={institution.type} />
            </>
          )}
        </div>
      </div>

      {/* ── KYC information ── */}
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">Institution KYC</h2>

        {/* Contact & Identity */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Contact &amp; Identity</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {editMode ? (
              <>
                <EditField label="Legal Name" value={kf("legal_name")} onChange={setKf("legal_name")} />
                <EditField label="Registration Number" value={kf("registration_number")} onChange={setKf("registration_number")} />
                <EditField label="Tax ID" value={kf("tax_id")} onChange={setKf("tax_id")} />
                <EditField label="Email" value={kf("email")} onChange={setKf("email")} type="email" error={fieldErrors.email} />
                <EditField label="Phone" value={kf("phone")} onChange={setKf("phone")} />
                <EditField label="Website" value={kf("website")} onChange={setKf("website")} />
              </>
            ) : (
              <>
                <Field label="Legal Name" value={kyc?.legal_name} />
                <Field label="Registration Number" value={kyc?.registration_number} />
                <Field label="Tax ID" value={kyc?.tax_id} />
                <Field label="Email" value={kyc?.email} />
                <Field label="Phone" value={kyc?.phone} />
                <Field label="Website" value={kyc?.website} />
              </>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Address */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Address</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {editMode ? (
              <>
                <div className="col-span-2 sm:col-span-3">
                  <EditField label="Address Line 1" value={kf("address_line1")} onChange={setKf("address_line1")} />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <EditField label="Address Line 2" value={kf("address_line2")} onChange={setKf("address_line2")} />
                </div>
                <EditField label="City" value={kf("city")} onChange={setKf("city")} />
                <EditField label="State" value={kf("state")} onChange={setKf("state")} />
                <EditField label="Country" value={kf("country")} onChange={setKf("country")} />
                <EditField label="Postal Code" value={kf("postal_code")} onChange={setKf("postal_code")} />
              </>
            ) : (
              <>
                <div className="col-span-2 sm:col-span-3">
                  <Field label="Address Line 1" value={kyc?.address_line1} />
                </div>
                {kyc?.address_line2 && (
                  <div className="col-span-2 sm:col-span-3">
                    <Field label="Address Line 2" value={kyc.address_line2} />
                  </div>
                )}
                <Field label="City" value={kyc?.city} />
                <Field label="State" value={kyc?.state} />
                <Field label="Country" value={kyc?.country} />
                <Field label="Postal Code" value={kyc?.postal_code} />
              </>
            )}
          </div>
        </div>

        {/* checker config — edit mode only */}
        {editMode && (
          <MakerCheckerConfig
            value={checkerConfig}
            onChange={setCheckerConfig}
            candidates={users.map((u) => ({ id: u.id, name: u.username, institution_id: u.institution?.id }))}
            showTitle
          />
        )}

        {/* edit mode bottom actions */}
        {editMode && (
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSubmitEdit()}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
            >
              {submitting ? "Submitting…" : "Submit for Approval"}
            </button>
          </div>
        )}
      </div>

      {/* ── lifecycle history ── */}
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80">
        <div className="flex items-center gap-2 mb-4">
          <History size={14} className="text-indigo-500" />
          <h2 className="text-sm font-bold">Lifecycle History</h2>
        </div>
        {makerPending && (
          <p className="mb-3 text-xs text-amber-600">
            Rejected ADD available for continuation (audit key: {makerPending.audit_key})
          </p>
        )}
        <AuditTimeline
          entries={auditEntries}
          isLoading={auditLoading}
          onContinueRejectedAdd={(entry) => {
            setContinueTarget(entry);
            setContinueMode("edit");
            setContinueJson(JSON.stringify(entry.after_data ?? {}, null, 2));
            setRemark("");
          }}
        />
      </div>

      {/* ── modal: delete / activate / deactivate ── */}
      {action && (
        <LifecycleMutationDialog
          open={true}
          title={`Institution ${action.charAt(0).toUpperCase() + action.slice(1)}`}
          onClose={() => setAction(null)}
          onSubmit={() => void submitAction()}
          checkerConfig={{ checker_mode: "ANY", checker_assignments: [], required_checker_count: 1 }}
          setCheckerConfig={() => {}}
          candidates={[]}
          showCheckerConfig={false}
        >
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Remark (optional)"
            className="w-full rounded-xl border px-3 py-2 text-sm min-h-24 resize-none"
          />
        </LifecycleMutationDialog>
      )}

      {/* ── modal: continue rejected ADD ── */}
      {continueTarget && (
        <LifecycleMutationDialog
          open={true}
          title="Continue Rejected ADD"
          onClose={() => setContinueTarget(null)}
          onSubmit={() => void submitContinue()}
          checkerConfig={{ checker_mode: "ANY", checker_assignments: [], required_checker_count: 1 }}
          setCheckerConfig={() => {}}
          candidates={[]}
          showCheckerConfig={false}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContinueMode("edit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${continueMode === "edit" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-slate-200"}`}
              >
                Edit continuation
              </button>
              <button
                type="button"
                onClick={() => setContinueMode("delete")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${continueMode === "delete" ? "border-red-400 text-red-600 bg-red-50" : "border-slate-200"}`}
              >
                Delete continuation
              </button>
            </div>
            {continueMode === "edit" && (
              <textarea
                value={continueJson}
                onChange={(e) => setContinueJson(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm min-h-40 font-mono resize-none"
              />
            )}
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Remark (optional)"
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-20 resize-none"
            />
          </div>
        </LifecycleMutationDialog>
      )}
    </div>
  );
}

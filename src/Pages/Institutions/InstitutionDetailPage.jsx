import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  History,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Skeleton } from "@/Components/UI/skeleton";
import { InstitutionAuditModal } from "@/Components/Institutions/InstitutionAuditModal";
import { DateFormatField } from "@/Components/Institutions/DateFormatField";
import {
  useInstitutionAuthMutation,
  useInstitutionDeauthMutation,
  useInstitutionDeleteAuthMutation,
  useInstitutionDeleteMutation,
  useInstitutionUpdateMutation,
  useInstitutionsQuery,
} from "@/Hooks/Institutions/institutionHooks";
import { notifications } from "@/Utils/Lib/notifications";

// GAP: the confirmed Postman collection ("Institution/Profile" folder) has
// no GET/get-by-id endpoint — only list, get_active, add, edit, auth,
// deauth, delete, delete_auth and audit. So this page locates the record by
// scanning a /institution/profile/list page for a matching id, the same way
// the list page renders it, rather than calling an endpoint that does not
// exist. If the institution isn't present in that page of results the page
// reports "not found" — this is a known limitation until a dedicated
// get-by-id (or a `list` filtered by id) endpoint is confirmed.
function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-700 font-medium">
        {typeof value === "boolean" ? (value ? "Yes" : "No") : (value ?? "—")}
      </p>
    </div>
  );
}
function EditField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    </div>
  );
}
function EditToggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
function institutionId(inst) {
  return inst?.id ?? inst?.inst_id ?? inst?.institution_id;
}

export function InstitutionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const institutionsQuery = useInstitutionsQuery({ page: 1, limit: 100 });
  const updateMutation = useInstitutionUpdateMutation();
  const authMutation = useInstitutionAuthMutation();
  const deauthMutation = useInstitutionDeauthMutation();
  const deleteMutation = useInstitutionDeleteMutation();
  const deleteAuthMutation = useInstitutionDeleteAuthMutation();

  const institution = useMemo(
    () => (institutionsQuery.data ?? []).find((i) => String(institutionId(i)) === String(id)),
    [institutionsQuery.data, id],
  );

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [action, setAction] = useState(null);
  const [description, setDescription] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (institution && !editMode) {
      setForm({
        code: institution.code ?? "",
        name: institution.name ?? "",
        type: institution.type ?? "",
        timezone: institution.timezone ?? "",
        date_format: institution.date_format ?? "",
        has_branch: Boolean(institution.has_branch),
        max_branches_allowed: institution.max_branches_allowed ?? 0,
        kyc_enabled: Boolean(institution.kyc_enabled),
        total_kyc_levels: institution.total_kyc_levels ?? 0,
        allow_downgrade_kyc: Boolean(institution.allow_downgrade_kyc),
        auto_approve_kyc_level: institution.auto_approve_kyc_level ?? 0,
        primary_login_identifier: institution.primary_login_identifier ?? "",
        is_login_pin_enabled: Boolean(institution.is_login_pin_enabled),
        login_pin_length: institution.login_pin_length ?? 0,
        login_pin_type: institution.login_pin_type ?? "",
        allow_biometric_login: Boolean(institution.allow_biometric_login),
        is_txn_pin_enabled: Boolean(institution.is_txn_pin_enabled),
        txn_pin_length: institution.txn_pin_length ?? 0,
        is_same_login_txn_pin_allowed: Boolean(institution.is_same_login_txn_pin_allowed),
      });
    }
  }, [institution, editMode]);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmitEdit = async () => {
    if (!id || !form) return;
    setSubmitting(true);
    let result = null;
    try {
      result = await updateMutation.mutateAsync({
        id,
        ...form,
        language: institution?.language ?? [],
        allowed_login_identifiers: institution?.allowed_login_identifiers ?? [],
        max_branches_allowed: Number(form.max_branches_allowed) || 0,
        total_kyc_levels: Number(form.total_kyc_levels) || 0,
        auto_approve_kyc_level: Number(form.auto_approve_kyc_level) || 0,
        login_pin_length: Number(form.login_pin_length) || 0,
        txn_pin_length: Number(form.txn_pin_length) || 0,
      });
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Failed to submit update");
    }
    setSubmitting(false);
    if (result) {
      notifications.success(
        "Update submitted for authorization. Current authorized values remain unchanged until approved.",
      );
      setEditMode(false);
      void institutionsQuery.refetch();
    }
  };

  const runAction = async () => {
    if (!action || !id) return;
    try {
      if (action === "auth") await authMutation.mutateAsync({ id });
      if (action === "deauth") await deauthMutation.mutateAsync({ id, description });
      if (action === "delete") await deleteMutation.mutateAsync({ id });
      if (action === "deleteAuth") await deleteAuthMutation.mutateAsync({ id });
      notifications.success("Request submitted");
      setAction(null);
      setDescription("");
      void institutionsQuery.refetch();
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };
  const actionPending =
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending;

  if (institutionsQuery.isLoading || !form) {
    return (
      <div className="pt-4 pb-8 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }
  if (!institution) {
    return (
      <div className="pt-4 flex flex-col items-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-400" />
        </div>
        <p className="text-sm font-bold text-slate-700">Institution not found</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          There is no get-by-id endpoint for institution profiles — this page looks the record up
          in the current /institution/profile/list page. It may be outside that page's results.
        </p>
        <button
          onClick={() => navigate("/institutions")}
          className="mt-3 text-xs font-bold text-blue-500 underline"
        >
          Back to Institutions
        </button>
      </div>
    );
  }
  const status = String(institution.auth_status ?? institution.status ?? "").toUpperCase();

  return (
    <div className="pt-4 pb-8 space-y-5">
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
              onClick={() => setEditMode(false)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-slate-600 hover:bg-slate-50"
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={() => void handleSubmitEdit()}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-60"
              style={{ background: "#2266EE" }}
            >
              {submitting ? "Submitting…" : "Submit for Approval"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 hover:bg-slate-50"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => setAuditOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 hover:bg-slate-50"
            >
              <History size={13} /> Audit
            </button>
            <button
              onClick={() => {
                setAction("auth");
                setDescription("");
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-emerald-600 hover:bg-emerald-50"
            >
              <ShieldCheck size={13} /> Authorize
            </button>
            <button
              onClick={() => {
                setAction("deauth");
                setDescription("");
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-amber-600 hover:bg-amber-50"
            >
              <ShieldOff size={13} /> Deauthorize
            </button>
            <button
              onClick={() => {
                setAction("delete");
                setDescription("");
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete
            </button>
            {/* DEL_WAIT_AUTH mirrors the confirmed-live EDIT_WAIT_AUTH naming
                pattern seen in a real /institution/profile/audit response;
                DEL_AUTH is kept as the originally-guessed fallback since
                only the EDIT variant has been independently confirmed. */}
            {(status === "DEL_AUTH" || status === "DEL_WAIT_AUTH") && (
              <button
                onClick={() => {
                  setAction("deleteAuth");
                  setDescription("");
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-red-700 hover:bg-red-50"
              >
                Confirm Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #2266EE22 0%, #26FFFF22 100%)" }}
          >
            <Building2 size={20} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">{institution.name}</h1>
            <p className="text-xs text-slate-400 font-mono">{institution.code}</p>
            <p className="text-xs text-slate-500 mt-0.5">Type: {institution.type}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">Institution Information</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {editMode ? (
            <>
              <Field label="Institution Code" value={institution.code} />
              <EditField label="Institution Name" value={form.name} onChange={setField("name")} />
              <Field label="Institution Type" value={institution.type} />
              <EditField
                label="Timezone"
                value={form.timezone}
                onChange={setField("timezone")}
              />
              <DateFormatField value={form.date_format} onChange={setField("date_format")} />
              <EditToggle
                label="Has Branch"
                value={form.has_branch}
                onChange={setField("has_branch")}
              />
            </>
          ) : (
            <>
              <Field label="Institution Code" value={institution.code} />
              <Field label="Institution Name" value={institution.name} />
              <Field label="Institution Type" value={institution.type} />
              <Field label="Timezone" value={institution.timezone} />
              <Field label="Date Format" value={institution.date_format} />
              <Field label="Has Branch" value={institution.has_branch} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">KYC & Login Policy</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {editMode ? (
            <>
              <EditToggle
                label="KYC Enabled"
                value={form.kyc_enabled}
                onChange={setField("kyc_enabled")}
              />
              <EditField
                label="Total KYC Levels"
                type="number"
                value={form.total_kyc_levels}
                onChange={setField("total_kyc_levels")}
              />
              <EditToggle
                label="Allow Downgrade KYC"
                value={form.allow_downgrade_kyc}
                onChange={setField("allow_downgrade_kyc")}
              />
              <EditField
                label="Primary Login Identifier"
                value={form.primary_login_identifier}
                onChange={setField("primary_login_identifier")}
              />
              <EditToggle
                label="Login PIN Enabled"
                value={form.is_login_pin_enabled}
                onChange={setField("is_login_pin_enabled")}
              />
              <EditToggle
                label="Biometric Login"
                value={form.allow_biometric_login}
                onChange={setField("allow_biometric_login")}
              />
              <EditToggle
                label="Txn PIN Enabled"
                value={form.is_txn_pin_enabled}
                onChange={setField("is_txn_pin_enabled")}
              />
              <EditToggle
                label="Same Login/Txn PIN"
                value={form.is_same_login_txn_pin_allowed}
                onChange={setField("is_same_login_txn_pin_allowed")}
              />
            </>
          ) : (
            <>
              <Field label="KYC Enabled" value={institution.kyc_enabled} />
              <Field label="Total KYC Levels" value={institution.total_kyc_levels} />
              <Field label="Allow Downgrade KYC" value={institution.allow_downgrade_kyc} />
              <Field
                label="Primary Login Identifier"
                value={institution.primary_login_identifier}
              />
              <Field label="Login PIN Enabled" value={institution.is_login_pin_enabled} />
              <Field label="Biometric Login" value={institution.allow_biometric_login} />
              <Field label="Txn PIN Enabled" value={institution.is_txn_pin_enabled} />
              <Field
                label="Same Login/Txn PIN"
                value={institution.is_same_login_txn_pin_allowed}
              />
            </>
          )}
        </div>
        {editMode && (
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setEditMode(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSubmitEdit()}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-200/50 disabled:opacity-60"
              style={{ background: "#2266EE" }}
            >
              {submitting ? "Submitting…" : "Submit for Approval"}
            </button>
          </div>
        )}
      </div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-800 mb-3">Confirm {action}</h2>
            <p className="text-sm text-slate-600">
              {action} institution <strong>{institution.name}</strong>?
            </p>
            {action === "deauth" && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason (required)"
                className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAction(null);
                  setDescription("");
                }}
                className="rounded-xl px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={actionPending || (action === "deauth" && !description.trim())}
                onClick={() => void runAction()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {actionPending ? "Working..." : "Confirm"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {auditOpen && (
        <InstitutionAuditModal
          institution={institution}
          institutionId={id}
          onClose={() => setAuditOpen(false)}
        />
      )}
    </div>
  );
}

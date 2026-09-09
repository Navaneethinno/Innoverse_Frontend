import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Building2, FileEdit, X } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Skeleton } from "@/Components/UI/skeleton";
import {
  useHasInstitutionAction,
  useInstitutionUpdateMutation,
  useInstitutionsQuery,
} from "@/Hooks/Institutions/institutionHooks";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";
import { Field, institutionId } from "./InstitutionProfileForm";
import { EditInstitutionProfile } from "./EditInstitutionProfile";

// GAP: the confirmed Postman collection ("Institution/Profile" folder) has
// no GET/get-by-id endpoint — only list, get_active, add, edit, auth,
// deauth, delete, delete_auth and audit. So this page locates the record by
// scanning a /institution/profile/list page for a matching id, the same way
// the list page renders it, rather than calling an endpoint that does not
// exist. If the institution isn't present in that page of results the page
// reports "not found" — this is a known limitation until a dedicated
// get-by-id (or a `list` filtered by id) endpoint is confirmed.
//
// This page is view-only plus (when linked to with ?edit=1) the edit form —
// Audit/Authorize/Deauthorize/Delete/Submit Draft all live exclusively in
// the list's Actions column now, not duplicated here as a second button
// bar. Edit is reached via the list's own pencil icon.
export function ViewInstitutionProfile() {
  const { id } = useParams();
  const numericId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const institutionsQuery = useInstitutionsQuery({ page: 1, limit: 100 });
  const updateMutation = useInstitutionUpdateMutation();

  // Real permission source — same menu_array the sidebar itself reads.
  // Guards against landing here via a hand-typed ?edit=1 without the grant,
  // even though the list only ever links here with it when canEdit is true.
  const canEdit = useHasInstitutionAction("Edit");

  const institution = useMemo(
    () => (institutionsQuery.data ?? []).find((i) => String(institutionId(i)) === String(id)),
    [institutionsQuery.data, id],
  );
  // Single source of truth for the visible status badge — auth_status ??
  // status is the exact chain used everywhere else in this codebase.
  const status = String(institution?.auth_status ?? institution?.status ?? "").toUpperCase();
  // Confirmed against a real record's raw response: entity status is a
  // numeric code (INSTITUTION_DRAFT_STATUS_CODE, in Constant.jsx and
  // env-overridable) meaning Draft (not yet submitted) — "DRAFT" as a
  // literal string is not what the field actually holds, so status===
  // "DRAFT" alone was silently never true. Numeric check is now primary;
  // the string is kept only as a tolerant fallback in case some other
  // response shape does send it as text.
  const isDraft = Number(institution?.status) === INSTITUTION_DRAFT_STATUS_CODE || status === "DRAFT";

  // Starts false regardless of the URL param — entering edit mode is
  // decided by the effect below, which actually checks canEdit, so a
  // hand-typed ?edit=1 without the grant never enables it.
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const exitEditMode = () => {
    setEditMode(false);
    if (searchParams.get("edit")) {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (searchParams.get("edit") === "1" && canEdit) setEditMode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canEdit]);

  useEffect(() => {
    // !editMode: normal case, keep the read-mode form silently fresh in the
    // background. !form: landing directly in edit mode via ?edit=1 from the
    // list's pencil icon — editMode is already true on the very first
    // render then, so without this the form would never populate at all
    // (permanently stuck on the loading skeleton, since that only clears
    // once `form` is set) and would never fire once form exists, so an
    // in-progress edit is never clobbered by a background list refetch.
    if (institution && (!editMode || !form)) {
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
        narration: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution, editMode]);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // isDraftEdit: only meaningful when editing an Active/Rejected-Edit
  // record — stages a Draft Edit (process_status -> Draft, no checker
  // yet) instead of submitting to Pending Edit immediately. Irrelevant
  // (and not sent) when the record is already a Draft, since the backend
  // infers "apply immediately, no lifecycle change" from the record's own
  // state in that case regardless of this flag.
  const handleSubmitEdit = async (isDraftEdit = false) => {
    if (!Number.isInteger(numericId) || !form) return;
    setSubmitting(true);
    let result = null;
    try {
      const language = institution?.language ?? { default: "en", supported: ["en"] };
      // Confirmed shape is an object of booleans keyed by identifier name
      // (e.g. { "email": true, "mobile": true }) — not editable on this
      // screen, so passed through as-is rather than reconstructed.
      const allowedLoginIdentifiers = institution?.allowed_login_identifiers ?? {};
      result = await updateMutation.mutateAsync({
        id: numericId,
        ...form,
        type: Number(form.type) || 1,
        language: Array.isArray(language)
          ? { default: language[0] ?? "en", supported: language }
          : language,
        allowed_login_identifiers: allowedLoginIdentifiers,
        max_branches_allowed: Number(form.max_branches_allowed) || 0,
        total_kyc_levels: Number(form.total_kyc_levels) || 0,
        auto_approve_kyc_level: Boolean(Number(form.auto_approve_kyc_level)),
        login_pin_length: Number(form.login_pin_length) || 0,
        txn_pin_length: Number(form.txn_pin_length) || 0,
        narration: (form.narration ?? "").trim(),
        is_draft: isDraft ? undefined : isDraftEdit,
        // Optional stale-write guard — rejected with 409 if the record
        // changed since this page loaded it.
        expected_updated_time: institution?.updated_time,
      });
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Failed to submit update");
    }
    setSubmitting(false);
    if (result) {
      notifications.success(
        apiMessage(
          result,
          isDraft
            ? "Draft saved."
            : isDraftEdit
              ? "Saved as a draft edit — call Submit when ready for checker review."
              : "Update submitted for authorization. Current authorized values remain unchanged until approved.",
        ),
      );
      exitEditMode();
      void institutionsQuery.refetch();
    }
  };

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

  return (
    <div className="pt-4 pb-8 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => navigate("/institutions")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700"
        >
          <ArrowLeft size={13} /> Institutions
        </button>

        {editMode && (
          <div className="flex gap-2">
            <button
              onClick={exitEditMode}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-slate-600 hover:bg-slate-50"
            >
              <X size={13} /> Cancel
            </button>
            {!isDraft && (
              <button
                onClick={() => void handleSubmitEdit(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                <FileEdit size={13} /> Save as Draft Edit
              </button>
            )}
            <button
              onClick={() => void handleSubmitEdit(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-60"
              style={{ background: "#2266EE" }}
            >
              {submitting ? "Saving…" : isDraft ? "Save Draft" : "Submit for Approval"}
            </button>
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
            <p className="text-xs text-slate-500 mt-0.5">Type: {institution.type_name ?? institution.type}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {isDraft && !editMode && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <FileEdit size={15} className="text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800">This record is a Draft</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Only visible to you until you submit it for checker review. Use Submit Draft from the
              Institutions list when ready.
            </p>
          </div>
        </div>
      )}

      {editMode ? (
        <EditInstitutionProfile institution={institution} form={form} setField={setField} />
      ) : (
        <>
          <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
            <h2 className="text-sm font-bold text-slate-700">Institution Information</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Institution Code" value={institution.code} />
              <Field label="Institution Name" value={institution.name} />
              <Field label="Institution Type" value={institution.type_name ?? institution.type} />
              <Field label="Timezone" value={institution.timezone} />
              <Field label="Date Format" value={institution.date_format} />
              <Field label="Has Branch" value={institution.has_branch} />
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
            <h2 className="text-sm font-bold text-slate-700">KYC & Login Policy</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="KYC Enabled" value={institution.kyc_enabled} />
              <Field label="Total KYC Levels" value={institution.total_kyc_levels} />
              <Field label="Allow Downgrade KYC" value={institution.allow_downgrade_kyc} />
              <Field label="Primary Login Identifier" value={institution.primary_login_identifier} />
              <Field label="Login PIN Enabled" value={institution.is_login_pin_enabled} />
              <Field label="Biometric Login" value={institution.allow_biometric_login} />
              <Field label="Txn PIN Enabled" value={institution.is_txn_pin_enabled} />
              <Field label="Same Login/Txn PIN" value={institution.is_same_login_txn_pin_allowed} />
            </div>
          </div>
        </>
      )}

      {editMode && (
        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={exitEditMode}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          {!isDraft && (
            <button
              onClick={() => void handleSubmitEdit(true)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Save as Draft Edit
            </button>
          )}
          <button
            onClick={() => void handleSubmitEdit(false)}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-200/50 disabled:opacity-60"
            style={{ background: "#2266EE" }}
          >
            {submitting ? "Saving…" : isDraft ? "Save Draft" : "Submit for Approval"}
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { FileUploadField } from "@/Components/Common/FileUploadField";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { institutionBrandingApi } from "@/Services/Institution/institutionBranding.api";
import {
  useInstitutionBrandingMutation,
  useInstitutionBrandingsQuery,
} from "@/Hooks/Institution/institutionBrandingHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institution/institutionHooks";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { useAuth } from "@/Hooks/useAuth";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";

const FIELDS = [
  ["display_name", "Display Name"],
  ["logo", "Logo"],
  ["favicon", "Favicon"],
  ["primary_color", "Primary Color"],
  ["secondary_color", "Secondary Color"],
  ["login_background", "Login Background"],
  ["email_header", "Email Header"],
  ["email_footer", "Email Footer"],
  ["receipt_header", "Receipt Header"],
  ["receipt_footer", "Receipt Footer"],
  ["statement_header", "Statement Header"],
  ["statement_footer", "Statement Footer"],
];
const value = (row, key) => row?.[key] ?? "—";
const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
const COLOR_NAMES = {
  "#d82222": "Red",
  "#b90e0e": "Dark red",
  "#2563eb": "Blue",
  "#dbeafe": "Light blue",
  "#ffffff": "White",
  "#000000": "Black",
};
const colorName = (color) => COLOR_NAMES[String(color ?? "").toLowerCase()] ?? "Custom color";
// Backend's logo/favicon fields are plain strings (confirmed: no file-
// upload/asset-storage endpoint exists anywhere in this API's Postman
// collection) — so "uploading" here reads the chosen file client-side and
// stores it as a data: URL in that same string field, rendered identically
// to an already-hosted external URL a legacy record might still have. The
// actual upload control (preview, uploading animation, view/replace/remove)
// now lives in the shared FileUploadField — see that file's comment for why
// this is the one place every upload surface in the app should render
// through, instead of each page hand-rolling its own.
const MAX_IMAGE_BYTES = 500 * 1024;
function ColorValue({ color }) {
  if (!color) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-5 w-5 shrink-0 rounded-md border border-slate-300 shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span>{color}</span>
      <span className="text-xs font-medium text-muted-foreground">({colorName(color)})</span>
    </span>
  );
}
function BrandingActions({ row, onRefresh, onEdit }) {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const canEdit = useHasInstitutionAction("Edit");
  const canAuthorize = useHasInstitutionAction("Authorize");
  const canDelete = useHasInstitutionAction("Delete");
  const canChangeStatus = useHasInstitutionAction("Change Status");
  const [action, setAction] = useState(null);
  const [details, setDetails] = useState(null);
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const mutation = useInstitutionBrandingMutation(action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    institutionBrandingApi.pending,
    row.id,
    !!action && ["auth", "deauth", "deleteAuth"].includes(action.method),
  );
  // Single shared status-based visibility engine — see buttonVisibility.js
  // for the full status_name/process_status_name matrix this is built from.
  const buttons = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete });
  const execute = async () => {
    try {
      await mutation.mutateAsync({ id: row.id, narration: narration.trim() });
      await onRefresh();
      setAction(null);
      setNarration("");
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  const pendingType = buttons.isPendingDelete ? "deleteAuth" : "auth";
  return (
    <>
      <RowActions
        buttons={buttons}
        onView={() => setDetails(row)}
        onEdit={onEdit}
        onAudit={() => setAudit(true)}
        onSubmit={() => setAction({ method: "submit", label: "Submit" })}
        onAuthorize={() => setAction({ method: pendingType, label: "Authorize" })}
        onDeauthorize={() => setAction({ method: "deauth", label: "Deauthorize" })}
        onDeactivate={() => setAction({ method: "deactivate", label: "Deactivate" })}
        onReactivate={() => setAction({ method: "reactivate", label: "Activate" })}
        onDelete={() => setAction({ method: "delete", label: "Delete" })}
      />
      <ConfirmDialog
        open={!!action}
        title={`${action?.label ?? "Action"} institution branding`}
        confirmLabel={action?.label}
        destructive={["deauth", "delete", "deleteAuth"].includes(action?.method)}
        pending={mutation.isPending}
        confirmDisabled={action?.method === "deauth" && !narration.trim()}
        onClose={() => setAction(null)}
        onConfirm={() => void execute()}
      >
        {["auth", "deauth", "deleteAuth"].includes(action?.method) && <PendingChangesDiff {...pendingInfo} />}
        {action?.method !== "pending" && (
          <textarea
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Narration"
            className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm"
          />
        )}
      </ConfirmDialog>
      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title={tr("View institution branding")}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground">{tr(label)}</p>
              <div className="mt-1 break-words text-sm font-semibold text-foreground">
                {key.includes("color") ? (
                  <ColorValue color={details?.[key]} />
                ) : key === "logo" || key === "favicon" ? (
                  details?.[key] ? (
                    <img src={details[key]} alt="" className="h-10 w-10 rounded-lg border border-border object-contain bg-white" />
                  ) : (
                    "—"
                  )
                ) : (
                  value(details, key)
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <StatusBadge
            status={String(details?.status_name ?? details?.auth_status ?? details?.status ?? "")}
          />
        </div>
      </Modal>
      {audit && (
        <AuditModal
          title={row.display_name ?? `Branding #${row.id}`}
          fields={FIELDS}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            institutionBrandingApi.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}

export function InstitutionBranding() {
  const tr = useConfigLabel();
  const currentUser = useAuth((s) => s.user);
  const { colors: liveBrandColors, setBrandTheme } = useBrandTheme();
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionBrandingsQuery();
  const institutions = useActiveInstitutionsQuery();
  const add = useInstitutionBrandingMutation("add");
  const edit = useInstitutionBrandingMutation("edit");
  const submitDraft = useInstitutionBrandingMutation("submit");
  const filteredRows =
    !search.trim() && statusFilter === "all"
      ? query.data
      : query.data.filter(
          (row) =>
            (statusFilter === "all" || statusBucket(row) === statusFilter) &&
            JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase()),
        );
  const columns = [
    {
      key: "display_name",
      label: tr("Display Name"),
      render: (r) => (
        <span className="font-semibold text-foreground">{value(r, "display_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (r) => value(r, "inst_profile_name"),
    },
    {
      key: "primary_color",
      label: tr("Primary Color"),
      render: (r) => <ColorValue color={r.primary_color} />,
    },
    {
      key: "secondary_color",
      label: tr("Secondary Color"),
      render: (r) => <ColorValue color={r.secondary_color} />,
    },
    {
      key: "status",
      label: tr("Status"),
      sortValue: (r) => r.status_name ?? r.status ?? "",
      render: (r) =>
        r.status_name != null || r.status != null ? (
          <StatusBadge status={String(r.status_name ?? (r.status === 1 ? "ACTIVE" : "INACTIVE"))} />
        ) : (
          "—"
        ),
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      sortValue: (r) => r.process_status_name ?? "",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} /> : "—"),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      sortValue: (r) => r.auth_status ?? "",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "—"),
    },
    {
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (r) => (
        <BrandingActions
          row={r}
          onRefresh={query.refetch}
          onEdit={() => {
            setEditing(r);
            setFormOpen(true);
          }}
        />
      ),
    },
  ];
  const submit = async (values) => {
    try {
      const instProfileId = editing ? editing.inst_profile_id : values.inst_profile_id;
      if (editing) {
        await edit.mutateAsync({
          id: editing.id,
          ...values,
          ...(editing.updated_time ? { expected_updated_time: editing.updated_time } : {}),
        });
        // Confirmed live: /institution/branding/edit only updates a
        // record's fields — it never advances process_status, even when
        // called with is_draft:false. A still-Draft record edited via
        // "Save changes" (not "Save as draft") therefore stayed "Draft"
        // forever unless separately Submitted from the row action, which
        // is not what "Save changes" implies. Chaining the same /submit
        // call the row's own Submit button already uses turns "Save
        // changes" on a draft into what it visually promises: save AND
        // move it out of draft for checker review.
        const wasDraft = editing.auth_status === "DRAFT" || editing.process_status_name === "Draft";
        if (wasDraft && values.is_draft === false) {
          await submitDraft.mutateAsync({ id: editing.id, narration: values.narration || "Submitted for review" });
        }
      } else {
        await add.mutateAsync(values);
      }
      setFormOpen(false);
      await query.refetch();
      // Applying this instantly — rather than waiting for the maker-checker
      // authorization that would normally make it the record's "active"
      // color — matches what was asked: seeing your own institution's new
      // brand color without logging out and back in. If the change is
      // later rejected, the theme simply reverts on the next login/token
      // refresh's branding payload, same as any other unauthorized change
      // would (there's no live channel for "my own session's branding" to
      // correct it sooner — see BrandThemeProvider.jsx).
      if (
        currentUser?.inst_profile_id != null &&
        String(instProfileId) === String(currentUser.inst_profile_id) &&
        (values.primary_color || values.secondary_color)
      ) {
        setBrandTheme({
          primary: values.primary_color || liveBrandColors?.primary,
          secondary: values.secondary_color || liveBrandColors?.secondary,
        });
      }
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            {tr("Institution Branding")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Manage institution branding and white-label configuration.")}
          </p>
        </div>
        
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs
        rows={query.data}
        value={statusFilter}
        search={search}
        onSearch={setSearch}
        onChange={setStatusFilter}
        actions={canAdd && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            <Plus size={14} /> {tr("Add")} {tr("branding")}
          </button>
        )}
      bare /><DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title={tr("Institution Branding")}
        searchableKeys={["display_name", "inst_profile_name", "primary_color"]}
        emptyTitle={tr("No branding profiles found")}
        emptyDescription={tr("Branding profiles will appear here when available.")}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution branding") : tr("Add institution branding")}
        size="lg"
      >
        <BrandingForm
          editing={editing}
          institutions={institutions.data}
          pending={add.isPending || edit.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}

function BrandingForm({ editing, institutions = [], pending, onCancel, onSubmit }) {
  const tr = useConfigLabel();
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? "",
    // A color field's existing value might already be malformed on the
    // record (e.g. a 5-digit hex saved before this form validated hex
    // input at all) — loading it as-is into a field that now hard-blocks
    // submission on invalid hex would force fixing a color the user never
    // meant to touch just to save an unrelated edit. Dropping an
    // already-invalid legacy value back to empty on load is the same
    // "treat it as unset" behavior the color swatch preview already falls
    // back to, just applied to the text field/submission too.
    ...Object.fromEntries(
      FIELDS.map(([key]) => [
        key,
        key.includes("color") && editing?.[key] && !HEX_COLOR_RE.test(editing[key])
          ? ""
          : editing?.[key] ?? "",
      ]),
    ),
    narration: "",
    is_draft: false,
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  // Lets the hex text field accept "2563EB" as well as "#2563EB" — the
  // native color swatch always emits the "#"-prefixed form, but someone
  // typing/pasting a hex value by hand may not bother with the "#".
  const setColorText = (key) => (e) => {
    const raw = e.target.value.trim();
    const normalized = raw && !raw.startsWith("#") ? `#${raw}` : raw;
    setForm((f) => ({ ...f, [key]: normalized }));
  };
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        // FilterSelect has no native form control, so re-check "required"
        // (previously free from the bare <select> it replaced) by hand.
        if (!editing && !form.inst_profile_id) {
          notifications.error("Please select an institution");
          return;
        }
        const invalidColorField = FIELDS.find(
          ([key]) => key.includes("color") && form[key] && !HEX_COLOR_RE.test(form[key]),
        );
        if (invalidColorField) {
          notifications.error(`${invalidColorField[1]} must be a valid hex color (e.g. #2563EB)`);
          return;
        }
        const { inst_profile_id, ...branding } = form;
        void onSubmit(
          editing ? branding : { inst_profile_id: Number(inst_profile_id), ...branding },
        );
      }}
    >
      {!editing && (
        <label className="text-sm font-medium sm:col-span-2">
          Institution
          <FilterSelect
            className="mt-1.5"
            value={form.inst_profile_id}
            onChange={(next) => set("inst_profile_id")({ target: { value: next } })}
            options={[
              { value: "", label: tr("Select institution") },
              ...institutions.map((i) => ({
                value: i.id ?? i.inst_profile_id,
                label: i.name ?? i.inst_profile_name ?? i.code,
              })),
            ]}
          />
        </label>
      )}
      {FIELDS.map(([key, label]) => {
        if (key.includes("color")) {
          const fallback = key === "primary_color" ? "#2563eb" : "#dbeafe";
          const currentValue = form[key] || fallback;
          return (
            <label key={key} className="text-sm font-medium">
              {label}
              {/* Bare <input type="color"> opens the browser's native
                  picker, which on Chrome has no way to type a hex value
                  directly (only an RGB slider/eyedropper) — paired with a
                  text input here so a hex code can be typed or pasted, and
                  kept in sync with the swatch both ways. */}
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={HEX_COLOR_RE.test(currentValue) ? currentValue : fallback}
                  onChange={set(key)}
                  className="h-12 w-12 shrink-0 cursor-pointer appearance-none rounded-xl border border-border bg-white p-1 shadow-sm transition hover:border-primary/50 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                />
                <input
                  type="text"
                  value={form[key] ?? ""}
                  onChange={setColorText(key)}
                  placeholder={fallback}
                  spellCheck={false}
                  maxLength={7}
                  className="h-12 w-full rounded-xl border border-border p-3 font-mono text-sm uppercase"
                />
              </div>
            </label>
          );
        }
        if (key === "logo" || key === "favicon") {
          return (
            <label key={key} className="text-sm font-medium">
              {label}
              <FileUploadField
                tr={tr}
                value={form[key]}
                onChange={(next) => setForm((f) => ({ ...f, [key]: next }))}
                accept="image/*"
                maxBytes={MAX_IMAGE_BYTES}
                uploadLabel="Upload image"
                hint="PNG, JPG, or SVG, up to 500KB"
              />
            </label>
          );
        }
        return (
          <label key={key} className="text-sm font-medium">
            {label}
            <input
              required={key === "display_name"}
              type={key.includes("email") ? "email" : "text"}
              value={form[key]}
              onChange={set(key)}
              className="mt-1.5 w-full rounded-xl border border-border p-3"
            />
          </label>
        );
      })}
      <label className="text-sm font-medium sm:col-span-2">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-border p-3"
        />
      </label>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void onSubmit(
              editing
                ? { ...form, is_draft: true }
                : {
                    inst_profile_id: Number(form.inst_profile_id),
                    ...Object.fromEntries(FIELDS.map(([key]) => [key, form[key]])),
                    narration: form.narration,
                    is_draft: true,
                  },
            )
          }
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Save as draft
        </button>
        <button
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Add branding"}
        </button>
      </div>
    </form>
  );
}

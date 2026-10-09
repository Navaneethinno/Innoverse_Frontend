import { PageTitle } from "@/Components/Common/PageTitle";
import { useListSearch } from "@/Hooks/useListSearch";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { Fragment, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { FileUploadField, StoredFilePreview } from "@/Components/Common/FileUploadField";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
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
import { normalizeBranding } from "@/Utils/Lib/branding";
import { BrandingPreview } from "./BrandingPreview";

const FIELDS = [
  ["display_name", "Display Name"],
  ["logo", "Logo"],
  ["logo_dark", "Logo (Dark)"],
  ["favicon", "Favicon"],
  ["login_background", "Login Background"],
  ["primary_color_light", "Primary Color (Light)"],
  ["secondary_color_light", "Secondary Color (Light)"],
  ["primary_color_dark", "Primary Color (Dark)"],
  ["secondary_color_dark", "Secondary Color (Dark)"],
  ["email_header", "Email Header"],
  ["email_footer", "Email Footer"],
  ["receipt_header", "Receipt Header"],
  ["receipt_footer", "Receipt Footer"],
  ["statement_header", "Statement Header"],
  ["statement_footer", "Statement Footer"],
];
const value = (row, key) => row?.[key] ?? "—";
// The form groups the fields (the view and audit keep the API order): name
// and colours first, beside the live preview, then images, then texts.
const FORM_SECTIONS = { display_name: "Name and colours", logo: "Images", email_header: "Texts" };
const FORM_ORDER = ["display_name", "primary_color_light", "secondary_color_light", "primary_color_dark", "secondary_color_dark", "logo", "logo_dark", "favicon", "login_background"];
const FORM_FIELDS = [...FORM_ORDER.map((key) => FIELDS.find(([k]) => k === key)), ...FIELDS.filter(([k]) => !FORM_ORDER.includes(k))];
// Image fields: uploaded first (the upload's `field` names which), then
// saved as the returned path.
const IMAGE_KEYS = new Set(["logo", "logo_dark", "favicon", "login_background"]);
const COLOR_FALLBACK = { primary_color_light: "#2563eb", secondary_color_light: "#dbeafe", primary_color_dark: "#60a5fa", secondary_color_dark: "#1e293b" };
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
// The images (logo, dark logo, favicon, login background) are stored on the
// server: each is uploaded on its own for the institution (the upload's
// `field` says which; PNG, JPEG or WebP, up to 2 MB) and saved as the
// returned path; showing one downloads it through /branding/file.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const brandingDownload = (instProfileId) => (path) => institutionBrandingApi.file({ inst_profile_id: Number(instProfileId), path });
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
                ) : IMAGE_KEYS.has(key) ? (
                  <StoredFilePreview value={details?.[key]} download={brandingDownload(details?.inst_profile_id)} />
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
  const { brand: liveBrand, setBrandTheme } = useBrandTheme();
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term: searchTerm, bind: searchBind } = useListSearch(() => setPage(1));
  const query = useInstitutionBrandingsQuery({ page, limit, filter: statusFilter, sort_by: sortBy, search: searchTerm });
  const institutions = useActiveInstitutionsQuery();
  const add = useInstitutionBrandingMutation("add");
  const edit = useInstitutionBrandingMutation("edit");
  const submitDraft = useInstitutionBrandingMutation("submit");
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
      key: "primary_color_light",
      label: tr("Primary Color"),
      render: (r) => <ColorValue color={r.primary_color_light} />,
    },
    {
      key: "secondary_color_light",
      label: tr("Secondary Color"),
      render: (r) => <ColorValue color={r.secondary_color_light} />,
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
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} variant="subtle" /> : "—"),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      sortValue: (r) => r.auth_status ?? "",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} variant="subtle" /> : "—"),
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
        normalizeBranding(values)
      ) {
        setBrandTheme({ ...normalizeBranding(values), institutionCode: liveBrand?.institutionCode });
      }
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <PageTitle>
            {tr("Institution Branding")}
          </PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("Manage institution branding and white-label configuration.")}
          </p>
        </div>
        
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs serverFiltered sortBy={sortBy} onSortChange={(next) => { setSortBy(next); setPage(1); }}
        rows={query.data}
        total={query.pagination?.totalRecords}
        value={statusFilter}
        {...searchBind}
        onChange={(next) => { setStatusFilter(next); setPage(1); }}
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
      bare /><DataTable serverSorted
        columns={columns}
        rows={query.data}
        serverPagination={{
          page,
          totalPages: query.pagination?.totalPages ?? 1,
          totalRecords: query.pagination?.totalRecords ?? query.data.length,
          onPageChange: setPage,
          limit,
          onLimitChange: (next) => {
            setLimit(next);
            setPage(1);
          },
        }}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title={tr("Institution Branding")}
        searchableKeys={["display_name", "inst_profile_name", "primary_color_light"]}
        emptyTitle={tr("No branding profiles found")}
        emptyDescription={tr("Branding profiles will appear here when available.")}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution branding") : tr("Add institution branding")}
        size="xl"
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
  // A bank / fintech user is always in its own institution: no picker.
  const canChoose = useCanChooseInstitution();
  const ownInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? (canChoose ? "" : (ownInstitution ?? "")),
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
  const renderField = (key, label) => {
    if (key.includes("color")) {
      const fallback = COLOR_FALLBACK[key];
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
    if (IMAGE_KEYS.has(key)) {
      return (
        <label key={key} className="text-sm font-medium">
          {label}
          <FileUploadField
            tr={tr}
            value={form[key]}
            onChange={(next) => setForm((f) => ({ ...f, [key]: next }))}
            upload={(file) => institutionBrandingApi.upload({ inst_profile_id: Number(form.inst_profile_id), field: key, file })}
            download={brandingDownload(form.inst_profile_id)}
            disabled={!form.inst_profile_id}
            accept="image/png,image/jpeg,image/webp"
            maxBytes={MAX_IMAGE_BYTES}
            uploadLabel={form.inst_profile_id ? "Upload image" : "Select an institution first"}
            hint="PNG, JPG or WebP, up to 2MB"
          />
        </label>
      );
    }
    return (
      <label key={key} className={key === "display_name" ? "text-sm font-medium sm:col-span-2" : "text-sm font-medium"}>
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
  };
  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
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
      <div className="grid content-start gap-4 sm:grid-cols-2">
      {!editing && canChoose && (
        <label className="text-sm font-medium sm:col-span-2">
          Institution
          <FilterSelect
            className="mt-1.5"
            value={form.inst_profile_id}
            onChange={(next) => setForm((f) => ({ ...f, inst_profile_id: next, logo: "", logo_dark: "", favicon: "", login_background: "" }))}
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
      {FORM_FIELDS.map(([key, label]) => {
        const field = renderField(key, label);
        return FORM_SECTIONS[key] ? (
          <Fragment key={key}>
            <h3 className="border-b border-border pb-1.5 pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:col-span-2">{FORM_SECTIONS[key]}</h3>
            {field}
          </Fragment>
        ) : (
          field
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
      </div>
      <div className="order-first lg:order-none lg:sticky lg:top-0 lg:self-start">
        <BrandingPreview form={form} download={brandingDownload(form.inst_profile_id ?? editing?.inst_profile_id)} />
      </div>
    </form>
  );
}

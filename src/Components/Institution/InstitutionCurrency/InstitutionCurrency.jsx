import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useAuth } from "@/Hooks/useAuth";
import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { institutionCurrencyApi, institutionPhoneCountryApi } from "@/Services/Institution/institutionCurrency.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { countryName } from "@/Components/Common/countryOption";
import {
  useAssignmentListQuery,
  useAssignmentMutation,
  useDialCountries,
  useMasterCurrencies,
} from "@/Hooks/Institution/institutionCurrencyHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institution/institutionHooks";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
const display = (row, key) => row?.[key] ?? "—";

// Institution Currency and Institution Phone Code (menu 203) are the same
// screen over the same 13 maker-checker calls; only the picked item and its
// flag differ. Phone Code lists the countries whose numbers customers and
// merchants may use; a number typed without + is the primary country's.
const KINDS = {
  currency: {
    api: institutionCurrencyApi,
    livePath: API_ENDPOINTS.INSTITUTION.INSTITUTION_CURRENCY.LIST,
    useOptions: () => useMasterCurrencies().currencies.map((c) => ({ value: c.currency_code ?? c.id, label: c.currency_name ?? c.name ?? c.currency_code })),
    valueKey: "currency_code",
    nameKey: "currency_name",
    flagKey: "is_base_currency",
    noun: "currency",
    title: "Institution Currency",
    subtitle: "Manage institution currency assignments.",
    itemLabel: "Currency",
    flagLabel: "Base Currency",
    selectLabel: "Select currency",
    emptyTitle: "No currencies found",
    emptyDescription: "Currency assignments will appear here when available.",
  },
  phoneCode: {
    api: institutionPhoneCountryApi,
    livePath: API_ENDPOINTS.INSTITUTION.INSTITUTION_PHONE_COUNTRY.LIST,
    useOptions: () => useDialCountries().map((c) => ({ value: c.id, label: countryName(c) })),
    valueKey: "country_id",
    nameKey: "country_name",
    flagKey: "is_primary",
    noun: "phone code",
    title: "Institution Phone Code",
    subtitle: "Countries whose phone numbers customers and merchants may use. A number typed without + is taken as the primary country's; with none listed, any number is accepted.",
    itemLabel: "Country",
    flagLabel: "Primary",
    selectLabel: "Select country",
    emptyTitle: "No phone codes found",
    emptyDescription: "Phone countries will appear here when available.",
  },
};
function AssignmentActions({ kind, row, onRefresh, onEdit }) {
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
  const mutation = useAssignmentMutation(kind.api, action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    kind.api.pending,
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
        title={`${action?.label ?? "Action"} institution ${kind.noun}`}
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
        title={tr(`View institution ${kind.noun}`)}
        size="md"
      >
        <div className="space-y-3">
          {[
            [kind.itemLabel, row[kind.nameKey] ?? row[kind.valueKey]],
            ...(canChooseInstitution() ? [["Institution", row.inst_profile_name ?? row.inst_profile_id]] : []),
            [kind.flagLabel, row[kind.flagKey] ? "Yes" : "No"],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <div className="mt-1.5 rounded-xl border border-border bg-card p-3 text-sm font-semibold">
                {val ?? "—"}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <StatusBadge status={String(row.status_name ?? row.auth_status ?? row.status ?? "")} />
          </div>
        </div>
      </Modal>
      {audit && (
        <AuditModal
          title={row[kind.nameKey] ?? `${kind.itemLabel} #${row.id}`}
          fields={[
            [kind.nameKey, kind.itemLabel],
            ["inst_profile_name", "Institution"],
            [kind.flagKey, kind.flagLabel],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            kind.api.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}
function AssignmentPage({ kind }) {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("desc");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const query = useAssignmentListQuery(kind.api, kind.livePath, { page, limit, filter: statusFilter, sort_by: sortBy });
  const institutions = useActiveInstitutionsQuery();
  const options = kind.useOptions();
  const add = useAssignmentMutation(kind.api, "add");
  const edit = useAssignmentMutation(kind.api, "edit");
  // The list has no search param yet: search narrows the current page.
  const filteredRows =
    !search.trim()
      ? query.data
      : query.data.filter(
          (row) =>
            JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase()),
        );
  const columns = [
    {
      key: kind.nameKey,
      label: tr(kind.itemLabel),
      render: (r) => (
        <span className="font-semibold text-foreground">{display(r, kind.nameKey)}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (r) => display(r, "inst_profile_name"),
    },
    {
      key: kind.flagKey,
      label: tr(kind.flagLabel),
      render: (r) => (r[kind.flagKey] ? "Yes" : "No"),
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
        <AssignmentActions
          kind={kind}
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
      if (editing)
        await edit.mutateAsync({
          id: editing.id,
          ...values,
          ...(editing.updated_time ? { expected_updated_time: editing.updated_time } : {}),
        });
      else await add.mutateAsync(values);
      setFormOpen(false);
      await query.refetch();
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            {tr(kind.title)}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(kind.subtitle)}
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
        search={search}
        onSearch={setSearch}
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
            <Plus size={14} /> {tr("Add")} {tr(kind.noun)}
          </button>
        )}
      bare /><DataTable serverSorted
        columns={columns}
        rows={filteredRows}
        serverPagination={{
          page,
          totalPages: query.pagination?.totalPages ?? 1,
          totalRecords: query.pagination?.totalRecords ?? filteredRows.length,
          onPageChange: setPage,
          limit,
          onLimitChange: (next) => {
            setLimit(next);
            setPage(1);
          },
        }}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title={tr(kind.title)}
        searchableKeys={[kind.nameKey, "inst_profile_name"]}
        emptyTitle={tr(kind.emptyTitle)}
        emptyDescription={tr(kind.emptyDescription)}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr(`Edit institution ${kind.noun}`) : tr(`Add institution ${kind.noun}`)}
        size="md"
      >
        <AssignmentForm
          kind={kind}
          editing={editing}
          institutions={institutions.data}
          options={options}
          pending={add.isPending || edit.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}
export function InstitutionCurrency() {
  return <AssignmentPage kind={KINDS.currency} />;
}
export function InstitutionPhoneCode() {
  return <AssignmentPage kind={KINDS.phoneCode} />;
}
function AssignmentForm({
  kind,
  editing,
  institutions = [],
  options = [],
  pending,
  onCancel,
  onSubmit,
}) {
  const tr = useConfigLabel();
  // A bank / fintech user is always in its own institution: no picker.
  const canChoose = useCanChooseInstitution();
  const ownInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? (canChoose ? "" : (ownInstitution ?? "")),
    [kind.valueKey]: editing?.[kind.valueKey] ?? "",
    [kind.flagKey]: Boolean(editing?.[kind.flagKey]),
    narration: "",
    is_draft: false,
  });
  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        // FilterSelect has no native form control, so re-check "required"
        // (previously free from the bare <select>s these replaced) by hand.
        if (!editing && !form.inst_profile_id) {
          notifications.error("Please select an institution");
          return;
        }
        if (!form[kind.valueKey]) {
          notifications.error(tr(kind.selectLabel));
          return;
        }
        const { inst_profile_id, ...rest } = form;
        void onSubmit(
          editing
            ? { ...rest, [kind.valueKey]: Number(rest[kind.valueKey]), is_draft: false }
            : {
                inst_profile_id: Number(inst_profile_id),
                ...rest,
                [kind.valueKey]: Number(rest[kind.valueKey]),
              },
        );
      }}
    >
      <label className="block text-sm font-medium">
        {!editing && canChoose && (
          <>
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
          </>
        )}
      </label>
      <label className="block text-sm font-medium">
        {kind.itemLabel}
        <FilterSelect
          className="mt-1.5"
          value={form[kind.valueKey]}
          onChange={(next) => set(kind.valueKey)({ target: { value: next } })}
          options={[{ value: "", label: tr(kind.selectLabel) }, ...options]}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={form[kind.flagKey]} onChange={set(kind.flagKey)} />{" "}
        {kind.flagLabel}
      </label>
      <label className="block text-sm font-medium">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-border p-3"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void onSubmit({
              ...form,
              inst_profile_id: Number(form.inst_profile_id),
              [kind.valueKey]: Number(form[kind.valueKey]),
              is_draft: true,
            })
          }
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Save as draft
        </button>
        <button
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {pending ? "Saving..." : editing ? "Save changes" : `Add ${kind.noun}`}
        </button>
      </div>
    </form>
  );
}

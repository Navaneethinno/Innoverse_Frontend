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
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { institutionCurrencyApi } from "@/Services/Institutions/institutionCurrency.api";
import {
  useInstitutionCurrenciesQuery,
  useInstitutionCurrencyMutation,
  useMasterCurrencies,
} from "@/Hooks/Institutions/institutionCurrencyHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institutions/institutionHooks";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
const display = (row, key) => row?.[key] ?? "—";
function CurrencyActions({ row, onRefresh, onEdit }) {
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
  const mutation = useInstitutionCurrencyMutation(action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    institutionCurrencyApi.pending,
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
        title={`${action?.label ?? "Action"} institution currency`}
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
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
        )}
      </ConfirmDialog>
      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title={tr("View institution currency")}
        size="md"
      >
        <div className="space-y-3">
          {[
            ["Currency", row.currency_name ?? row.currency_code],
            ["Institution", row.inst_profile_name ?? row.inst_profile_id],
            ["Base currency", row.is_base_currency ? "Yes" : "No"],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold">
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
          title={row.currency_name ?? `Currency #${row.id}`}
          fields={[
            ["currency_name", "Currency"],
            ["inst_profile_name", "Institution"],
            ["is_base_currency", "Base Currency"],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            institutionCurrencyApi.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}
export function InstitutionCurrencyPage() {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionCurrenciesQuery();
  const institutions = useActiveInstitutionsQuery();
  const { currencies } = useMasterCurrencies();
  const add = useInstitutionCurrencyMutation("add");
  const edit = useInstitutionCurrencyMutation("edit");
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
      key: "currency_name",
      label: tr("Currency"),
      render: (r) => (
        <span className="font-semibold text-foreground">{display(r, "currency_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (r) => display(r, "inst_profile_name"),
    },
    {
      key: "is_base_currency",
      label: tr("Base Currency"),
      render: (r) => (r.is_base_currency ? "Yes" : "No"),
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
        <CurrencyActions
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
            {tr("Institution Currency")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Manage institution currency assignments.")}
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
            <Plus size={14} /> {tr("Add")} {tr("currency")}
          </button>
        )}
      bare /><DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title={tr("Institution Currency")}
        searchableKeys={["currency_name", "inst_profile_name"]}
        emptyTitle={tr("No currencies found")}
        emptyDescription={tr("Currency assignments will appear here when available.")}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution currency") : tr("Add institution currency")}
        size="md"
      >
        <CurrencyForm
          editing={editing}
          institutions={institutions.data}
          currencies={currencies}
          pending={add.isPending || edit.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}
function CurrencyForm({
  editing,
  institutions = [],
  currencies = [],
  pending,
  onCancel,
  onSubmit,
}) {
  const tr = useConfigLabel();
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? "",
    currency_code: editing?.currency_code ?? "",
    is_base_currency: Boolean(editing?.is_base_currency),
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
        if (!form.currency_code) {
          notifications.error("Please select a currency");
          return;
        }
        const { inst_profile_id, ...rest } = form;
        void onSubmit(
          editing
            ? { ...rest, currency_code: Number(rest.currency_code), is_draft: false }
            : {
                inst_profile_id: Number(inst_profile_id),
                ...rest,
                currency_code: Number(rest.currency_code),
              },
        );
      }}
    >
      <label className="block text-sm font-medium">
        {!editing && (
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
        Currency
        <FilterSelect
          className="mt-1.5"
          value={form.currency_code}
          onChange={(next) => set("currency_code")({ target: { value: next } })}
          options={[
            { value: "", label: tr("Select currency") },
            ...currencies.map((c) => ({
              value: c.currency_code ?? c.id,
              label: c.currency_name ?? c.name ?? c.currency_code,
            })),
          ]}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={form.is_base_currency} onChange={set("is_base_currency")} />{" "}
        Base currency
      </label>
      <label className="block text-sm font-medium">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-3"
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
              currency_code: Number(form.currency_code),
              is_draft: true,
            })
          }
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Save as draft
        </button>
        <button
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Add currency"}
        </button>
      </div>
    </form>
  );
}

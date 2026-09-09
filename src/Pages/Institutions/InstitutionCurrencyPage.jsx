import { useState } from "react";
import {
  AlertCircle,
  Edit3,
  Eye,
  History,
  Plus,
  Power,
  PowerOff,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";
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
const display = (row, key) => row?.[key] ?? "—";
function CurrencyActions({ row, onRefresh, onEdit }) {
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
    !!action && ["auth", "deauth"].includes(action.method),
  );
  const status = String(row.status_name ?? row.auth_status ?? "").toLowerCase();
  const process = String(row.process_status_name ?? "").toLowerCase();
  const draft = row.status === 9 || status === "draft" || process === "draft";
  const pending = process.includes("pending");
  const pendingDelete = process.includes("pending delete");
  const active = row.status === 1 || status === "active";
  const inactive = row.status === 13 || status === "inactive";
  const rejectedDelete = process.includes("rejected delete") || status.includes("rejected delete");
  const actions = [
    ...(draft ? [["submit", "Submit", Send]] : []),
    ...(pending && canAuthorize
      ? [
          ["pending", "Pending", History],
          ["auth", "Authorize", ShieldCheck],
          ["deauth", "Reject", ShieldOff],
        ]
      : []),
    ...((active || rejectedDelete) && !pending && canDelete ? [["delete", "Delete", Trash2]] : []),
    ...(active && !pending && canChangeStatus ? [["deactivate", "Deactivate", PowerOff]] : []),
    ...(pendingDelete && canAuthorize ? [["deleteAuth", "Delete Auth", Trash2]] : []),
    ...(inactive && !pending && canChangeStatus ? [["reactivate", "Reactivate", Power]] : []),
  ];
  const execute = async () => {
    try {
      await mutation.mutateAsync({ id: row.id, narration });
      await onRefresh();
      setAction(null);
      setNarration("");
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  return (
    <>
      <div className="flex flex-wrap justify-center gap-1">
        <UiTooltip label="View">
          <button
            type="button"
            onClick={() => setDetails(row)}
            className={actionButtonClass("view")}
          >
            <Eye size={14} />
          </button>
        </UiTooltip>
        {canEdit && !pending && !pendingDelete && !rejectedDelete && (
          <UiTooltip label="Edit">
            <button type="button" onClick={onEdit} className={actionButtonClass("edit")}>
              <Edit3 size={14} />
            </button>
          </UiTooltip>
        )}
        <UiTooltip label="Audit">
          <button
            type="button"
            onClick={() => setAudit(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <History size={14} />
          </button>
        </UiTooltip>
        {actions.map(([method, label, Icon]) => (
          <UiTooltip key={method} label={label}>
            <button
              type="button"
              onClick={() => setAction({ method, label })}
              className={actionButtonClass(method)}
            >
              <Icon size={14} />
            </button>
          </UiTooltip>
        ))}
      </div>
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
        {["auth", "deauth"].includes(action?.method) && <PendingChangesDiff {...pendingInfo} />}
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
        title="View institution currency"
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
  const canAdd = useHasInstitutionAction("Add");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionCurrenciesQuery({ page, limit: 10 });
  const institutions = useActiveInstitutionsQuery();
  const { currencies } = useMasterCurrencies();
  const add = useInstitutionCurrencyMutation("add");
  const edit = useInstitutionCurrencyMutation("edit");
  const columns = [
    {
      key: "currency_name",
      label: "Currency",
      render: (r) => (
        <span className="font-semibold text-foreground">{display(r, "currency_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: "Institution",
      render: (r) => display(r, "inst_profile_name"),
    },
    {
      key: "is_base_currency",
      label: "Base Currency",
      render: (r) => (r.is_base_currency ? "Yes" : "No"),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge status={String(r.status_name ?? r.auth_status ?? r.status ?? "")} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Institution
          </p>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Institution Currency
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage institution currency assignments.
          </p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground"
          >
            <Plus size={14} /> Add currency
          </button>
        )}
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={query.data}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title="Institution Currency"
        searchableKeys={["currency_name", "inst_profile_name"]}
        emptyTitle="No currencies found"
        emptyDescription="Currency assignments will appear here when available."
        serverPagination={{
          page: query.pagination.currentPage ?? page,
          totalPages: query.pagination.totalPages ?? 1,
          totalRecords: query.pagination.totalRecords ?? query.data.length,
          onPageChange: setPage,
        }}
      />
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit institution currency" : "Add institution currency"}
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
            <select
              required
              value={form.inst_profile_id}
              onChange={set("inst_profile_id")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3"
            >
              <option value="">Select institution</option>
              {institutions.map((i) => (
                <option key={i.id ?? i.inst_profile_id} value={i.id ?? i.inst_profile_id}>
                  {i.name ?? i.inst_profile_name ?? i.code}
                </option>
              ))}
            </select>
          </>
        )}
      </label>
      <label className="block text-sm font-medium">
        Currency
        <select
          required
          value={form.currency_code}
          onChange={set("currency_code")}
          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3"
        >
          <option value="">Select currency</option>
          {currencies.map((c) => (
            <option key={c.currency_code ?? c.id} value={c.currency_code ?? c.id}>
              {c.currency_name ?? c.name ?? c.currency_code}
            </option>
          ))}
        </select>
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

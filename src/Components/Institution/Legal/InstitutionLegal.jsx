import { Button } from "@/Components/Common/Button";
import { mergeStatusColumns } from "@/Components/MakerChecker/statusColumns";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { ListTable } from "@/Components/Common/ListView";
import { asQuery, useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { TypedInput } from "@/Components/Common/DateInput";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useAuth } from "@/Hooks/useAuth";
import { useApiMutation } from "@/Hooks/useApiMutation";
import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";

import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";

import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { institutionLegalApi } from "@/Services/Institution/institutionLegal.api";
import { useActiveInstitutionsQuery, useHasInstitutionAction } from "@/Hooks/Institution/institutionHooks";

import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { phoneInput } from "@/Utils/Lib/phoneInput";
import { InstitutionRowActions } from "@/Components/Institution/InstitutionRowActions";

const FIELDS = [
  ["legal_name", "Legal Name"],
  ["short_name", "Short Name"],
  ["registered_name", "Registered Name"],
  ["registration_number", "Registration Number"],
  ["tax_identifier", "Tax Identifier"],
  ["incorporation_date", "Incorporation Date"],
  ["regulator_name", "Regulator Name"],
  ["license_number", "License Number"],
  ["license_type", "License Type"],
  ["license_category", "License Category"],
  ["license_start_date", "License Start Date"],
  ["license_expiry_date", "License Expiry Date"],
  ["registered_address", "Registered Address"],
  ["business_address", "Business Address"],
  ["contact_email", "Contact Email"],
  ["contact_phone", "Contact Phone"],
  ["website", "Website"],
];
const value = (row, key) => row?.[key] ?? "—";

function LegalActions({ row, onRefresh, onEdit }) {
  const tr = useConfigLabel();
  return (
    <InstitutionRowActions
      row={row}
      api={institutionLegalApi}
      what={tr("Institution Legal")}
      facts={FIELDS.map(([key, label]) => [tr(label), value(row, key)])}
      auditTitle={row.legal_name ?? `#${row.id}`}
      auditFields={FIELDS}
      onEdit={onEdit}
      onRefresh={onRefresh}
    />
  );
}

export function InstitutionLegal() {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: API_ENDPOINTS.INSTITUTION.INSTITUTION_LEGAL.LIST, call: institutionLegalApi.list });
  const query = asQuery(list);
  const institutions = useActiveInstitutionsQuery();
  const add = useApiMutation(institutionLegalApi, "add");
  const edit = useApiMutation(institutionLegalApi, "edit");
  const columns = mergeStatusColumns([
    {
      key: "legal_name",
      label: tr("Legal Name"),
      render: (r) => (
        <span className="font-semibold text-foreground">{value(r, "legal_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (r) => value(r, "inst_profile_name"),
    },
    {
      key: "registration_number",
      label: tr("Registration"),
      render: (r) => value(r, "registration_number"),
    },
    { key: "license_number", label: tr("License"), render: (r) => value(r, "license_number") },
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
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (r) => (
        <LegalActions
          row={r}
          onRefresh={query.refetch}
          onEdit={() => {
            setEditing(r);
            setFormOpen(true);
          }}
        />
      ),
    },
  ]);
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
          <PageTitle>{tr("Institution Legal")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("Manage institution legal and regulatory profiles.")}
          </p>
        </div>
        
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
        </div>
      )}
      <ListTable list={list} actions={canAdd && (
          <Button
            size="xs"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}>
            <Plus size={14} /> {tr("Add")} {tr("legal profile")}
          </Button>
        )} columns={columns} rowKey={(r) => r.id} title={tr("Institution Legal")} emptyTitle={tr("No legal profiles found")} emptyDescription={tr("Legal profiles will appear here when available.")} /><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution legal") : tr("Add institution legal")}
        size="lg"
      >
        <LegalForm
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

function LegalForm({ editing, institutions = [], pending, onCancel, onSubmit }) {
  const tr = useConfigLabel();
  const initial = Object.fromEntries(FIELDS.map(([key]) => [key, editing?.[key] ?? ""]));
  // A bank / fintech user is always in its own institution: no picker.
  const canChoose = useCanChooseInstitution();
  const ownInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? (canChoose ? "" : (ownInstitution ?? "")),
    ...initial,
    narration: "",
    is_draft: false,
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === "contact_phone" ? phoneInput(e.target.value) : e.target.value }));
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
        const { inst_profile_id, ...legal } = form;
        void onSubmit(editing ? legal : { inst_profile_id: Number(inst_profile_id), ...legal });
      }}
    >
      {!editing && canChoose && (
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
      {FIELDS.map(([key, label]) => (
        <label key={key} className="text-sm font-medium">
          {label}
          {key === "legal_name" && <RequiredMark />}
          <TypedInput
            required={key === "legal_name"}
            type={key.includes("date") ? "date" : key === "contact_email" ? "email" : key === "contact_phone" ? "tel" : "text"}
            value={form[key]}
            onChange={set(key)}
            className="mt-1.5 w-full rounded-xl border border-border p-3"
          />
        </label>
      ))}
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
        <Button
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
          variant="secondary"
        >
          Save as draft
        </Button>
        <Button
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Add legal profile"}
        </Button>
      </div>
    </form>
  );
}

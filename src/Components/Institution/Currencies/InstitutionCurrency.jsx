import { Button } from "@/Components/Common/Button";
import { mergeStatusColumns } from "@/Components/MakerChecker/statusColumns";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { ListTable } from "@/Components/Common/ListView";
import { asQuery, useServerList } from "@/Hooks/useServerList";

import { PageTitle } from "@/Components/Common/PageTitle";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useAuth } from "@/Hooks/useAuth";
import { useApiMutation } from "@/Hooks/useApiMutation";
import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";

import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";

import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { institutionCurrencyApi, institutionPhoneCountryApi } from "@/Services/Institution/institutionCurrency.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { countryName } from "@/Components/Common/countryOption";
import { useDialCountries, useMasterCurrencies } from "@/Hooks/Institution/institutionCurrencyHooks";
import { useActiveInstitutionsQuery, useHasInstitutionAction } from "@/Hooks/Institution/institutionHooks";

import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { InstitutionRowActions } from "@/Components/Institution/InstitutionRowActions";
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
  return (
    <InstitutionRowActions
      row={row}
      api={kind.api}
      what={tr(kind.itemLabel)}
      facts={[
        [tr(kind.itemLabel), row[kind.nameKey] ?? row[kind.valueKey]],
        ...(canChooseInstitution() ? [[tr("Institution"), row.inst_profile_name ?? row.inst_profile_id]] : []),
        [tr(kind.flagLabel), tr(row[kind.flagKey] ? "Yes" : "No")],
      ]}
      auditTitle={row[kind.nameKey] ?? `#${row.id}`}
      auditFields={[[kind.nameKey, tr(kind.itemLabel)], ["inst_profile_name", tr("Institution")], [kind.flagKey, tr(kind.flagLabel)]]}
      onEdit={onEdit}
      onRefresh={onRefresh}
    />
  );
}
function AssignmentPage({ kind }) {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: kind.livePath, call: kind.api.list });
  const query = asQuery(list);
  const institutions = useActiveInstitutionsQuery();
  const options = kind.useOptions();
  const add = useApiMutation(kind.api, "add");
  const edit = useApiMutation(kind.api, "edit");
  const columns = mergeStatusColumns([
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
          <PageTitle>
            {tr(kind.title)}
          </PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr(kind.subtitle)}
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
            <Plus size={14} /> {tr("Add")} {tr(kind.noun)}
          </Button>
        )} columns={columns} rowKey={(r) => r.id} title={tr(kind.title)} emptyTitle={tr(kind.emptyTitle)} emptyDescription={tr(kind.emptyDescription)} /><Modal
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
        <RequiredMark />
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
        <Button
          disabled={pending}
          onClick={() =>
            void onSubmit({
              ...form,
              inst_profile_id: Number(form.inst_profile_id),
              [kind.valueKey]: Number(form[kind.valueKey]),
              is_draft: true,
            })
          }
          variant="secondary"
        >
          Save as draft
        </Button>
        <Button
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving..." : editing ? "Save changes" : `Add ${kind.noun}`}
        </Button>
      </div>
    </form>
  );
}

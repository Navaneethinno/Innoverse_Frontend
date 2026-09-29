import { InstitutionOnly } from "@/Components/Common/InstitutionOnly";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks, Plus } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { amlInternalListApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { LifecycleList } from "@/Components/Epurse/Onboarding/OnboardingConfiguration/LifecycleList";
import { ViewItem } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { InternalWatchlistForm } from "./InternalWatchlistForm";
import { ValidationResult } from "./ValidationResult";

// "name: First name + Last name · countries: Nationality" for a view.
const describeColumns = (columns = {}) =>
  Object.entries(columns)
    .filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" + ") : String(v)}`)
    .join(" · ");

// The checker (or anyone viewing) can re-run validate on the list's stored
// file and column setup to see its rows and problems before approving.
function CheckFile({ row }) {
  const { t } = useTranslation("aml");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const response = await amlInternalListApi.validate({
        inst_profile_id: row.inst_profile_id,
        code: row.code,
        file_path: row.file_path,
        default_entity_type: row.default_entity_type,
        columns: row.columns,
      });
      setResult(rowsOf(response)[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <button type="button" disabled={busy || !row.file_path} onClick={() => void run()} className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-50">
        {busy ? <Spinner size={12} /> : <ListChecks size={13} />} {t("checkFile")}
      </button>
      <ValidationResult result={result} />
    </div>
  );
}

// InnoAML > AML Configuration > Internal Watchlists (menu 105): the
// institution's own lists (CSV/XLSX + column setup). Once approved, a list
// is searchable by that institution's screenings within about a minute;
// matches show as INTERNAL:<code>.
export function InternalWatchlists() {
  const { t } = useTranslation(["aml", "common"]);
  const [form, setForm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const openEdit = async (row) => setForm({ editing: row });

  const columns = [
    { key: "code", label: t("aml:code"), render: (row) => <span className="font-mono text-xs">{row.code ?? "-"}</span> },
    { key: "name", label: t("aml:name"), align: "left", render: (row) => <span className="font-semibold">{row.name ?? "-"}</span> },
    { key: "inst_profile_name", label: t("aml:institution"), render: (row) => row.inst_profile_name ?? "-" },
    { key: "file_name", label: t("aml:listFile"), render: (row) => (row.file_name ? `${row.file_name} · ${row.file_format ?? ""}` : "-") },
    { key: "default_entity_type", label: t("aml:defaultEntityType"), render: (row) => (row.default_entity_type ? t(`aml:entity_${row.default_entity_type}`) : "-") },
  ];

  return (
    <>
      <LifecycleList
        title={t("aml:listsTitle")}
        subtitle={t("aml:listsSubtitle")}
        api={amlInternalListApi}
        menuName="Internal Watchlists"
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => void openEdit(row)}
        auditFields={[
          ["code", t("aml:code")],
          ["name", t("aml:name")],
          ["file_name", t("aml:listFile")],
          ["skip_invalid_rows", t("aml:skipInvalidRows")],
        ]}
        emptyTitle={t("aml:noLists")}
        addButton={
          <button type="button" onClick={() => setForm({ editing: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus size={14} /> {t("aml:addList")}
          </button>
        }
        renderView={(row) => (
          <dl className="grid gap-3">
            <ViewItem label={t("aml:code")}>{row.code}</ViewItem>
            <ViewItem label={t("aml:name")}>{row.name}</ViewItem>
            <InstitutionOnly><ViewItem label={t("aml:institution")}>{row.inst_profile_name}</ViewItem></InstitutionOnly>
            {row.description && <ViewItem label={t("common:description")}>{row.description}</ViewItem>}
            <ViewItem label={t("aml:listFile")}>{row.file_name ? `${row.file_name} · ${row.file_format ?? ""}` : "-"}</ViewItem>
            <ViewItem label={t("aml:defaultEntityType")}>{row.default_entity_type ? t(`aml:entity_${row.default_entity_type}`) : "-"}</ViewItem>
            <ViewItem label={t("aml:columnSetup")}>
              <span className="break-words font-normal">{describeColumns(row.columns) || "-"}</span>
            </ViewItem>
            <ViewItem label={t("aml:skipInvalidRows")}>{row.skip_invalid_rows ? t("common:yes") : t("common:no")}</ViewItem>
            <ViewItem label={t("common:status")}>{row.process_status_name ?? row.status_name}</ViewItem>
            <CheckFile row={row} />
          </dl>
        )}
      />
      {form && (
        <InternalWatchlistForm
          editing={form.editing}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}

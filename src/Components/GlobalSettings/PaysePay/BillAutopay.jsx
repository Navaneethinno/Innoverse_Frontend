import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { SearchBox } from "@/Components/Common/SearchBox";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { autopayApi } from "@/Services/PaysePay/paysePay.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { DocFields, PillTabs, RecordFacts, asForm, rangeProblem, typed, usePagedList, when } from "./docShared";

const fieldsOf = (t) => [
  { key: "enabled", label: t("ap_enabled"), type: "bool" },
  { key: "max_schedules_per_party", label: t("ap_maxSchedules"), type: "int", min: 1, max: 50 },
  { key: "max_amount", label: t("ap_maxAmount"), type: "amount", hint: t("emptyNoLimit"), emptyText: t("noLimit") },
  { key: "max_retries", label: t("ap_maxRetries"), type: "int", min: 0, max: 5 },
  { key: "retry_hours", label: t("ap_retryHours"), type: "int", min: 1, max: 72 },
];

// EPURSE > Bill Autopay (menu 247): the autopay settings (one document under
// maker-checker, off by default) and the customers' schedules, read only.
export function BillAutopay() {
  const { t } = useTranslation("paysePay");
  const [tab, setTab] = useState("settings");
  return (
    <div>
      <PillTabs tabs={[["settings", t("ap_tabSettings")], ["schedules", t("ap_tabSchedules")]]} value={tab} onChange={setTab} />
      {tab === "settings" ? <AutopaySettings /> : <Schedules />}
    </div>
  );
}

function AutopaySettings() {
  const { t } = useTranslation("paysePay");
  const fields = fieldsOf(t);
  return (
    <SectionScreen
      api={autopayApi}
      ns="paysePay"
      valueKey="setup"
      fallbackTitle={t("ap_title")}
      subtitle={t("ap_subtitle")}
      toForm={(setup) => asForm(fields, setup ?? {})}
      bodyOf={(form) => typed(fields, form)}
      problemOf={(_, form) => rangeProblem(t, fields, form)}
    >
      {({ data, shown, editing, setForm }) => <DocFields fields={fields} value={shown} fallback={asForm(fields, data?.defaults)} editing={editing} onChange={setForm} />}
    </SectionScreen>
  );
}

function Schedules() {
  const { t } = useTranslation(["paysePay", "common"]);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const id = window.setTimeout(() => setQ(search.trim()), 400);
    return () => window.clearTimeout(id);
  }, [search]);
  const list = usePagedList(autopayApi.schedules, q ? { search: q } : {});
  const columns = [
    { key: "ref", label: t("ap_ref"), render: (r) => <span className="font-mono text-xs font-semibold">{r.ref ?? "—"}</span> },
    { key: "party_name", label: t("ap_party"), render: (r) => <span className="text-xs">{r.party_name ?? "—"}</span> },
    { key: "bill_account", label: t("ap_billAccount"), render: (r) => <span className="font-mono text-xs">{r.bill_account ?? "—"}</span> },
    { key: "max_amount", label: t("ap_amount"), render: (r) => <span className="text-xs">{r.max_amount ?? r.amount ?? "—"}</span> },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={r.status} /> },
    { key: "next_run_at", label: t("ap_nextRun"), render: (r) => <span className="text-xs">{when(r.next_run_at)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpen(r.ref)} /> },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <SearchBox search={search} onSearch={setSearch} placeholder={t("ap_searchHint")} />
      </div>
      <DataTable bare serverSorted rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} columns={columns} rowKey={(r) => r.ref ?? r.id} title={t("ap_tabSchedules")} emptyTitle={t("ap_noSchedules")} />
      {open && <ScheduleDetail reference={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// One schedule with its runs (the list call with `ref`).
function ScheduleDetail({ reference, onClose }) {
  const { t } = useTranslation("paysePay");
  const { scope } = useInstitutionScope();
  const [item, setItem] = useState(null);
  useEffect(() => {
    autopayApi
      .schedules(scope({ ref: reference, page: 1, limit: 1 }))
      .then((r) => setItem(recordOf(r) ?? {}))
      .catch((e) => (notifications.error(e.message), onClose()));
  }, [reference, scope, onClose]);
  const runs = item?.runs ?? [];
  const runKeys = runs.length ? Object.keys(runs[0]).filter((k) => runs[0][k] == null || typeof runs[0][k] !== "object") : [];
  return (
    <Modal open onClose={onClose} title={t("ap_scheduleTitle", { ref: reference })} size="lg">
      {!item ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          <RecordFacts record={item} skip={["runs"]} />
          <h3 className="text-sm font-bold">{t("ap_runs")}</h3>
          {runs.length ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <SimpleTable columns={runKeys.map((k) => k.replace(/_/g, " "))}>
                <tbody>
                  {runs.map((run, i) => (
                    <tr key={run.id ?? i} className="border-t border-border">
                      {runKeys.map((k) => (
                        <td key={k} className="px-3 py-2 text-xs">
                          {k === "status" ? <StatusBadge status={run[k]} /> : /(_at|_time)$/.test(k) ? when(run[k]) : String(run[k] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </SimpleTable>
            </div>
          ) : (
            <EmptyNote>{t("ap_noRuns")}</EmptyNote>
          )}
        </div>
      )}
    </Modal>
  );
}

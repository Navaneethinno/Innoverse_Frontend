import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/Components/Common/DataTable";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { TabButton } from "@/Components/Common/ListView";
import { money } from "@/Components/InnoCBS/Accounts/accountShared";
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
import { DocFields, PillTabs, asForm, rangeProblem, typed, usePagedList, when } from "./docShared";

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

const SCHEDULE_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED", "ENDED"];
const RUN_COLUMNS = ["due_date", "attempt", "status", "amount", "rrn", "reason", "created_time"];

function Schedules() {
  const { t } = useTranslation(["paysePay", "common"]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const id = window.setTimeout(() => setQ(search.trim()), 400);
    return () => window.clearTimeout(id);
  }, [search]);
  const list = usePagedList(autopayApi.schedules, { ...(status ? { status } : {}), ...(q ? { search: q } : {}) });
  const columns = [
    { key: "ref", label: t("ap_ref"), render: (r) => <span className="font-mono text-xs font-semibold">{r.ref}</span> },
    { key: "entity", label: t("ap_party"), render: (r) => <span className="font-mono text-xs">{r.entity_type} {r.entity_id}<span className="block text-[10px] text-muted-foreground">{r.from_acct_num}</span></span> },
    { key: "bill_account", label: t("ap_billAccount"), render: (r) => <span className="text-xs">{r.provider_name}<span className="block font-mono text-[10px] text-muted-foreground">{r.bill_account}{r.nickname ? ` · ${r.nickname}` : ""}</span></span> },
    { key: "amount", label: t("ap_amount"), render: (r) => <span className="text-xs tabular-nums">{r.amount_mode === "BILL" ? t("ap_billAmount", { max: money(r.max_amount, r.currency_code) }) : money(r.amount, r.currency_code)}</span> },
    { key: "frequency", label: t("ap_frequency"), render: (r) => <span className="text-xs">{t(`ap_freq_${r.frequency}`, { defaultValue: r.frequency })}</span> },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={r.status} label={t(`ap_status_${r.status}`, { defaultValue: r.status })} /> },
    { key: "next_run_date", label: t("ap_nextRun"), render: (r) => <span className="whitespace-nowrap text-xs">{r.next_run_date || "—"}</span> },
    { key: "last_status", label: t("ap_lastRun"), render: (r) => (r.last_status ? <StatusBadge status={r.last_status} label={t(`ap_run_${r.last_status}`, { defaultValue: r.last_status })} variant="subtle" /> : "—") },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpen(r.ref)} /> },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="flex flex-wrap gap-1">
          <TabButton active={!status} onClick={() => setStatus("")}>
            {t("ap_all")}
          </TabButton>
          {SCHEDULE_STATUSES.map((s) => (
            <TabButton key={s} active={status === s} onClick={() => setStatus(s)}>
              {t(`ap_status_${s}`)}
            </TabButton>
          ))}
        </div>
        <SearchBox search={search} onSearch={setSearch} placeholder={t("ap_searchHint")} />
      </div>
      <DataTable bare serverSorted rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} columns={columns} rowKey={(r) => r.id} title={t("ap_tabSchedules")} emptyTitle={t("ap_noSchedules")} />
      {open && <ScheduleDetail reference={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// One schedule with its runs (the list call with `ref`).
function ScheduleDetail({ reference, onClose }) {
  const { t } = useTranslation(["paysePay", "common"]);
  const { scope } = useInstitutionScope();
  const [item, setItem] = useState(null);
  useEffect(() => {
    autopayApi
      .schedules(scope({ ref: reference, page: 1, limit: 1 }))
      .then((r) => setItem(recordOf(r)?.items?.[0] ?? {}))
      .catch((e) => (notifications.error(e.message), onClose()));
  }, [reference, scope, onClose]);
  const runs = item?.runs ?? [];
  return (
    <Modal open onClose={onClose} title={t("ap_scheduleTitle", { ref: reference })} size="lg">
      {!item ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          <Facts
            rows={[
              [t("ap_party"), `${item.entity_type} ${item.entity_id}`],
              [t("ap_fromAccount"), item.from_acct_num],
              [t("ap_provider"), [item.provider_name, item.service, item.product].filter(Boolean).join(" · ")],
              [t("ap_billAccount"), item.bill_account],
              [t("ap_nickname"), item.nickname || "—"],
              [t("ap_amountMode"), t(`ap_mode_${item.amount_mode}`, { defaultValue: item.amount_mode })],
              [t("ap_amount"), item.amount != null && item.amount !== "" ? money(item.amount, item.currency_code) : "—"],
              [t("ap_maxAmount"), item.max_amount ? money(item.max_amount, item.currency_code) : "—"],
              [t("ap_frequency"), t(`ap_freq_${item.frequency}`, { defaultValue: item.frequency })],
              [t("ap_runDay"), item.run_day ?? "—"],
              [t("ap_period"), `${item.start_date ?? "—"} → ${item.end_date || "—"}`],
              [t("ap_nextRun"), item.next_run_date || "—"],
              [t("ap_attempt"), item.attempt ?? 0],
              [t("ap_retryAt"), when(item.retry_at)],
              [t("ap_runsPaid"), item.runs_paid ?? 0],
              [t("ap_runsFailed"), item.runs_failed ?? 0],
              [t("ap_lastRun"), when(item.last_run_at)],
              [t("ap_lastReason"), item.last_reason || "—"],
              [t("common:status"), t(`ap_status_${item.status}`, { defaultValue: item.status })],
              [t("ap_consent"), [when(item.consent_at), item.consent_channel].filter(Boolean).join(" · ")],
              [t("ap_created"), when(item.created_time)],
            ]}
          />
          <h3 className="text-sm font-bold">{t("ap_runs")}</h3>
          {runs.length ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <SimpleTable columns={RUN_COLUMNS.map((k) => t(`ap_col_${k}`))}>
                <tbody>
                  {runs.map((run, i) => (
                    <tr key={`${run.due_date}-${run.attempt}-${i}`} className="border-t border-border">
                      {RUN_COLUMNS.map((k) => (
                        <td key={k} className="px-3 py-2 text-xs">
                          {k === "status" ? <StatusBadge status={run.status} label={t(`ap_run_${run.status}`, { defaultValue: run.status })} /> : k === "created_time" ? when(run[k]) : k === "amount" ? money(run.amount, item.currency_code) : String(run[k] ?? "—")}
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

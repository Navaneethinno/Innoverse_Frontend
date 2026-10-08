import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ClipboardCheck, Download, FileBarChart, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { recordOf, regulatorySubmissionsApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Facts, Section, dayDate, ratePct } from "../../TermDeposits/depositShared";
import { FormDialog } from "../loanDialogs";
import { MiniTable, StatusStrip, loanLabel, useInstitutionScope } from "../loanShared";

const REPORT_TYPES = ["LOAN_BOOK", "CREDIT_REGISTRY"];
const STATUSES = ["GENERATED", "SUBMITTED", "REJECTED"];
const RECORD_COLUMNS = ["facility_number", "borrower_type", "borrower_id", "product_code", "currency", "principal_disbursed", "principal_outstanding", "annual_rate", "disbursement_date", "maturity_date", "status", "days_past_due", "risk_class", "provision", "restructure_count", "written_off_amount", "recovered_amount"];

// The records as a CSV file, downloaded in the browser.
function downloadCsv(report) {
  const cell = (v) => {
    const text = v == null ? "" : String(v);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [RECORD_COLUMNS.join(","), ...(report.records ?? []).map((r) => RECORD_COLUMNS.map((c) => cell(r[c])).join(","))];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.report_type}_${report.as_of_date}_${report.id}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// LOANS > Regulatory Submissions (menu 188): reports of the loan book as it
// stands today (LOAN_BOOK, CREDIT_REGISTRY), sent to the regulator outside
// the platform; the outcome is recorded here once.
export function RegulatorySubmissions() {
  const { t } = useTranslation(["loans", "common"]);
  const can = usePagePermission();
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = rowsOf(await regulatorySubmissionsApi.list(scope({ page, page_size: limit, ...(status ? { status } : {}), ...(type ? { report_type: type } : {}) })))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [status, type, page, limit, scope]);
  useEffect(() => {
    void load();
  }, [load]);

  if (openId) {
    return (
      <SubmissionView
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const generate = async ({ report_type }) => {
    setBusy(true);
    try {
      const response = await regulatorySubmissionsApi.generate(scope({ report_type }));
      notifications.success(response?.message ?? t("reportGenerated"));
      setGenerating(false);
      const report = recordOf(response);
      if (report?.id) setOpenId(report.id);
      else void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "id", label: "#", render: (r) => <button type="button" onClick={() => setOpenId(r.id)} className="font-mono text-xs font-bold text-primary hover:underline">#{r.id}</button> },
    { key: "report_type", label: t("reportType"), render: (r) => <b className="text-xs">{loanLabel(t, r.report_type)}</b> },
    { key: "as_of_date", label: t("asOf"), render: (r) => <span className="text-xs">{dayDate(r.as_of_date)}</span> },
    { key: "record_count", label: t("records"), render: (r) => <span className="text-xs tabular-nums">{r.record_count}</span> },
    { key: "totals", label: t("outstanding"), sortable: false, render: (r) => <span className="text-xs">{Object.entries(r.totals ?? {}).map(([c, x]) => money(x.principal_outstanding, c)).join(" · ") || "—"}</span> },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} variant="subtle" /> },
    { key: "submission_reference", label: t("submissionReference"), render: (r) => <span className="text-xs">{r.submission_reference || "—"}</span> },
    { key: "generated_at", label: t("generated"), render: (r) => <span className="whitespace-nowrap text-xs">{r.generated_by} · {accountDate(r.generated_at)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <FileBarChart size={22} className="text-primary" /> {t("submissionsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("submissionsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} disabled={chooser && !institution} onClick={() => setGenerating(true)}>
              {t("generateReport")}
            </Button>
          )}
        </div>
      </div>
      {chooser && (
        <div className="mb-4 max-w-sm">
          <InstitutionField value={institution} onChange={setInstitution} />
        </div>
      )}
      <StatusStrip
        statuses={STATUSES}
        value={status}
        labelOf={(s) => t(`reportStatus_${s}`)}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
      />
      <div className="mb-4 max-w-xs">
        <FilterSelect
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          options={[{ value: "", label: t("anyReportType") }, ...REPORT_TYPES.map((v) => ({ value: v, label: loanLabel(t, v) }))]}
        />
      </div>
      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("submissionsTitle")}
        emptyTitle={t("noReports")}
        emptyDescription={t("noReportsHint")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
      {generating && (
        <FormDialog
          title={t("generateReport")}
          hint={t("generateHint")}
          busy={busy}
          onClose={() => setGenerating(false)}
          onSave={generate}
          initial={{ report_type: "LOAN_BOOK" }}
          required={["report_type"]}
          fields={[{ key: "report_type", label: t("reportType"), type: "select", options: REPORT_TYPES, hint: t("reportTypeHint"), span: "sm:col-span-2" }]}
        />
      )}
    </div>
  );
}

// One report: totals per currency, the records (exportable to CSV), and
// "Record outcome" once it has been sent.
function SubmissionView({ id, onBack }) {
  const { t } = useTranslation("loans");
  const can = usePagePermission();
  const [report, setReport] = useState(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setReport(recordOf(await regulatorySubmissionsApi.get({ id })));
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const record = async (body) => {
    setBusy(true);
    try {
      const response = await regulatorySubmissionsApi.record({ id, ...body });
      notifications.success(response?.message ?? t("outcomeRecorded"));
      setRecording(false);
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!report) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToReports")}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">
                {loanLabel(t, report.report_type)} <span className="font-mono text-muted-foreground">#{report.id}</span>
              </h1>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("asOfX", { date: dayDate(report.as_of_date) })} · {t("policyVersionX", { version: report.policy_version ?? "—" })} · {t("recordsN", { count: report.record_count ?? 0 })}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("generatedBy", { name: report.generated_by, date: accountDate(report.generated_at) })}
              {report.submitted_by ? ` · ${t("recordedByX", { name: report.submitted_by, date: accountDate(report.submitted_at) })}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" icon={Download} disabled={!report.records?.length} onClick={() => downloadCsv(report)}>
              {t("exportCsv")}
            </Button>
            {report.status === "GENERATED" && can("Edit") && (
              <Button size="sm" icon={ClipboardCheck} onClick={() => setRecording(true)}>
                {t("recordOutcome")}
              </Button>
            )}
          </div>
        </div>
        {(report.submission_reference || report.response_notes) && (
          <p className={cn("mt-3 rounded-xl px-3 py-2 text-xs font-semibold", report.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
            {[report.submission_reference, report.response_notes].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        {Object.entries(report.totals ?? {}).map(([cur, x]) => (
          <Section key={cur} title={t("totalsIn", { currency: cur, count: x.count })}>
            <Facts
              className="lg:grid-cols-3"
              rows={[
                [t("principalDisbursed"), money(x.principal_disbursed, cur)],
                [t("outstanding"), money(x.principal_outstanding, cur)],
                [t("provision"), money(x.provision, cur)],
                [t("writtenOff"), money(x.written_off, cur)],
              ]}
            />
          </Section>
        ))}
      </div>

      <MiniTable
        rows={report.records}
        rowKey={(r) => r.facility_number}
        columns={[
          { key: "facility_number", label: t("loan"), render: (r) => <b className="font-mono">{r.facility_number}</b> },
          { key: "borrower", label: t("borrower"), render: (r) => `${loanLabel(t, r.borrower_type)} #${r.borrower_id}` },
          { key: "product_code", label: t("product") },
          { key: "principal_disbursed", label: t("principalDisbursed"), align: "right", render: (r) => money(r.principal_disbursed, r.currency) },
          { key: "principal_outstanding", label: t("outstanding"), align: "right", render: (r) => money(r.principal_outstanding, r.currency) },
          { key: "annual_rate", label: t("rate"), align: "right", render: (r) => ratePct(r.annual_rate) },
          { key: "dates", label: t("period"), render: (r) => `${dayDate(r.disbursement_date)} – ${dayDate(r.maturity_date)}` },
          { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} variant="subtle" /> },
          { key: "days_past_due", label: t("dpd"), align: "right" },
          { key: "risk_class", label: t("riskClass"), render: (r) => loanLabel(t, r.risk_class) },
          { key: "provision", label: t("provision"), align: "right", render: (r) => money(r.provision, r.currency) },
          { key: "written_off_amount", label: t("writtenOff"), align: "right", render: (r) => money(r.written_off_amount, r.currency) },
          { key: "recovered_amount", label: t("recovered"), align: "right", render: (r) => money(r.recovered_amount, r.currency) },
        ]}
      />

      {recording && (
        <FormDialog
          title={t("recordOutcome")}
          hint={t("recordOutcomeHint")}
          busy={busy}
          onClose={() => setRecording(false)}
          onSave={(f) => record({ status: f.status, ...(f.submission_reference?.trim() ? { submission_reference: f.submission_reference.trim() } : {}), ...(f.response_notes?.trim() ? { response_notes: f.response_notes.trim() } : {}) })}
          initial={{ status: "SUBMITTED" }}
          required={["status"]}
          problem={(f) => (f.status === "SUBMITTED" && !f.submission_reference?.trim() ? t("submittedNeedsReference") : "")}
          fields={[
            { key: "status", label: t("outcome"), type: "select", options: ["SUBMITTED", "REJECTED"].map((v) => ({ value: v, label: t(`reportStatus_${v}`) })) },
            { key: "submission_reference", label: t("submissionReference") },
            { key: "response_notes", label: t("responseNotes"), span: "sm:col-span-2" },
          ]}
        />
      )}
    </div>
  );
}

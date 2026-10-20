import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, FileDown, FileUp, ListChecks, Plus, RefreshCw, Send, Users, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { bulkRegistrationApi as api } from "@/Services/Epurse/bulkRegistration.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Problems, Section, inputClass } from "../../Finance/Deposits/depositShared";
import { Labelled, PagedTable, filterBody, usePagedFilters } from "../../InnoCMS/cardOpsShared";
import { base64Blob, readPeopleFile } from "./readPeopleFile";

const BATCH_STATUSES = ["PENDING", "PROCESSING", "DONE", "REJECTED"];
const ROW_TONES = { APPROVED: "bg-emerald-50 text-emerald-800", IN_REVIEW: "bg-amber-50 text-amber-800", REJECTED: "bg-red-50 text-red-700", FAILED: "bg-red-50 text-red-700", PENDING: "bg-muted text-muted-foreground" };
const BATCH_TONES = { DONE: "bg-emerald-50 text-emerald-800", PROCESSING: "bg-sky-50 text-sky-800", REJECTED: "bg-red-50 text-red-700", PENDING: "bg-amber-50 text-amber-800" };

function Pill({ tones, code }) {
  const { t } = useTranslation("bulkReg");
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", tones[code] ?? "bg-muted")}>{t(`status_${code}`, { defaultValue: code })}</span>;
}

// processed_count / row_count while a batch registers.
function Progress({ batch }) {
  const pct = batch.row_count ? Math.min(100, Math.round(((batch.processed_count ?? 0) / batch.row_count) * 100)) : 0;
  return (
    <span className="block h-1.5 w-full min-w-24 overflow-hidden rounded-full bg-muted" title={`${batch.processed_count ?? 0} / ${batch.row_count}`}>
      <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </span>
  );
}

// A corporate customer as the batch's employer: a type-ahead (name,
// reference, phone or email; at most 20 back).
function EmployerPicker({ value, onChange }) {
  const { t } = useTranslation("bulkReg");
  const [term, setTerm] = useState("");
  const [found, setFound] = useState(null);
  useEffect(() => {
    const search = term.trim();
    if (search.length < 2) {
      setFound(null);
      return undefined;
    }
    let current = true;
    const timer = setTimeout(() => {
      api
        .employers({ search })
        .then((r) => current && setFound(rowsOf(r)))
        .catch((e) => current && (setFound([]), notifications.error(e.message)));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [term]);
  const describe = (e) => [e.phone_number, e.email, e.reference_id && `${e.reference_id.slice(0, 8)}…`].filter(Boolean).join(" · ");
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="min-w-0">
          <b>{value.name || t("unnamed")}</b>
          <span className="block truncate text-[10px] text-muted-foreground">{describe(value)}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-[11px] font-bold text-primary hover:underline">
          {t("change")}
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input className={inputClass} placeholder={t("searchEmployers")} value={term} onChange={(e) => setTerm(e.target.value)} />
      {found && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {found.length ? (
            found.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onChange(e)} className="block w-full px-3 py-2 text-start text-xs hover:bg-muted">
                  <b>{e.name || t("unnamed")}</b>
                  <span className="block text-[10px] text-muted-foreground">{describe(e)}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t("noEmployersFound")}</li>
          )}
        </ul>
      )}
    </div>
  );
}

// EPURSE > Bulk Registration (menu 71): batches of people (a company's
// employees, say) onboarded as customers once a checker authorises them,
// with a prepaid card if the batch asks for one.
export function BulkRegistration() {
  const { t } = useTranslation(["bulkReg", "common"]);
  const can = usePagePermission();
  const list = usePagedFilters({ search: "", batch_status: "" });
  const { applied, page, limit } = list;
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const row = rowsOf(await api.list({ page, page_size: limit, ...filterBody(applied) }))[0];
        setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [applied, page, limit],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(api.listPath, () => void load({ silent: true }));

  const back = () => {
    setScreen(null);
    void load();
  };
  if (screen === "new") return <NewBatch onClose={back} onSaved={(id) => setScreen({ id })} />;
  if (screen?.id) return <BatchView id={screen.id} onBack={back} />;

  const counts = (b) => (
    <span className="whitespace-nowrap text-[11px] tabular-nums">
      <b className="text-emerald-700">{b.approved_count}</b> / <b className="text-amber-700">{b.review_count}</b> / <b className="text-red-700">{b.rejected_count}</b> / <b className="text-red-700">{b.failed_count}</b>
    </span>
  );
  const columns = [
    {
      key: "batch_ref",
      label: t("batch"),
      align: "left",
      render: (b) => (
        <button type="button" onClick={() => setScreen({ id: b.id })} className="text-start">
          <p className="font-mono text-xs font-bold text-primary hover:underline">{b.batch_ref}</p>
          {b.narration && <p className="text-[10px] text-muted-foreground">{b.narration}</p>}
        </button>
      ),
    },
    { key: "customer_type_name", label: t("customerType"), render: (b) => <span className="text-xs">{b.customer_type_name || b.ownership_sub_type_name}</span> },
    { key: "employer_name", label: t("employer"), render: (b) => <span className="text-xs">{b.employer_name || "—"}</span> },
    { key: "card_mode", label: t("card"), render: (b) => <span className="text-xs">{t(`card_${b.card_mode}`, { defaultValue: b.card_mode })}{b.issuance_group_name ? ` · ${b.issuance_group_name}` : ""}</span> },
    { key: "row_count", label: t("rows"), render: (b) => <span className="text-xs font-bold tabular-nums">{b.row_count}</span> },
    { key: "counts", label: t("outcomes"), sortable: false, render: counts },
    { key: "batch_status", label: t("common:status"), render: (b) => <span className="grid gap-1"><Pill tones={BATCH_TONES} code={b.batch_status} />{b.batch_status === "PROCESSING" && <Progress batch={b} />}</span> },
    { key: "created_by", label: t("maker"), render: (b) => <span className="whitespace-nowrap text-xs">{b.created_by}<span className="block text-[10px] text-muted-foreground">{accountDate(b.created_time)}</span></span> },
    { key: "decided_by", label: t("checker"), render: (b) => <span className="whitespace-nowrap text-xs">{b.decided_by || "—"}{b.decided_time && <span className="block text-[10px] text-muted-foreground">{accountDate(b.decided_time)}</span>}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (b) => <RowActions buttons={{ view: true }} onView={() => setScreen({ id: b.id })} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Users size={22} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setScreen("new")}>
              {t("newBatch")}
            </Button>
          )}
        </div>
      </div>
      <PagedTable
        {...list}
        searchPlaceholder={t("searchBatches")}
        filterFields={<FilterSelect value={list.filters.batch_status} onChange={list.set("batch_status")} options={[{ value: "", label: t("anyStatus") }, ...BATCH_STATUSES.map((s) => ({ value: s, label: t(`status_${s}`) }))]} />}
        columns={columns}
        rows={data.items}
        total={data.total}
        loading={loading}
        title={t("title")}
        emptyTitle={t("noBatches")}
        emptyDescription={t("noBatchesHint")}
      />
    </div>
  );
}

// A new batch: customer type, employer and card; the template; the file
// read here and checked row by row; then submitted for a checker.
function NewBatch({ onClose, onSaved }) {
  const { t } = useTranslation(["bulkReg", "common"]);
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({ ownership_sub_type_id: "", employer_id: "", employer: null, card_mode: "NONE", issuance_group_id: "", narration: "" });
  const [file, setFile] = useState(null);
  const [checked, setChecked] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setChecked(null);
  };

  useEffect(() => {
    api
      .options({})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => setError(e.message));
  }, []);

  const max = options?.max_rows ?? 1000;
  const groups = useMemo(() => (options?.issuance_groups ?? []).filter((g) => g.extra === form.card_mode), [options, form.card_mode]);
  const typeId = Number(form.ownership_sub_type_id);
  const cardReady = form.card_mode === "NONE" || form.issuance_group_id;
  const rows = file?.rows ?? [];

  const run = (which, fn) => async () => {
    setBusy(which);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const downloadTemplate = run("template", async () => {
    const reply = rowsOf(await api.template({ ownership_sub_type_id: typeId }))[0];
    if (reply?.csv_base64) saveBlob(base64Blob(reply.csv_base64), reply.file_name ?? "bulk_registration_template.csv");
  });
  const pickFile = async (picked) => {
    setChecked(null);
    setError("");
    if (!picked) return setFile(null);
    try {
      const read = await readPeopleFile(picked);
      if (read.rows.length > max) {
        setFile(null);
        setError(t("tooManyRows", { count: read.rows.length, max }));
        return;
      }
      setFile({ name: picked.name, ...read });
    } catch {
      setFile(null);
      setError(t("cannotReadFile"));
    }
  };
  const check = run("check", async () => {
    const reply = rowsOf(await api.check({ ownership_sub_type_id: typeId, rows }))[0];
    setChecked({ problems: reply?.problems ?? [], rows: reply?.rows ?? rows.length });
  });
  const submit = run("add", async () => {
    const body = {
      ownership_sub_type_id: typeId,
      card_mode: form.card_mode,
      ...(form.employer_id ? { employer_id: Number(form.employer_id) } : {}),
      ...(form.card_mode !== "NONE" ? { issuance_group_id: Number(form.issuance_group_id) } : {}),
      ...(form.narration.trim() ? { narration: form.narration.trim() } : {}),
      rows,
    };
    const response = await api.add(body);
    notifications.success(response?.message ?? t("submitted"));
    onSaved(rowsOf(response)[0]?.id);
  });

  if (!options) return error ? <Problems message={error} /> : <PageSkeleton />;
  const clean = checked && checked.problems.length === 0;

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={15} className="rtl:-scale-x-100" /> {t("backToBatches")}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{t("newBatch")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t("newBatchHint", { max })}</p>

      <div className="grid gap-4">
        <Section title={t("stepBatch")}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Labelled label={t("customerType")}>
              <FilterSelect value={form.ownership_sub_type_id} onChange={(v) => set({ ownership_sub_type_id: v })} options={[{ value: "", label: t("choose") }, ...(options.customer_types ?? []).map((c) => ({ value: String(c.id), label: `${c.code} · ${c.name}` }))]} />
            </Labelled>
            <Labelled label={t("employerOptional")}>
              <EmployerPicker value={form.employer} onChange={(employer) => set({ employer, employer_id: employer ? String(employer.id) : "" })} />
            </Labelled>
            <Labelled label={t("card")}>
              <FilterSelect value={form.card_mode} onChange={(v) => set({ card_mode: v, issuance_group_id: "" })} options={(options.card_modes ?? ["NONE"]).map((m) => ({ value: m, label: t(`card_${m}`, { defaultValue: m }) }))} />
            </Labelled>
            {form.card_mode !== "NONE" && (
              <Labelled label={t("issuanceGroup")} hint={!groups.length ? t("noGroupForMode") : t(`cardHint_${form.card_mode}`)}>
                <FilterSelect value={form.issuance_group_id} onChange={(v) => set({ issuance_group_id: v })} options={[{ value: "", label: t("choose") }, ...groups.map((g) => ({ value: String(g.id), label: `${g.code} · ${g.name}` }))]} />
              </Labelled>
            )}
            <Labelled label={t("narrationOptional")} className="md:col-span-2 lg:col-span-4">
              <input className={inputClass} value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value.slice(0, 255) }))} />
            </Labelled>
          </div>
          {form.card_mode !== "NONE" && <p className="mt-2 text-[11px] text-muted-foreground">{t("cardFeeNote")}</p>}
        </Section>

        <Section title={t("stepFile")}>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" icon={FileDown} loading={busy === "template"} disabled={!typeId || Boolean(busy)} onClick={downloadTemplate}>
              {t("downloadTemplate")}
            </Button>
            <label className={cn("flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-bold text-primary hover:border-primary", !typeId && "pointer-events-none opacity-50")}>
              <FileUp size={14} /> {file ? file.name : t("chooseFile")}
              <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} onClick={(e) => (e.currentTarget.value = "")} />
            </label>
            {file && <span className="text-xs text-muted-foreground">{t("rowsRead", { count: rows.length })}</span>}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("fileHint")}</p>
        </Section>

        {checked && (
          <Section title={clean ? t("checkClean", { count: checked.rows }) : t("checkProblems", { count: checked.problems.length })}>
            {clean ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> {t("checkCleanHint")}
              </p>
            ) : (
              <DataTable
                bare
                compact
                rowKey={(p) => p.row_no}
                rows={checked.problems}
                title={t("problems")}
                columns={[
                  { key: "row_no", label: t("row"), render: (p) => <span className="text-xs tabular-nums">{p.row_no}</span> },
                  { key: "phone_number", label: t("phone"), render: (p) => <span className="font-mono text-xs">{p.phone_number || "—"}</span> },
                  { key: "problems", label: t("problems"), sortable: false, render: (p) => <ul className="list-disc ps-4 text-xs text-red-700">{(p.problems ?? []).map((x) => <li key={x}>{x}</li>)}</ul> },
                ]}
              />
            )}
          </Section>
        )}
        <Problems message={error} />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={Boolean(busy)}>
          {t("cancel")}
        </Button>
        <Button variant="secondary" icon={ListChecks} loading={busy === "check"} disabled={!typeId || !rows.length || Boolean(busy)} onClick={check}>
          {checked ? t("checkAgain") : t("checkRows")}
        </Button>
        <Button icon={Send} loading={busy === "add"} disabled={!clean || !cardReady || Boolean(busy)} onClick={submit}>
          {t("submitBatch", { count: rows.length })}
        </Button>
      </div>
    </div>
  );
}

// One batch: its facts, every row with its outcome, authorise / reject
// (another user), and the result file once done.
function BatchView({ id, onBack }) {
  const { t } = useTranslation(["bulkReg", "common"]);
  const can = usePagePermission();
  const [batch, setBatch] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState("");

  const reload = useCallback(async () => {
    try {
      setBatch(rowsOf(await api.get({ id }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useLiveChannel(api.listPath, (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void reload());
  // While the rows register, ask again every few seconds (the live channel's
  // `done` also refreshes it).
  const processing = batch?.batch_status === "PROCESSING";
  useEffect(() => {
    if (!processing) return undefined;
    const timer = setInterval(() => void reload(), 4000);
    return () => clearInterval(timer);
  }, [processing, reload]);

  const decide = async (verb, narration) => {
    setBusy(verb);
    setDialog(null);
    try {
      const response = await api[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      const next = rowsOf(response)[0];
      if (next) setBatch(next);
      else await reload();
    } catch (error) {
      notifications.error(error.message);
      await reload();
    } finally {
      setBusy("");
    }
  };
  const resultFile = async () => {
    setBusy("file");
    try {
      const reply = rowsOf(await api.result_file({ id }))[0];
      if (reply?.csv_base64) saveBlob(base64Blob(reply.csv_base64), reply.file_name ?? `${batch.batch_ref}_result.csv`);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy("");
    }
  };

  if (!batch) return <PageSkeleton />;
  const a = batch.actions ?? {};
  const buttons = [
    a.result_file && { key: "file", label: t("resultFile"), icon: FileDown, variant: "outline", run: resultFile },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("authorise"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
  ];
  const columns = [
    { key: "row_no", label: t("row"), render: (r) => <span className="text-xs tabular-nums">{r.row_no}</span> },
    { key: "phone_number", label: t("phone"), render: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.phone_number}{r.email && <span className="block font-sans text-[10px] text-muted-foreground">{r.email}</span>}</span> },
    { key: "display_name", label: t("name"), render: (r) => <span className="text-xs">{r.display_name || r.fields?.full_name || "—"}</span> },
    { key: "row_status", label: t("common:status"), render: (r) => <Pill tones={ROW_TONES} code={r.row_status} /> },
    { key: "reference_id", label: t("customerRef"), render: (r) => <span className="font-mono text-[10px]">{r.reference_id || "—"}</span> },
    { key: "acct_num", label: t("account"), render: (r) => <span className="font-mono text-xs">{r.acct_num || "—"}</span> },
    { key: "pan_masked", label: t("card"), render: (r) => <span className="whitespace-nowrap text-xs"><span className="font-mono">{r.pan_masked || "—"}</span>{r.card_note && <span className="block text-[10px] text-muted-foreground">{r.card_note}</span>}</span> },
    { key: "reason", label: t("reason"), render: (r) => <span className="text-xs">{r.reason || "—"}</span> },
  ];

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={15} className="rtl:-scale-x-100" /> {t("backToBatches")}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">{batch.batch_ref}</h1>
              <Pill tones={BATCH_TONES} code={batch.batch_status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[batch.customer_type_name || batch.ownership_sub_type_name, batch.employer_name, batch.inst_profile_name].filter(Boolean).join(" · ")}</p>
          </div>
          <ActionButtons buttons={buttons} busy={Boolean(busy)} />
        </div>
        {processing && (
          <div className="mt-3 grid gap-1.5 rounded-xl bg-[var(--primary-light)] px-3 py-2 text-xs font-semibold text-primary">
            <span className="flex items-center gap-2">
              <Spinner size={14} /> {t("registering", { done: batch.processed_count ?? 0, count: batch.row_count })}
            </span>
            <Progress batch={batch} />
          </div>
        )}
      </div>

      <Section title={t("batch")} className="mb-4">
        <Facts
          rows={[
            [t("card"), `${t(`card_${batch.card_mode}`, { defaultValue: batch.card_mode })}${batch.issuance_group_name ? ` · ${batch.issuance_group_name}` : ""}`],
            batch.card_order_id > 0 && [t("cardOrder"), `#${batch.card_order_id}`],
            [t("rows"), batch.row_count],
            [t("status_APPROVED"), batch.approved_count, "good"],
            [t("status_IN_REVIEW"), batch.review_count],
            [t("status_REJECTED"), batch.rejected_count],
            [t("status_FAILED"), batch.failed_count],
            [t("maker"), `${batch.created_by} · ${accountDate(batch.created_time)}`],
            batch.decided_by && [t("checker"), `${batch.decided_by} · ${accountDate(batch.decided_time)}`],
            batch.narration && [t("narration"), batch.narration],
            batch.decision_narration && [t("decisionNarration"), batch.decision_narration],
          ]}
        />
      </Section>

      <Section title={t("people", { count: batch.items?.length ?? 0 })}>
        <DataTable bare rowKey={(r) => r.row_no} rows={batch.items ?? []} columns={columns} title={t("people", { count: batch.items?.length ?? 0 })} emptyTitle={t("noRows")} />
      </Section>

      {dialog && (
        <NarrationDialog
          title={t(dialog === "auth" ? "authoriseTitle" : "rejectTitle")}
          hint={t(dialog === "auth" ? "authoriseHint" : "rejectHint", { count: batch.row_count })}
          confirmLabel={t(dialog === "auth" ? "authorise" : "reject")}
          variant={dialog === "auth" ? "primary" : "danger"}
          required={dialog === "deauth"}
          busy={Boolean(busy)}
          onClose={() => setDialog(null)}
          onSave={(narration) => decide(dialog, narration)}
        />
      )}
    </div>
  );
}

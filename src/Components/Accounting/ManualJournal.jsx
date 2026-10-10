import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, Plus, Scale, Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { statusTabs } from "@/Components/Common/listTabs";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { useListSearch } from "@/Hooks/useListSearch";
import { usePagePermission } from "@/Hooks/usePermission";
import { glAccountsApi, glJournalsApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { MiniTable, RowsEditor, Tabs } from "../Loans/loanShared";
import { ActionButtons, Problems, inputClass, labelClass } from "../TermDeposits/depositShared";
import { ProductStatus } from "../TermDeposits/DepositProducts/productShared";
import { GlType, glAmount, useGlAccounts, useRecordActions } from "./accountingShared";

const STATUSES = ["2", "1", "5", "8"];
const today = () => new Date().toISOString().slice(0, 10);

// ACCOUNTING > Manual Journal (menu 215): moving money between GL accounts,
// mostly to settle with providers (DR the settlement GL, CR the bank GL).
// A journal posts only when a checker authorises it; a posted one is undone
// by a reversal journal.
export function ManualJournal() {
  const { t } = useTranslation("accounting");
  const can = usePagePermission();
  const [tab, setTab] = useState("journals");
  const [form, setForm] = useState(null); // a prefill for a new journal
  const [viewing, setViewing] = useState(null);
  const [version, setVersion] = useState(0);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    glAccountsApi
      .options({})
      .then((r) => setCurrencies(rowsOf(r)[0]?.currencies ?? []))
      .catch(() => setCurrencies([]));
  }, []);

  return (
    <div className="pb-8 pt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle>{t("jrnTitle")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("jrnSubtitle")}</p>
        </div>
        {can("Add") && (
          <Button size="sm" icon={Plus} onClick={() => setForm({})}>
            {t("newJournal")}
          </Button>
        )}
      </div>
      <Tabs tabs={[{ key: "journals" }, { key: "settlement" }]} value={tab} onChange={setTab} labelOf={(k) => t(`jrnTab_${k}`)} />
      {tab === "journals" && <JournalList version={version} onView={setViewing} />}
      {tab === "settlement" && <Settlement currencies={currencies} onSettle={can("Add") ? setForm : null} />}
      {form && (
        <JournalForm
          prefill={form}
          currencies={currencies}
          onClose={() => setForm(null)}
          onSaved={(j) => {
            setForm(null);
            setTab("journals");
            setVersion((v) => v + 1);
            if (j?.id) setViewing(j.id);
          }}
        />
      )}
      {viewing && <JournalDetail id={viewing} onClose={() => setViewing(null)} onChanged={() => setVersion((v) => v + 1)} onOpen={setViewing} />}
    </div>
  );
}

function JournalList({ version, onView }) {
  const { t } = useTranslation("accounting");
  const [status, setStatus] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, bind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    glJournalsApi
      .list({ page, page_size: limit, ...(status ? { status: Number(status) } : {}), ...(term ? { search: term } : {}), ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) })
      .then((r) => {
        const row = rowsOf(r)[0];
        if (!cancelled) setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      })
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, term, range, page, limit, version]);

  const setRangeKey = (key) => (e) => {
    setRange((r) => ({ ...r, [key]: e.target.value }));
    setPage(1);
  };
  return (
    <ListPanel
      tabs={statusTabs(STATUSES, (s) => `accounting:jstatus_${s}`)}
      value={status}
      onChange={(s) => {
        setStatus(s);
        setPage(1);
      }}
      {...bind}
      searchPlaceholder={t("searchJournals")}
      filters={
        <>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("from")}
            <DateInput className={cn(inputClass, "w-auto")} value={range.from} onChange={setRangeKey("from")} />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("to")}
            <DateInput className={cn(inputClass, "w-auto")} value={range.to} min={range.from || undefined} onChange={setRangeKey("to")} />
          </label>
        </>
      }
    >
      <DataTable
        bare
        columns={[
          {
            key: "reference",
            label: t("journal"),
            align: "left",
            render: (j) => (
              <button type="button" onClick={() => onView(j.id)} className="text-left">
                <p className="text-xs font-bold text-primary hover:underline">
                  #{j.id} {j.reference && <span className="font-mono">· {j.reference}</span>}
                </p>
                <p className="max-w-xs truncate text-[11px] text-muted-foreground">{j.narration}</p>
              </button>
            ),
          },
          { key: "kind", label: t("kind"), render: (j) => <span className="text-xs">{t(`jkind_${j.kind}`, { defaultValue: j.kind })}</span> },
          { key: "total", label: t("amount"), render: (j) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(j.total, j.currency_code)}</span> },
          { key: "status", label: t("status"), render: (j) => <ProductStatus product={{ ...j, status_name: t(`jstatus_${j.status}`, { defaultValue: j.status_name }) }} /> },
          { key: "rrn", label: "RRN", render: (j) => <span className="font-mono text-xs">{j.rrn || "—"}</span> },
          { key: "created_by", label: t("madeBy"), render: (j) => <span className="text-xs">{j.created_by} · {accountDate(j.created_time)}</span> },
          { key: "actions", label: t("open"), sortable: false, render: (j) => <RowActions buttons={{ view: true }} onView={() => onView(j.id)} /> },
        ]}
        rows={data.items}
        rowKey={(j) => j.id}
        isLoading={loading}
        title={t("jrnTab_journals")}
        emptyTitle={t("noJournals")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(n);
            setPage(1);
          },
        }}
      />
    </ListPanel>
  );
}

const blankLine = (op = "DR") => ({ gl_account_id: "", op, amount: "", note: "" });

// A new journal: currency, narration, reference and two or more lines whose
// debits equal their credits. `prefill` comes from Settle.
function JournalForm({ prefill, currencies, onClose, onSaved }) {
  const { t } = useTranslation("accounting");
  const accounts = useGlAccounts();
  const [head, setHead] = useState({ currency_id: String(prefill.currency_id ?? currencies.find((c) => c.is_base_currency)?.id ?? currencies[0]?.id ?? ""), narration: prefill.narration ?? "", reference: prefill.reference ?? "" });
  const [lines, setLines] = useState(prefill.lines ?? [blankLine("DR"), blankLine("CR")]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = currencies.find((c) => String(c.id) === String(head.currency_id));
  const code = currency?.alpha_code;
  const total = (op) => lines.filter((l) => l.op === op).reduce((n, l) => n + (Number(l.amount) || 0), 0);
  const dr = total("DR");
  const cr = total("CR");
  const balanced = dr > 0 && Math.abs(dr - cr) < 1e-9;
  const ready = head.currency_id && head.narration.trim() && lines.length >= 2 && lines.every((l) => l.gl_account_id && Number(l.amount) > 0) && balanced;
  const glOptions = useMemo(
    () => (accounts ?? []).filter((g) => g.multi_currency || !code || g.currency_code === code).map((g) => ({ value: String(g.id), label: `${g.name} · ${[g.gl_code, g.account_number].filter(Boolean).join(" · ")}` })),
    [accounts, code],
  );

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await glJournalsApi.add({
        currency_id: Number(head.currency_id),
        narration: head.narration.trim(),
        ...(head.reference.trim() ? { reference: head.reference.trim() } : {}),
        lines: lines.map((l) => ({ gl_account_id: Number(l.gl_account_id), op: l.op, amount: String(l.amount), ...(String(l.note ?? "").trim() ? { note: l.note.trim() } : {}) })),
      });
      notifications.success(r?.message ?? t("saved"));
      onSaved(rowsOf(r)[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t("newJournal")}
      icon={<BookOpenCheck size={15} />}
      footer={
        <>
          <span className={cn("mr-auto text-xs font-bold tabular-nums", balanced ? "text-emerald-700" : "text-amber-700")}>
            {t("drCrTotals", { dr: money(dr, code), cr: money(cr, code) })} {!balanced && dr + cr > 0 && `· ${t("differenceX", { value: money(Math.abs(dr - cr), code) })}`}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button size="sm" icon={Send} loading={busy} disabled={!ready} onClick={save}>
            {t("submitForApproval")}
          </Button>
        </>
      }
    >
      {!accounts ? (
        <div className="flex justify-center p-6">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              {t("currency")}
              <FilterSelect className="mt-1.5" value={head.currency_id} onChange={(v) => setHead((h) => ({ ...h, currency_id: v }))} options={currencies.map((c) => ({ value: String(c.id), label: `${c.alpha_code} · ${c.name}` }))} />
            </label>
            <label className={labelClass}>
              {t("reference")}
              <input className={cn(inputClass, "mt-1.5")} value={head.reference} onChange={(e) => setHead((h) => ({ ...h, reference: e.target.value }))} placeholder={t("referenceHint")} />
            </label>
            <label className={cn(labelClass, "sm:col-span-3")}>
              {t("narration")} <span className="text-red-600">*</span>
              <input className={cn(inputClass, "mt-1.5")} value={head.narration} onChange={(e) => setHead((h) => ({ ...h, narration: e.target.value }))} />
            </label>
          </div>
          <RowsEditor
            rows={lines}
            onChange={setLines}
            blank={() => blankLine(dr > cr ? "CR" : "DR")}
            addLabel={t("addLine")}
            decimals={currency?.amount_decimals ?? 2}
            columns="lg:grid-cols-[3fr_1fr_1fr_2fr]"
            fields={[
              { key: "gl_account_id", label: t("gl"), type: "select", blank: t("choose"), options: glOptions },
              { key: "op", label: t("side"), type: "select", options: [{ value: "DR", label: t("debit") }, { value: "CR", label: t("credit") }] },
              { key: "amount", label: t("amount"), type: "amount" },
              { key: "note", label: t("note") },
            ]}
          />
          {error && <Problems message={error} />}
        </div>
      )}
    </Modal>
  );
}

// One journal: its lines, who made and decided it, and the actions left
// (authorise, reject, cancel, reverse).
function JournalDetail({ id, onClose, onChanged, onOpen }) {
  const { t } = useTranslation("accounting");
  const [j, setJ] = useState(null);
  const load = useCallback(() => glJournalsApi.get({ id }).then((r) => setJ(rowsOf(r)[0] ?? null)), [id]);
  useEffect(() => {
    load().catch((e) => notifications.error(e.message));
  }, [load]);
  const { buttons, busy, dialog } = useRecordActions({
    actions: j?.actions,
    run: async (verb, narration) => {
      const r = await glJournalsApi[verb]({ id, ...(narration ? { narration } : {}) });
      notifications.success(r?.message ?? t("done"));
      onChanged();
      const made = rowsOf(r)[0];
      if (verb === "reverse" && made?.id && made.id !== id) return onOpen(made.id);
      await load();
    },
  });
  return (
    <Modal open onClose={onClose} size="xl" title={j ? `${t(`jkind_${j.kind}`, { defaultValue: j.kind })} #${j.id}` : t("journal")} icon={<BookOpenCheck size={15} />}>
      {!j ? (
        <div className="flex justify-center p-6">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1 text-xs">
              <span className="flex flex-wrap items-center gap-2">
                <ProductStatus product={{ ...j, status_name: t(`jstatus_${j.status}`, { defaultValue: j.status_name }) }} />
                <b className="text-sm tabular-nums">{money(j.total, j.currency_code)}</b>
                {j.rrn && <span className="font-mono text-muted-foreground">RRN {j.rrn}</span>}
              </span>
              <p className="text-sm font-semibold">{j.narration}</p>
              {j.reference && <p className="text-muted-foreground">{t("reference")}: {j.reference}</p>}
              <p className="text-muted-foreground">
                {t("madeBy")}: {j.created_by} · {accountDate(j.created_time)}
              </p>
              {j.decided_by && (
                <p className="text-muted-foreground">
                  {t("decidedBy")}: {j.decided_by} · {accountDate(j.decided_time)}
                  {j.decision_narration ? ` · “${j.decision_narration}”` : ""}
                </p>
              )}
              {j.reverses_journal_id > 0 && (
                <button type="button" className="w-fit text-left font-bold text-primary hover:underline" onClick={() => onOpen(j.reverses_journal_id)}>
                  {t("reversesX", { id: j.reverses_journal_id })}
                </button>
              )}
              {j.reversed_by_journal_id > 0 && (
                <button type="button" className="w-fit text-left font-bold text-primary hover:underline" onClick={() => onOpen(j.reversed_by_journal_id)}>
                  {t("reversedByX", { id: j.reversed_by_journal_id })}
                </button>
              )}
            </div>
            <ActionButtons buttons={buttons} busy={busy} />
          </div>
          <MiniTable
            rows={j.lines ?? []}
            rowKey={(l, i) => i}
            columns={[
              { key: "gl", label: t("gl"), render: (l) => <span><b>{l.gl_name}</b> <span className="font-mono text-muted-foreground">{[l.gl_code, l.account_number].filter(Boolean).join(" · ")}</span></span> },
              { key: "type", label: t("glType"), render: (l) => <GlType value={l.gl_type} /> },
              { key: "debit", label: t("debit"), align: "right", render: (l) => (l.op === "DR" ? <b className="tabular-nums">{money(l.amount, j.currency_code)}</b> : "") },
              { key: "credit", label: t("credit"), align: "right", render: (l) => (l.op === "CR" ? <b className="tabular-nums">{money(l.amount, j.currency_code)}</b> : "") },
              { key: "note", label: t("note"), render: (l) => <span className="text-muted-foreground">{l.note || "—"}</span> },
            ]}
          />
        </div>
      )}
      {dialog}
    </Modal>
  );
}

// The settlement GLs for a day: what we owe each provider (or it owes us),
// with Settle opening a journal: DR the GL for its closing, CR a bank GL.
function Settlement({ currencies, onSettle }) {
  const { t } = useTranslation("accounting");
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    glJournalsApi
      .settlement({ date })
      .then((r) => !cancelled && setData(rowsOf(r)[0] ?? { rows: [], totals: [] }))
      .catch((e) => {
        if (!cancelled) {
          notifications.error(e.message);
          setData({ rows: [], totals: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const settle = (row, amount) => {
    const value = Math.abs(Number(amount) || 0).toFixed(currencies.find((c) => c.id === row.currency_id)?.amount_decimals ?? 2);
    const owe = Number(amount) >= 0;
    // A liability in credit (we owe) is cleared by a debit; the other way round by a credit.
    const sideOf = row.normal_balance === "CR" ? (owe ? "DR" : "CR") : owe ? "CR" : "DR";
    onSettle({
      currency_id: row.currency_id,
      narration: t("settleNarration", { name: row.name, date }),
      lines: [
        { gl_account_id: String(row.gl_account_id), op: sideOf, amount: value, note: "" },
        { gl_account_id: "", op: sideOf === "DR" ? "CR" : "DR", amount: value, note: "" },
      ],
    });
  };

  const amount = (row, key) => <span className={cn("whitespace-nowrap text-xs tabular-nums", Number(row[key]) < 0 && "text-red-700")}>{glAmount(row[key], row.currency_code)}</span>;
  const columns = [
    { key: "name", label: t("gl"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b> <span className="font-mono text-muted-foreground">{[r.gl_code, r.account_number].filter(Boolean).join(" · ")}</span></span> },
    { key: "opening", label: t("opening"), render: (r) => amount(r, "opening") },
    { key: "debits", label: t("debits"), render: (r) => amount(r, "debits") },
    { key: "credits", label: t("credits"), render: (r) => amount(r, "credits") },
    { key: "closing", label: t("closing"), render: (r) => <b>{amount(r, "closing")}</b> },
    { key: "current", label: t("current"), render: (r) => amount(r, "current") },
    { key: "postings", label: t("postings"), render: (r) => <span className="text-xs tabular-nums">{r.postings}</span> },
    {
      key: "settle",
      label: "",
      sortable: false,
      render: (r) =>
        onSettle && r.gl_account_id ? (
          <Button size="sm" variant="secondary" icon={Scale} disabled={!Number(date === today() ? r.current : r.closing)} onClick={() => settle(r, date === today() ? r.current : r.closing)}>
            {t("settle")}
          </Button>
        ) : null,
    },
  ];

  return (
    <ListPanel
      tabs={[]}
      filters={
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {t("day")}
          <DateInput className={cn(inputClass, "w-auto")} value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
        </label>
      }
    >
      <p className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">{t("settlementHint")}</p>
      <DataTable
        bare
        columns={columns}
        rows={[...(data?.rows ?? []), ...(data?.totals ?? []).map((x) => ({ ...x, name: t("totalX", { currency: x.currency_code }), gl_account_id: 0 }))]}
        rowKey={(r, i) => `${r.gl_account_id}-${r.currency_id}-${i}`}
        isLoading={!data}
        title={t("jrnTab_settlement")}
        emptyTitle={t("noSettlementGls")}
        serverSorted
      />
    </ListPanel>
  );
}

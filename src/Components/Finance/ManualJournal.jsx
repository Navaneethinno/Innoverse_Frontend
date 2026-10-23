import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, Plus, Scale, Send, X } from "lucide-react";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Spinner } from "@/Components/Common/Spinner";
import { TxnLimitWarning } from "@/Components/Common/TxnLimitWarning";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { glAccountsApi, glJournalsApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { MiniTable, Tabs } from "./Loans/loanShared";
import { ActionButtons, Problems, inputClass, labelClass } from "./Deposits/depositShared";
import { ProductStatus } from "./Settings/DepositProducts/productShared";
import { GlType, glAmount, useGlAccounts, useRecordActions } from "./accountingShared";

const today = () => new Date().toISOString().slice(0, 10);

// Finance > Finance Transaction (the manual journal API): moving money
// between GLs and customers' / merchants' accounts, in any mix, e.g. to
// settle with providers (DR the settlement GL, CR the bank GL).
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

  const listActions = (
    <>
      {can("Add") && (
        <Button size="sm" icon={Plus} onClick={() => setForm({})}>
          {t("newJournal")}
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-8 pt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle>{t("jrnTitle")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("jrnSubtitle")}</p>
        </div>
      </div>
      <Tabs tabs={[{ key: "journals" }, { key: "settlement" }]} value={tab} onChange={setTab} labelOf={(k) => t(`jrnTab_${k}`)} />
      {tab === "journals" && <JournalList actions={listActions} version={version} onView={setViewing} />}
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

function JournalList({ actions, version, onView }) {
  const { t } = useTranslation("accounting");
  const list = useServerList({ api: glJournalsApi.listPath, call: glJournalsApi.list });
  // A journal saved or decided on this page.
  const { reload } = list;
  useEffect(() => {
    if (version) reload();
  }, [version, reload]);

  return (
    <ListTable
      list={list}
      actions={actions}
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
      rowKey={(j) => j.id}
      title={t("jrnTab_journals")}
      emptyTitle={t("noJournals")}
    />
  );
}

const blankLine = (op = "DR") => ({ kind: "GL", gl_account_id: "", account: null, op, amount: "", note: "" });
const SIDES = ["DR", "CR"];
const OWNER_KINDS = { CUST_INDV: "ownerCustIndv", CUST_CORP: "ownerCustCorp", MERCH_INDV: "ownerMerchIndv", MERCH_CORP: "ownerMerchCorp" };

// A total as whole units of the last decimal, so totals compare exactly.
const units = (lines, op, decimals) => lines.filter((l) => l.op === op).reduce((n, l) => n + Math.round((Number(l.amount) || 0) * 10 ** decimals), 0);

// A new journal: currency, narration, reference, then debit and credit rows,
// each a GL or a customer's / merchant's account, in any mix. Submit waits
// until the totals are equal to the last decimal. `prefill` comes from
// Settle.
function JournalForm({ prefill, currencies, onClose, onSaved }) {
  const { t } = useTranslation("accounting");
  const accounts = useGlAccounts();
  const [head, setHead] = useState({ currency_id: String(prefill.currency_id ?? currencies.find((c) => c.is_base_currency)?.id ?? currencies[0]?.id ?? ""), narration: prefill.narration ?? "", reference: prefill.reference ?? "" });
  const [lines, setLines] = useState(() => (prefill.lines ?? [blankLine("DR"), blankLine("CR")]).map((l) => ({ ...blankLine(l.op), ...l })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = currencies.find((c) => String(c.id) === String(head.currency_id));
  const code = currency?.alpha_code;
  const decimals = Number(currency?.amount_decimals ?? 2);
  const dr = units(lines, "DR", decimals);
  const cr = units(lines, "CR", decimals);
  const balanced = dr > 0 && dr === cr;
  const picked = (l) => (l.kind === "GL" ? Boolean(l.gl_account_id) : Boolean(l.account));
  const ready = head.currency_id && head.narration.trim() && SIDES.every((op) => lines.some((l) => l.op === op)) && lines.every((l) => picked(l) && Number(l.amount) > 0) && balanced;
  const gls = useMemo(() => (accounts ?? []).filter((g) => g.multi_currency || !code || g.currency_code === code), [accounts, code]);
  const glOptions = useMemo(() => gls.map((g) => ({ value: String(g.id), label: `${g.name} · ${[g.gl_code, g.account_number].filter(Boolean).join(" · ")}` })), [gls]);
  const fromUnits = (n) => money(n / 10 ** decimals, code);

  // A new currency: picked accounts of another currency no longer fit.
  const setCurrency = (v) => {
    setHead((h) => ({ ...h, currency_id: v }));
    setLines((ls) => ls.map((l) => (l.account && String(l.account.currency_id) !== String(v) ? { ...l, account: null } : l)));
  };
  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await glJournalsApi.add({
        currency_id: Number(head.currency_id),
        narration: head.narration.trim(),
        ...(head.reference.trim() ? { reference: head.reference.trim() } : {}),
        lines: lines.map((l) => ({
          ...(l.kind === "GL" ? { gl_account_id: Number(l.gl_account_id) } : { acct_num: l.account.acct_num }),
          op: l.op,
          amount: String(l.amount),
          ...(String(l.note ?? "").trim() ? { note: l.note.trim() } : {}),
        })),
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
            {t("drCrTotals", { dr: fromUnits(dr), cr: fromUnits(cr) })} {!balanced && dr + cr > 0 && `· ${t("differenceX", { value: fromUnits(Math.abs(dr - cr)) })}`}
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
              <FilterSelect className="mt-1.5" value={head.currency_id} onChange={setCurrency} options={currencies.map((c) => ({ value: String(c.id), label: `${c.alpha_code} · ${c.name}` }))} />
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
          {SIDES.map((op) => (
            <section key={op} className="rounded-2xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-700">{t(op === "DR" ? "debits" : "credits")}</p>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">{fromUnits(op === "DR" ? dr : cr)}</span>
              </div>
              <ul className="grid gap-2">
                {lines.map((l, i) =>
                  l.op !== op ? null : (
                    <JournalLine
                      key={i}
                      line={l}
                      gls={gls}
                      glOptions={glOptions}
                      currencyId={head.currency_id}
                      code={code}
                      decimals={decimals}
                      onChange={(patch) => setLine(i, patch)}
                      onRemove={lines.filter((x) => x.op === op).length > 1 ? () => setLines((ls) => ls.filter((_, j) => j !== i)) : null}
                    />
                  ),
                )}
              </ul>
              <button type="button" onClick={() => setLines((ls) => [...ls, blankLine(op)])} className="mt-2 flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Plus size={13} /> {t(op === "DR" ? "addDebit" : "addCredit")}
              </button>
            </section>
          ))}
          {balanced && <TxnLimitWarning currencyCode={code} amount={dr / 10 ** decimals} />}
          {error && <Problems message={error} />}
        </div>
      )}
    </Modal>
  );
}

// One row: a GL or an account, its balance under the picker, the amount
// (in the institution's number format) and remarks.
function JournalLine({ line: l, gls, glOptions, currencyId, code, decimals, onChange, onRemove }) {
  const { t } = useTranslation("accounting");
  const gl = l.kind === "GL" && gls.find((g) => String(g.id) === String(l.gl_account_id));
  const glBalance = gl && (gl.balances ?? []).find((b) => !code || b.currency_code === code);
  return (
    <li className="grid gap-2 rounded-xl border border-border bg-card p-2.5 lg:grid-cols-[auto_3fr_1.2fr_2fr_auto] lg:items-start">
      <SegmentedSwitch value={l.kind} onChange={(kind) => onChange({ kind, gl_account_id: "", account: null })} options={[{ value: "GL", label: t("lineGl") }, { value: "ACCOUNT", label: t("lineAccount") }]} />
      <div className="min-w-0">
        {l.kind === "GL" ? (
          <FilterSelect value={String(l.gl_account_id || "")} onChange={(v) => onChange({ gl_account_id: v })} options={[{ value: "", label: t("choose") }, ...glOptions]} />
        ) : (
          <AccountPicker value={l.account} currencyId={currencyId} onChange={(account) => onChange({ account })} />
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {gl && t("balanceX", { value: glBalance ? money(glBalance.balance, glBalance.currency_code) : money(0, code) })}
          {l.account && (
            <>
              {t("availableX", { value: money(l.account.avail_bal, l.account.currency_code) })} · {t("ledgerX", { value: money(l.account.ledger_bal, l.account.currency_code) })}
              {l.account.restriction && <b className="ml-1 text-red-700">{t(`restriction_${l.account.restriction}`)}</b>}
            </>
          )}
        </p>
      </div>
      <AmountInput className={inputClass} value={l.amount} decimals={decimals} onChange={(amount) => onChange({ amount })} />
      <input className={inputClass} placeholder={t("note")} value={l.note} onChange={(e) => onChange({ note: e.target.value })} />
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={t("removeLine")} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive">
          <X size={14} />
        </button>
      ) : (
        <span />
      )}
    </li>
  );
}

// Active customer and merchant wallets in the journal's currency: part of
// the account number, the holder's name or reference.
function AccountPicker({ value, currencyId, onChange }) {
  const { t } = useTranslation("accounting");
  const [term, setTerm] = useState("");
  const [found, setFound] = useState(null);
  useEffect(() => {
    const search = term.trim();
    if (!search) {
      setFound(null);
      return undefined;
    }
    let current = true;
    const timer = setTimeout(() => {
      glJournalsApi
        .accounts({ search, ...(currencyId ? { currency_id: Number(currencyId) } : {}), limit: 20 })
        .then((r) => current && setFound(rowsOf(r)[0]?.items ?? []))
        .catch((e) => current && (setFound([]), notifications.error(e.message)));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [term, currencyId]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="min-w-0">
          <b className="font-mono">{value.acct_num}</b> · {value.owner_name}
          <span className="block truncate text-[10px] text-muted-foreground">{[t(OWNER_KINDS[value.owner_kind] ?? "", { defaultValue: value.owner_kind }), value.acct_product_name].filter(Boolean).join(" · ")}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-[11px] font-bold text-primary hover:underline">
          {t("change")}
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input className={inputClass} placeholder={t("searchAccounts")} value={term} onChange={(e) => setTerm(e.target.value)} />
      {found && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {found.length ? (
            found.map((a) => (
              <li key={a.acct_num}>
                <button type="button" onClick={() => onChange(a)} className="block w-full px-3 py-2 text-left text-xs hover:bg-muted">
                  <b className="font-mono">{a.acct_num}</b> · {a.owner_name}
                  <span className="block text-[10px] text-muted-foreground">
                    {[t(OWNER_KINDS[a.owner_kind] ?? "", { defaultValue: a.owner_kind }), a.acct_product_name, money(a.avail_bal, a.currency_code)].filter(Boolean).join(" · ")}
                    {a.restriction && <b className="ml-1 text-red-700">{t(`restriction_${a.restriction}`)}</b>}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t("noAccountsFound")}</li>
          )}
        </ul>
      )}
    </div>
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
              {
                key: "gl",
                label: t("glOrAccount"),
                render: (l) =>
                  l.line_kind === "ACCOUNT" ? (
                    <span>
                      <b>{l.owner_name}</b> <span className="font-mono text-muted-foreground">{l.account_number}</span>
                      <span className="block text-[10px] text-muted-foreground">{[t(OWNER_KINDS[l.owner_kind] ?? "", { defaultValue: l.owner_kind }), l.acct_product_name].filter(Boolean).join(" · ")}</span>
                    </span>
                  ) : (
                    <span><b>{l.gl_name}</b> <span className="font-mono text-muted-foreground">{[l.gl_code, l.account_number].filter(Boolean).join(" · ")}</span></span>
                  ),
              },
              { key: "type", label: t("glType"), render: (l) => (l.line_kind === "ACCOUNT" ? <span className="text-xs text-muted-foreground">{t("lineAccount")}</span> : <GlType value={l.gl_type} />) },
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

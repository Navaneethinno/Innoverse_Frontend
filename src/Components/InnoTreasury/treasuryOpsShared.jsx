import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Facts, Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsTable, dateCell, first, useL, words } from "@/Components/InnoCBS/cbsOps";
import { Status, isPending, itemsOf } from "@/Components/InnoCBS/OpsList";
import { calls } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { T } from "./treasuryShared";
import { PageTitle } from "@/Components/Common/PageTitle";

export const rateApi = calls(`${T}/rate`, ["list", "add"]);

export const entryApi = calls(`${T}/entry`, ["list", "add"]);

export const transferApi = calls(`${T}/transfer`, ["list", "add", "auth", "deauth"]);

export const reconApi = calls(`${T}/reconciliation`, ["match", "run", "status"]);

export const statementApi = calls(`${T}/statement`, ["import", "lines"]);

export const tradeApi = calls(`${T}/trade`, ["list", "add", "auth", "deauth"]);

export const holdingApi = calls(`${T}/holding`, ["list"]);

export const priceApi = calls(`${T}/price`, ["list", "add"]);

export const valuationApi = calls(`${T}/valuation`, ["history", "run"]);

export const drawdownApi = calls(`${T}/drawdown`, ["list", "add", "auth", "deauth", "prepay"]);

export const forexApi = calls(`${T}/forex_deal`, ["list", "add", "auth", "deauth"]);

export const fxApi = calls(`${T}/fx`, ["position", "revalue"]);

export const marginApi = calls(`${T}/margin_call`, ["list", "settle"]);

export const exposureApi = calls(`${T}/exposure`, ["monitor"]);

export const reserveApi = calls(`${T}/reserve`, ["calculate", "history"]);

export const almApi = calls(`${T}/alm`, ["concentration", "forecast", "gap", "liquidity", "stress"]);

export const eventApi = calls(`${T}/event`, ["list", "settle"]);

export const accrualApi = calls(`${T}/accrual`, ["run"]);

export const dashboardApi = calls(T, ["dashboard"]);

export const alertApi = calls(`${T}/alert`, ["list", "acknowledge", "run"]);

export const reportApi = calls(`${T}/report`, ["catalogue", "run"]);

// A list reply that is one object (not yet an array) as rows.
export const rowsOrOne = (r) => (Array.isArray(r?.data) ? r.data : r?.data && typeof r.data === "object" ? (Array.isArray(r.data.items) ? r.data.items : [r.data]) : []);

export const listOf = (call) => ({ listPath: "", list: call });

export const n = (r, k) => Number(r[k]);

export const warnCell = (v, bad) => <span className={`text-xs ${bad ? "font-bold text-red-700" : ""}`}>{v === "" || v == null ? "—" : v}</span>;

export const pageHead = (L, title, sub) => (
  <>
    <PageTitle>{L(title)}</PageTitle>
    <p className="mt-1 mb-3 text-sm text-muted-foreground">{L(sub)}</p>
  </>
);

export const approveReject = (L, api) => (r) => [
  { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, call: api.auth, body: { id: Number(r.id) } },
  { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: api.deauth, body: { id: Number(r.id) } },
];

export function ReconStatus({ accountId, version }) {
  const L = useL();
  const [s, setS] = useState(null);
  useEffect(() => {
    if (!accountId) return;
    reconApi
      .status({ account_id: Number(accountId) })
      .then((r) => setS(first(r)))
      .catch(() => {});
  }, [accountId, version]);
  if (!s) return null;
  return <Facts className="mb-3" rows={[[L("matched"), s.matched], [L("unmatched_statement_lines"), s.unmatched_statement_lines, s.unmatched_statement_lines ? "text-amber-700" : undefined], [L("unmatched_book_entries"), s.unmatched_book_entries, s.unmatched_book_entries ? "text-amber-700" : undefined], [L("book_balance"), s.book_balance], [L("statement_balance"), s.statement_balance || "—"], [L("difference"), s.difference || "—", Number(s.difference) ? "text-red-700" : undefined]]} />;
}

// Unmatched book entries of the account with the line's amount (or near it).
export function EntryFinder({ line, accountId, value, onChange }) {
  const L = useL();
  const [exact, setExact] = useState(true);
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const amt = Math.abs(Number(line.amount));
    entryApi
      .list({ page: 1, limit: 25, filters: { account_id: Number(accountId), unmatched: true, ...(exact ? { amount: line.amount } : {}) }, ...(exact ? {} : { amount_min: String(amt * 0.9), amount_max: String(amt * 1.1) }) })
      .then((r) => setRows(itemsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [line, accountId, exact]);
  return (
    <div className="mb-3">
      <label className="mb-2 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} /> {L("Exact amount only")}
      </label>
      <RowsTable
        rows={rows ?? []}
        empty={L("No unmatched entries found.")}
        columns={[
          { key: "pick", label: "", render: (e) => <input type="radio" name="entry" aria-label={String(e.id)} checked={String(value) === String(e.id)} onChange={() => onChange(String(e.id))} /> },
          { key: "entry_date", label: L("entry_date"), render: (e) => dateCell(e.entry_date) },
          { key: "entry_type", label: L("entry_type"), render: (e) => words(e.entry_type) },
          { key: "amount", label: L("amount"), numeric: true },
          { key: "reference", label: L("reference") },
          { key: "narration", label: L("narration") },
        ]}
      />
    </div>
  );
}

// ---------- Investments ----------

export const TRADE_TYPES = ["BUY", "SELL", "RIGHTS", "BONUS", "SPLIT", "BUYBACK", "MERGER", "DEMERGER", "PLEDGE", "UNPLEDGE", "TRANSFER", "DIVIDEND"];

// ---------- Risk & liquidity ----------

export const utilTone = (s) => (["BREACH", "EXCEEDED", "BLOCKED"].includes(s) ? "text-red-700 font-bold" : s === "WARN" || s === "WARNING" ? "text-amber-700 font-bold" : "");

// ---------- Schedule and alerts ----------

export function TreasuryDashboard() {
  const L = useL();
  const [d, setD] = useState(null);
  useEffect(() => {
    dashboardApi
      .dashboard({})
      .then((r) => setD(first(r)))
      .catch(() => {});
  }, []);
  if (!d) return null;
  const t = d.totals ?? {};
  const a = d.alerts ?? {};
  return (
    <Section title={`${L("Overview")} · ${d.as_of} · ${d.base_currency}`} className="mb-4">
      <Facts
        className="mb-3"
        rows={[
          [L("total_investments"), t.total_investments],
          [L("placements"), t.placements],
          [L("securities"), t.securities],
          [L("interbank_balances"), t.interbank_balances],
          [L("total_borrowings"), t.total_borrowings],
          [L("contingent_liabilities"), t.contingent_liabilities],
          [L("interest_receivable"), t.interest_receivable],
          [L("projected_surplus"), d.liquidity?.projected_surplus],
          [L("Open alerts"), `${a.open ?? 0} (${a.critical ?? 0} ${L("critical")})`, a.critical ? "text-red-700" : undefined],
          [L("overdue_events"), a.overdue_events, a.overdue_events ? "text-red-700" : undefined],
          [L("accounts_below_minimum"), a.accounts_below_minimum, a.accounts_below_minimum ? "text-red-700" : undefined],
        ]}
      />
      {(d.reserves ?? []).length > 0 && <RowsTable rows={d.reserves} columns={[{ key: "requirement", label: L("requirement") }, { key: "date", label: L("date") }, { key: "required", label: L("required"), numeric: true }, { key: "eligible", label: L("eligible"), numeric: true }, { key: "shortfall", label: L("shortfall"), render: (x) => warnCell(x.shortfall, Number(x.shortfall) > 0) }, { key: "status", label: L("status"), render: (x) => <Status code={x.status} /> }]} />}
      {(d.limit_alerts ?? []).length > 0 && (
        <div className="mt-3">
          <RowsTable rows={d.limit_alerts} columns={Object.keys(d.limit_alerts[0]).map((k) => ({ key: k, label: L(k) }))} />
        </div>
      )}
    </Section>
  );
}

import { API_ENDPOINTS } from "@/Utils/Constant";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Ban, Banknote, Calculator, CheckCircle2, HandCoins, Play, RotateCcw, UserMinus, UserPlus, Wallet, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ActionButtons, Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { AcctPick, EventsTable, OpDialog, ownerOf, PartyPick, RowsTable, dateCell, first, pct, splitParty, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// InnoCBS > Deposits: the deposit operations (Admin 20).
export const D = API_ENDPOINTS.CBS_MODULES.DEPOSIT;

export const rdApi = calls(`${D}/rd`, ["list", "get", "options", "quote", "add", "auth", "deauth", "collect", "preclose", "revive", "service", "settle_quote", "waiver_add", "waiver_auth", "waiver_deauth"]);

export const noticeApi = calls(`${D}/notice`, ["list", "add", "cancel", "withdraw"]);

export const groupApi = calls(`${D}/group`, ["list", "get", "options", "add", "auth", "deauth", "contribute", "dissolve", "member_add", "member_approval", "member_remove", "service", "withdraw", "withdraw_auth"]);

export const profitApi = calls(`${D}/profit_distribution`, ["list", "get", "preview", "calculate", "approve", "reject"]);

export const reportApi = calls(`${D}/report`, ["catalogue", "run"]);

export const today = () => new Date().toISOString().slice(0, 10);

export const Status = ({ code }) => <StatusBadge status={code} label={words(code)} variant="subtle" />;

export const header = (L, title, sub) => (
  <>
    <PageTitle>{L(title)}</PageTitle>
    <p className="mt-1 mb-4 text-sm text-muted-foreground">{L(sub)}</p>
  </>
);

// One record of an operation screen: get, actions, reload.
export function useOne(api, id) {
  const [r, setR] = useState(null);
  const reload = useCallback(
    () =>
      api
        .get({ id })
        .then((x) => setR(first(x)))
        .catch((e) => notifications.error(e.message)),
    [api, id],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return [r, reload];
}

export const act = (call, body, after) =>
  call(body)
    .then((x) => {
      notifications.success(x?.message ?? "OK");
      after?.(x);
    })
    .catch((e) => notifications.error(e.message));

// ---------- Recurring deposits ----------

export function RdOpen({ onClose, onDone }) {
  const L = useL();
  const [choices, setChoices] = useState(null);
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    rdApi
      .options({})
      .then((r) => setChoices(first(r) ?? {}))
      .catch(() => setChoices({}));
  }, []);
  const body = (x) => ({ ...splitParty(x.party), product_code: x.product_code, instalment_amount: x.instalment_amount, tenure_months: Number(x.tenure_months), funding_acct_id: Number(x.funding_acct_id) });
  const product = (code) => (choices?.products ?? []).find((p) => p.code === code);
  return (
    <OpDialog
      size="lg"
      title={L("Open a recurring deposit")}
      hint={L("A checker approves the opening.")}
      choices={choices}
      fields={[
        { key: "party", label: L("Customer"), type: "party", required: true },
        { key: "product_code", label: L("product"), type: "select", required: true, options: (c) => (c.products ?? []).map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` })) },
        { key: "instalment_amount", label: L("instalment_amount"), type: "amount", required: true },
        { key: "tenure_months", label: L("tenure_months"), type: "int", required: true },
        { key: "funding_acct_id", label: L("Funding account"), type: "acct", required: true, owner: (x) => ownerOf(x.party) },
        { key: "narration", label: L("narration"), wide: true },
      ]}
      confirmLabel={L("Submit for approval")}
      run={(x) => rdApi.add({ ...body(x), narration: x.narration })}
      onClose={onClose}
      onDone={onDone}
    >
      {(form) => {
        const p = product(form.product_code);
        const ready = form.party && form.product_code && form.instalment_amount && form.tenure_months && form.funding_acct_id;
        return (
          <div className="mb-3">
            {p && <p className="mb-2 text-xs text-muted-foreground">{[`${words(p.frequency)}`, `${p.min_instalment}–${p.max_instalment || "∞"}`, `${p.min_tenure_months}–${p.max_tenure_months} ${L("months")}`, pct(p.annual_rate)].join(" · ")}</p>}
            <Button
              size="sm"
              variant="secondary"
              icon={Calculator}
              disabled={!ready}
              disabledReason={L("Fill the customer, product, instalment, tenure and funding account.")}
              onClick={() =>
                rdApi
                  .quote(body(form))
                  .then((r) => setQuote(first(r)))
                  .catch((e) => notifications.error(e.message))
              }
            >
              {L("Quote")}
            </Button>
            {quote && (
              <Facts
                className="mt-3"
                rows={[
                  [L("instalments"), `${quote.instalments} × ${quote.instalment_amount}`],
                  [L("annual_rate"), `${pct(quote.annual_rate)} · ${words(quote.rate_source)}`],
                  [L("total_deposited"), quote.total_deposited],
                  [L("total_interest"), quote.total_interest],
                  [L("maturity_value"), quote.maturity_value],
                  [L("maturity_date"), dateCell(quote.maturity_date)],
                ]}
              />
            )}
          </div>
        );
      }}
    </OpDialog>
  );
}

export function RdView({ id, onBack }) {
  const L = useL();
  const can = usePagePermission();
  const [r, reload] = useOne(rdApi, id);
  const [dialog, setDialog] = useState(null);
  const [settle, setSettle] = useState(null);
  const [tab, setTab] = useState("schedule");
  if (!r) return <PageSkeleton />;
  const a = r.actions ?? {};
  const close = () => setDialog(null);
  const done = () => {
    close();
    void reload();
  };
  const quote = (kind) =>
    rdApi
      .settle_quote({ id, kind })
      .then((x) => setSettle({ kind, ...first(x) }))
      .catch((e) => notifications.error(e.message));
  const buttons = [
    a.collect && can("Edit") && { key: "collect", label: L("Collect"), icon: Banknote, variant: "primary", run: () => setDialog("collect") },
    a.waive && can("Edit") && { key: "waive", label: L("Waive a penalty"), icon: HandCoins, run: () => setDialog("waive") },
    a.revive && can("Edit") && { key: "revive", label: L("Revive"), icon: RotateCcw, run: () => act(rdApi.revive, { id }, reload) },
    a.preclose && can("Edit") && { key: "preclose", label: L("Pre-close"), icon: Ban, variant: "danger", run: () => quote("PRECLOSURE") },
    can("Authorize") && { key: "service", label: L("Service now"), icon: Play, run: () => setDialog("service") },
    a.deauth && can("Authorize") && { key: "deauth", label: L("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: L("approve"), icon: CheckCircle2, variant: "primary", run: () => act(rdApi.auth, { id }, reload) },
  ];
  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {L("Back to recurring deposits")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{r.reference_no}</h1>
              <Status code={r.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[r.owner_name, r.deposit_number, r.product_code, r.inst_profile_name].filter(Boolean).join(" · ")}</p>
          </div>
          <ActionButtons buttons={buttons} />
        </div>
        <Facts
          className="mt-3"
          rows={[
            [L("instalment_amount"), `${r.instalment_amount} ${r.currency} · ${words(r.frequency)}`],
            [L("paid"), `${r.paid_instalments} / ${r.total_instalments}`],
            [L("missed_instalments"), r.missed_instalments],
            [L("principal_paid"), r.principal_paid],
            [L("penalty_outstanding"), r.penalty_outstanding],
            [L("annual_rate"), pct(r.annual_rate)],
            [L("start_date"), dateCell(r.start_date)],
            [L("maturity_date"), dateCell(r.maturity_date)],
          ]}
        />
      </div>
      {settle && (
        <Section title={L(settle.kind === "PRECLOSURE" ? "Pre-closure quote" : "Maturity quote")} className="mb-4">
          <Facts rows={Object.entries(settle).filter(([k, v]) => k !== "kind" && (typeof v !== "object" || v === null)).map(([k, v]) => [L(k), String(v ?? "—")])} />
          {(settle.instalments ?? []).length > 0 && (
            <div className="mt-3">
              <RowsTable
                rows={settle.instalments}
                columns={[
                  { key: "instalment_number", label: "#" },
                  { key: "paid_on", label: L("paid_on"), render: (x) => dateCell(x.paid_on) },
                  { key: "amount", label: L("amount"), numeric: true },
                  { key: "rate", label: L("rate"), render: (x) => pct(x.rate) },
                  { key: "interest", label: L("interest"), numeric: true },
                  { key: "delayed", label: L("delayed"), render: (x) => (x.delayed ? "✓" : "—") },
                ]}
              />
            </div>
          )}
          {(settle.notes ?? []).map((n) => (
            <p key={n} className="mt-2 text-xs text-muted-foreground">
              {n}
            </p>
          ))}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSettle(null)}>
              {L("Close")}
            </Button>
            {settle.kind === "PRECLOSURE" && (
              <Button size="sm" variant="danger" icon={Ban} onClick={() => act(rdApi.preclose, { id }, () => (setSettle(null), reload()))}>
                {L("Pre-close now")}
              </Button>
            )}
          </div>
        </Section>
      )}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={["schedule", "collections", "waivers", "events", "terms"].map((v) => ({ value: v, label: L(v) }))} />
      <Section title={L(tab)}>
        {tab === "schedule" && (
          <RowsTable
            rows={r.schedule}
            columns={[
              { key: "instalment_number", label: "#" },
              { key: "due_date", label: L("due_date"), render: (x) => dateCell(x.due_date) },
              { key: "due_amount", label: L("due_amount"), numeric: true },
              { key: "paid_amount", label: L("paid_amount"), numeric: true },
              { key: "payment_date", label: L("payment_date"), render: (x) => dateCell(x.payment_date) },
              { key: "overdue_days", label: L("overdue_days") },
              { key: "penalty", label: L("penalty"), render: (x) => `${x.penalty_amount} (${L("paid")} ${x.penalty_paid}, ${L("waived")} ${x.penalty_waived})` },
              { key: "status", label: L("status"), render: (x) => <Status code={x.status} /> },
            ]}
          />
        )}
        {tab === "collections" && (
          <RowsTable
            rows={r.collections}
            columns={[
              { key: "at", label: L("when"), render: (x) => dateCell(x.at) },
              { key: "amount", label: L("amount"), numeric: true },
              { key: "instalments", label: L("instalments"), numeric: true },
              { key: "penalties", label: L("penalties"), numeric: true },
              { key: "source", label: L("source"), render: (x) => words(x.source) },
              { key: "rrn", label: "RRN" },
              { key: "actor", label: L("by") },
            ]}
          />
        )}
        {tab === "waivers" && (
          <RowsTable
            rows={r.waivers}
            columns={[
              { key: "instalment_number", label: "#" },
              { key: "original_amount", label: L("original_amount"), numeric: true },
              { key: "waived_amount", label: L("waived_amount"), numeric: true },
              { key: "reason", label: L("reason") },
              { key: "requested_by", label: L("requested_by") },
              { key: "decided_by", label: L("decided_by"), render: (x) => [x.decided_by, x.decision_note].filter(Boolean).join(" · ") || "—" },
              { key: "status", label: L("status"), render: (x) => <Status code={x.status} /> },
              {
                key: "actions",
                label: "",
                render: (w) =>
                  (w.actions?.waiver_auth || w.actions?.waiver_deauth) && (
                    <span className="flex gap-1">
                      <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => act(rdApi.waiver_auth, { waiver_id: w.waiver_id, narration: "" }, reload)}>
                        {L("approve")}
                      </Button>
                      <Button size="sm" variant="ghost" icon={XCircle} onClick={() => setDialog({ waiver: w.waiver_id })}>
                        {L("reject")}
                      </Button>
                    </span>
                  ),
              },
            ]}
          />
        )}
        {tab === "events" && <EventsTable rows={r.events} />}
        {tab === "terms" && <Facts rows={Object.entries(r.terms ?? {}).map(([k, v]) => [L(k), Array.isArray(v) ? v.map(words).join(", ") : typeof v === "boolean" ? (v ? "✓" : "—") : String(v || "—")])} />}
      </Section>
      {dialog === "collect" && <OpDialog title={L("Collect")} hint={L("Collects instalments and penalties from the funding account.")} fields={[{ key: "amount", label: L("amount"), type: "amount", required: true }]} initial={{ amount: String(r.instalment_amount ?? "") }} run={(x) => rdApi.collect({ id, amount: x.amount })} onClose={close} onDone={done} />}
      {dialog === "waive" && (
        <OpDialog
          title={L("Waive a penalty")}
          hint={L("A checker approves the waiver.")}
          fields={[
            { key: "instalment_number", label: L("instalment_number"), type: "select", required: true, options: (r.schedule ?? []).filter((x) => Number(x.penalty_amount) > Number(x.penalty_paid) + Number(x.penalty_waived)).map((x) => ({ value: String(x.instalment_number), label: `#${x.instalment_number} · ${x.penalty_amount}` })) },
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "reason", label: L("reason"), type: "textarea", required: true },
          ]}
          run={(x) => rdApi.waiver_add({ id, instalment_number: Number(x.instalment_number), amount: x.amount, reason: x.reason })}
          onClose={close}
          onDone={done}
        />
      )}
      {dialog === "service" && <OpDialog title={L("Service now")} hint={L("Marks missed instalments, penalties and suspension. The daily job does this too.")} fields={[{ key: "as_of", label: L("as_of"), type: "date", required: true }]} initial={{ as_of: today() }} run={(x) => rdApi.service({ id, as_of: x.as_of })} onClose={close} onDone={done} />}
      {dialog === "deauth" && <OpDialog title={L("reject")} variant="danger" fields={[{ key: "narration", label: L("narration"), type: "textarea", required: true }]} run={(x) => rdApi.deauth({ id, narration: x.narration })} onClose={close} onDone={done} />}
      {dialog?.waiver && <OpDialog title={L("Reject the waiver")} variant="danger" fields={[{ key: "narration", label: L("narration"), type: "textarea", required: true }]} run={(x) => rdApi.waiver_deauth({ waiver_id: dialog.waiver, narration: x.narration })} onClose={close} onDone={done} />}
    </div>
  );
}

// ---------- Savings groups ----------

export function Members({ value, onChange, roles }) {
  const L = useL();
  const rows = value ?? [];
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="mt-1 grid gap-2">
      {rows.map((m, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-border p-2 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <PartyPick value={m.party} onChange={(v) => set(i, { party: v })} />
          </div>
          <AcctPick value={m.wallet_acct_id} owner={ownerOf(m.party)} onChange={(v) => set(i, { wallet_acct_id: v })} />
          <div className="flex gap-1">
            <Field field={{ type: "select", options: roles }} value={m.role} onChange={(v) => set(i, { role: v })} />
            <Button size="sm" variant="ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              ✕
            </Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="secondary" className="justify-self-start" icon={UserPlus} onClick={() => onChange([...rows, { party: "", wallet_acct_id: "", role: "MEMBER" }])}>
        {L("Add member")}
      </Button>
    </div>
  );
}

export const memberBody = (m) => ({ ...splitParty(m.party), wallet_acct_id: Number(m.wallet_acct_id), role: m.role });

export function GroupView({ id, onBack }) {
  const L = useL();
  const can = usePagePermission();
  const [g, reload] = useOne(groupApi, id);
  const [roles, setRoles] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [tab, setTab] = useState("members");
  useEffect(() => {
    groupApi
      .options({})
      .then((r) => setRoles((first(r)?.roles ?? []).map((x) => ({ value: x, label: words(x) }))))
      .catch(() => {});
  }, []);
  if (!g) return <PageSkeleton />;
  const a = g.actions ?? {};
  const close = () => setDialog(null);
  const done = () => (close(), reload());
  const members = (g.members_list ?? []).filter((m) => m.status !== "EXITED");
  const memberOpts = members.map((m) => ({ value: String(m.member_id), label: `${m.name} · ${words(m.role)}` }));
  const buttons = [
    a.contribute && can("Edit") && { key: "contribute", label: L("Contribution"), icon: Banknote, variant: "primary", run: () => setDialog("contribute") },
    a.member_add && { key: "member_add", label: L("Add member"), icon: UserPlus, run: () => setDialog("member_add") },
    a.withdraw && { key: "withdraw", label: L("Withdraw"), icon: Wallet, run: () => setDialog("withdraw") },
    a.service && { key: "service", label: L("Service now"), icon: Play, run: () => act(groupApi.service, { id }, reload) },
    a.dissolve && can("Authorize") && { key: "dissolve", label: L("Dissolve"), icon: Ban, variant: "danger", run: () => setDialog("dissolve") },
    a.deauth && can("Authorize") && { key: "deauth", label: L("reject"), icon: XCircle, variant: "danger", run: () => act(groupApi.deauth, { id }, reload) },
    a.auth && can("Authorize") && { key: "auth", label: L("approve"), icon: CheckCircle2, variant: "primary", run: () => act(groupApi.auth, { id }, reload) },
  ];
  const nameOf = (mid) => (g.members_list ?? []).find((m) => m.member_id === mid)?.name ?? `#${mid}`;
  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {L("Back to savings groups")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{g.group_name}</h1>
              <Status code={g.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[g.group_code, g.scheme_code, g.group_acct_num, g.inst_profile_name].filter(Boolean).join(" · ")}</p>
          </div>
          <ActionButtons buttons={buttons} />
        </div>
        <Facts
          className="mt-3"
          rows={[
            [L("group_balance"), `${g.group_balance} ${g.currency}`],
            [L("total_contributed"), g.total_contributed],
            [L("members"), g.members],
            [L("members_in_arrears"), g.members_in_arrears],
            [L("start_date"), dateCell(g.start_date)],
            [L("next_due_date"), dateCell(g.next_due_date)],
          ]}
        />
      </div>
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={["members", "dues", "withdrawals", "events"].map((v) => ({ value: v, label: L(v) }))} />
      <Section title={L(tab)}>
        {tab === "members" && (
          <RowsTable
            rows={g.members_list}
            columns={[
              { key: "name", label: L("name") },
              { key: "role", label: L("role"), render: (m) => words(m.role) },
              { key: "contribution_amount", label: L("contribution_amount"), numeric: true },
              { key: "total_contributed", label: L("total_contributed"), numeric: true },
              { key: "arrears", label: L("arrears"), render: (m) => (m.arrears_count ? `${m.arrears_count} · ${m.arrears_amount}` : "—") },
              { key: "joining_date", label: L("joining_date"), render: (m) => dateCell(m.joining_date) },
              { key: "status", label: L("status"), render: (m) => <Status code={m.status} /> },
              { key: "x", label: "", render: (m) => m.status === "ACTIVE" && a.member_remove && <Button size="sm" variant="ghost" icon={UserMinus} onClick={() => setDialog({ remove: m.member_id })}>{L("remove")}</Button> },
            ]}
          />
        )}
        {tab === "dues" && (
          <RowsTable
            rows={g.dues}
            columns={[
              { key: "member_id", label: L("member"), render: (d) => nameOf(d.member_id) },
              { key: "due_date", label: L("due_date"), render: (d) => dateCell(d.due_date) },
              { key: "due_amount", label: L("due_amount"), numeric: true },
              { key: "paid_amount", label: L("paid_amount"), numeric: true },
              { key: "penalty", label: L("penalty"), render: (d) => `${d.penalty_amount} (${L("paid")} ${d.penalty_paid})` },
              { key: "status", label: L("status"), render: (d) => <Status code={d.status} /> },
            ]}
          />
        )}
        {tab === "withdrawals" && (
          <RowsTable
            rows={g.withdrawals}
            columns={[
              { key: "requested_at", label: L("when"), render: (w) => dateCell(w.requested_at) },
              { key: "amount", label: L("amount"), numeric: true },
              { key: "to_acct_num", label: L("To account") },
              { key: "purpose", label: L("purpose") },
              { key: "approvals", label: L("Member approvals"), render: (w) => `${w.approvals}/${w.approvals_needed}${(w.member_approvals ?? []).length ? ` · ${w.member_approvals.map((x) => `${x.name} (${words(x.role)})`).join(", ")}` : ""}` },
              { key: "rrn", label: "RRN" },
              { key: "status", label: L("status"), render: (w) => <Status code={w.status} /> },
              {
                key: "x",
                label: "",
                render: (w) =>
                  (w.actions?.member_approval || w.actions?.withdraw_auth) && (
                    <span className="flex gap-1">
                      {w.actions?.member_approval && <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => setDialog({ approve: w.withdrawal_id })}>{L("Member approves")}</Button>}
                      {w.actions?.withdraw_auth && <Button size="sm" variant="ghost" icon={Wallet} onClick={() => act(groupApi.withdraw_auth, { withdrawal_id: w.withdrawal_id }, reload)}>{L("Pay")}</Button>}
                    </span>
                  ),
              },
            ]}
          />
        )}
        {tab === "events" && <EventsTable rows={g.events} />}
      </Section>
      {dialog === "contribute" && (
        <OpDialog
          title={L("Contribution")}
          hint={L("From the member's wallet: dues first, then late charges.")}
          fields={[
            { key: "member_id", label: L("member"), type: "select", required: true, options: memberOpts },
            { key: "amount", label: L("amount"), type: "amount", required: true },
          ]}
          run={(x) => groupApi.contribute({ id, member_id: Number(x.member_id), amount: x.amount })}
          onClose={close}
          onDone={done}
        />
      )}
      {dialog === "member_add" && (
        <OpDialog
          title={L("Add member")}
          fields={[
            { key: "party", label: L("Customer"), type: "party", required: true },
            { key: "wallet_acct_id", label: L("Wallet account"), type: "acct", required: true, owner: (x) => ownerOf(x.party) },
            { key: "role", label: L("role"), type: "select", required: true, options: roles },
          ]}
          initial={{ role: "MEMBER" }}
          run={(x) => groupApi.member_add({ id, member: memberBody(x) })}
          onClose={close}
          onDone={done}
        />
      )}
      {dialog?.remove && <OpDialog title={L("Remove member")} variant="danger" fields={[{ key: "reason", label: L("reason"), type: "textarea", required: true }]} run={(x) => groupApi.member_remove({ id, member_id: dialog.remove, reason: x.reason })} onClose={close} onDone={done} />}
      {dialog?.approve && <OpDialog title={L("Member approves")} hint={L("The scheme's withdrawal rule says which members must approve.")} fields={[{ key: "member_id", label: L("member"), type: "select", required: true, options: memberOpts }]} run={(x) => groupApi.member_approval({ withdrawal_id: dialog.approve, member_id: Number(x.member_id) })} onClose={close} onDone={done} />}
      {dialog === "withdraw" && (
        <OpDialog
          title={L("Withdraw")}
          hint={L("Needs the approvals of the scheme's withdrawal rule, then a checker pays it.")}
          fields={[
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "to_acct_id", label: L("To account"), type: "acct", required: true },
            { key: "purpose", label: L("purpose"), required: true, wide: true },
          ]}
          run={(x) => groupApi.withdraw({ id, amount: x.amount, to_acct_id: Number(x.to_acct_id), purpose: x.purpose })}
          onClose={close}
          onDone={done}
        />
      )}
      {dialog === "dissolve" && <OpDialog title={L("Dissolve")} variant="danger" fields={[{ key: "reason", label: L("reason"), type: "textarea", required: true }]} run={(x) => groupApi.dissolve({ id, reason: x.reason })} onClose={close} onDone={done} />}
    </div>
  );
}

// ---------- Profit distribution ----------

export function DistributionFacts({ d }) {
  const L = useL();
  return (
    <>
      <Facts
        className="mb-3"
        rows={[
          [L("product"), `${d.product_code} · ${words(d.contract_type)}`],
          [L("period"), `${d.period_from} → ${d.period_to}`],
          [L("pool_result"), d.pool_result],
          [L("distributable_to_depositors"), d.distributable_to_depositors],
          [L("mudarib_share"), d.mudarib_share],
          [L("agency_fee"), d.agency_fee],
          [L("expected_profit_total"), d.expected_profit_total],
          d.status && [L("status"), words(d.status)],
        ]}
      />
      {(d.notes ?? []).map((n) => (
        <p key={n} className="mb-2 text-xs text-muted-foreground">{n}</p>
      ))}
      <RowsTable
        rows={d.allocations}
        empty={L("No accounts share in this pool for the period.")}
        columns={[
          { key: "acct_num", label: L("account") },
          { key: "average_balance", label: L("average_balance"), numeric: true },
          { key: "weight", label: L("weight"), numeric: true },
          { key: "weighted_balance", label: L("weighted_balance"), numeric: true },
          { key: "share_percent", label: L("share"), render: (x) => pct(x.share_percent) },
          { key: "expected_profit", label: L("expected_profit"), numeric: true },
          { key: "actual_profit", label: L("actual_profit"), render: (x) => <span className={Number(x.actual_profit) < 0 ? "font-bold text-red-700" : ""}>{x.actual_profit}</span> },
        ]}
      />
    </>
  );
}

// A catalogue of reports (code, group, columns) and running one.
export function CatalogueReports({ api, title, sub }) {
  const L = useL();
  const can = usePagePermission();
  const [catalogue, setCatalogue] = useState(null);
  const [code, setCode] = useState("");
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(today());
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .catalogue({})
      .then((r) => setCatalogue(first(r)?.items ?? rowsOf(r)))
      .catch((e) => (notifications.error(e.message), setCatalogue([])));
  }, [api]);
  if (!can("View")) return <NoAccess />;
  const report = (catalogue ?? []).find((x) => x.code === code);
  const groups = [...new Set((catalogue ?? []).map((x) => x.group))];
  const run = async () => {
    setBusy(true);
    try {
      setResult(first(await api.run({ report: code, ...(report?.uses_period ? { from, to } : { to }) })));
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const cols = result?.report?.columns ?? [];
  return (
    <div className="pt-1 pb-6">
      {header(L, title, sub)}
      <Section title={L("Report")} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`${labelClass} sm:col-span-2`}>
            {L("report")}
            <Field field={{ type: "select", blank: L("choose"), options: groups.flatMap((g) => (catalogue ?? []).filter((x) => x.group === g).map((x) => ({ value: x.code, label: `${g} · ${x.name}` }))) }} value={code} onChange={(v) => (setCode(v), setResult(null))} />
          </label>
          {report?.uses_period && (
            <label className={labelClass}>
              {L("from")}
              <Field field={{ type: "date" }} value={from} onChange={setFrom} />
            </label>
          )}
          <label className={labelClass}>
            {L(report?.uses_period ? "to" : "as_of")}
            <Field field={{ type: "date" }} value={to} onChange={setTo} />
          </label>
        </div>
        {report && <p className="mt-2 text-xs text-muted-foreground">{report.description}</p>}
        <Button className="mt-3" icon={Play} loading={busy} disabled={!code} disabledReason={L("Pick a report.")} onClick={run}>
          {L("Run")}
        </Button>
      </Section>
      {result && (
        <Section title={`${result.report?.name} · ${result.count ?? (result.rows ?? []).length}`}>
          {result.limited && <p className="mb-2 text-xs font-semibold text-amber-800">{L("Only the first rows are shown; narrow the period.")}</p>}
          <RowsTable
            rows={[...(result.rows ?? []), ...(result.totals && Object.keys(result.totals).length ? [{ ...result.totals, __total: true }] : [])]}
            empty={L("No rows for this report.")}
            columns={cols.map((c, i) => ({ key: c.key, label: c.label, numeric: c.numeric, render: (r) => (r.__total ? (i === 0 ? <b>{L("Total")}</b> : <b>{r[c.key] ?? ""}</b>) : (r[c.key] ?? "—")) }))}
          />
        </Section>
      )}
    </div>
  );
}

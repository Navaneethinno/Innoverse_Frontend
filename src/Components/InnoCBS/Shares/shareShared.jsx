import { API_ENDPOINTS } from "@/Utils/Constant";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calculator, CheckCircle2, Plus, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { OpDialog, RowsTable, cell, codes, dateCell, first, pct, splitParty, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// InnoCBS > Share Capital (Admin 22).
export const SH = API_ENDPOINTS.CBS_MODULES.SHARE;

export const categoryApi = recordApi(`${SH}/category`);

export const requirementRuleApi = recordApi(`${SH}/requirement_rule`);

export const requirementApi = calls(`${SH}/requirement`, ["calculate"]);

export const memberApi = calls(`${SH}/member`, ["list", "get", "add", "options"]);

export const purchaseApi = calls(`${SH}/purchase`, ["list", "add", "auth", "deauth"]);

export const holdingApi = calls(`${SH}/holding`, ["list"]);

export const lienApi = calls(`${SH}/lien`, ["list", "add", "release"]);

export const certificateApi = calls(`${SH}/certificate`, ["list", "get", "reissue"]);

export const transferApi = calls(`${SH}/transfer`, ["list", "add", "auth", "deauth"]);

export const redemptionApi = calls(`${SH}/redemption`, ["list", "add", "auth", "deauth", "check"]);

export const distributionApi = calls(`${SH}/distribution`, ["list", "get", "add", "auth", "deauth", "preview"]);

export const shareReportApi = calls(`${SH}/report`, ["catalogue", "run"]);

export const useF = () => {
  const L = useL();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};

export const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? 0 : Number(x[k])])) });

export const Status = ({ code }) => <StatusBadge status={code} label={words(code)} variant="subtle" />;

export const header = (L, title, sub) => (
  <>
    <PageTitle>{L(title)}</PageTitle>
    <p className="mt-1 mb-4 text-sm text-muted-foreground">{L(sub)}</p>
  </>
);

export const act = (call, body, after) =>
  call(body)
    .then((x) => {
      notifications.success(x?.message ?? "OK");
      after?.(x);
    })
    .catch((e) => notifications.error(e.message));

export const memberCell = (r) => (
  <span className="text-xs">
    <b>{r.name || r.member_number}</b>
    <span className="block font-mono text-[10px] text-muted-foreground">{r.member_number}</span>
  </span>
);

// Share categories for a select (active records).
export const shareOptionsApi = calls(SH, ["options"]);

export function useShareOptions(memberId) {
  const [o, setO] = useState({});
  const { scope, institution } = useInstitutionScope();
  useEffect(() => {
    shareOptionsApi
      .options(memberId ? { member_id: Number(memberId) } : scope({}))
      .then((r) => setO(first(r) ?? {}))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, institution]);
  return o;
}

export function useCategories() {
  const o = useShareOptions();
  return (o.share_categories ?? []).map((c) => ({ value: c.code, label: `${c.code} · ${c.name}`, row: c }));
}

// A member, searched by number or name.
export function MemberPick({ value, onChange, placeholder }) {
  const L = useL();
  const [found, setFound] = useState([]);
  const latest = useRef(0);
  const search = (text) => {
    if (!text) return;
    const ticket = ++latest.current;
    memberApi
      .list({ search: text, page: 1, page_size: 20 })
      .then((r) => ticket === latest.current && setFound(rowsOf(r).map((m) => ({ value: String(m.id), label: [m.member_number, m.name, m.shares && `${m.shares} ${L("shares")}`].filter(Boolean).join(" · ") }))))
      .catch((e) => notifications.error(e.message));
  };
  return <FilterSelect className="mt-1" value={value ?? ""} onChange={(v) => onChange(String(v ?? ""))} onSearch={search} options={[{ value: "", label: placeholder ?? L("Type a member number or name") }, ...found]} />;
}

export const MemberField = ({ L, form, setForm, k = "member_id", label = "Member" }) => (
  <div className={`${labelClass} mb-3`}>
    {L(label)}
    <MemberPick value={form[k]} onChange={(v) => setForm((x) => ({ ...x, [k]: v }))} />
  </div>
);

// Check a customer against the requirement of a product.
export function RequirementCheck() {
  const L = useL();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [choices, setChoices] = useState({});
  useEffect(() => {
    requirementRuleApi
      .options({})
      .then((r) => setChoices(first(r) ?? {}))
      .catch(() => {});
  }, []);
  return (
    <>
      <Button size="sm" variant="secondary" icon={Calculator} onClick={() => setOpen(true)}>
        {L("Check a customer")}
      </Button>
      {open && (
        <OpDialog
          size="lg"
          title={L("Check a customer")}
          hint={L("The shares a customer must hold for a product, what they hold, and what they must buy.")}
          confirmLabel={L("Check")}
          choices={choices}
          fields={[
            { key: "module", label: L("module"), type: "select", required: true, options: codes("modules") },
            { key: "product_id", label: L("product"), type: "select", required: true, options: (c, x) => (c.products?.[x.module] ?? []).map((p) => ({ value: String(p.id), label: p.name })) },
            { key: "party", label: L("Customer"), type: "party", required: true },
            { key: "amount", label: L("amount"), type: "amount", required: true },
          ]}
          run={(x) => requirementApi.calculate({ module: x.module, product_id: Number(x.product_id), ...splitParty(x.party), amount: x.amount })}
          onClose={() => (setOpen(false), setResult(null))}
          onDone={(r) => setResult(first(r))}
        >
          {() =>
            result && (
              <div className="mb-3">
                <p className={`mb-2 rounded-xl border px-3 py-2 text-xs font-semibold ${result.satisfied ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  {!result.required ? L("No shares are required.") : result.satisfied ? L("The requirement is met.") : `${L("Buy")} ${result.additional_shares} ${L("shares")} (${result.additional_cost})`}
                </p>
                <Facts rows={Object.entries(result).filter(([, v]) => typeof v !== "object").map(([k, v]) => [L(k), String(v === "" ? "—" : v)])} />
              </div>
            )
          }
        </OpDialog>
      )}
    </>
  );
}

// ---------- Members ----------

export function MemberView({ id, onBack }) {
  const L = useL();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("holdings");
  useEffect(() => {
    memberApi
      .get({ id })
      .then((r) => setD(first(r)))
      .catch((e) => notifications.error(e.message));
  }, [id]);
  if (!d) return <PageSkeleton />;
  const m = d.member ?? {};
  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {L("Back to members")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black">{m.name || m.member_number}</h1>
          <Status code={m.status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{[m.member_number, words(m.member_category), m.currency_name, m.inst_profile_name].filter(Boolean).join(" · ")}</p>
        <Facts className="mt-3" rows={[[L("joined_on"), dateCell(m.joined_on)], [L("nominee"), m.nominee], [L("Payout account"), d.acct_num ?? m.acct_id], [L("created_by"), m.created_by]]} />
      </div>
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={["holdings", "certificates", "statement"].map((v) => ({ value: v, label: L(v) }))} />
      <Section title={L(tab)}>
        {tab === "holdings" && <RowsTable rows={d.holdings} columns={[{ key: "share_category_code", label: L("category") }, { key: "shares", label: L("shares"), numeric: true }, { key: "available_shares", label: L("available_shares"), numeric: true }, { key: "lien_shares", label: L("lien_shares"), numeric: true }, { key: "paid_amount", label: L("paid_amount"), numeric: true }]} />}
        {tab === "certificates" && <RowsTable rows={d.certificates} columns={[{ key: "certificate_number", label: L("certificate") }, { key: "share_category_code", label: L("category") }, { key: "shares", label: L("shares"), numeric: true }, { key: "range", label: L("Numbers"), render: (c) => `${c.from_number}–${c.to_number}` }, { key: "issued_on", label: L("issued_on"), render: (c) => dateCell(c.issued_on) }, { key: "status", label: L("status"), render: (c) => <Status code={c.status} /> }]} />}
        {tab === "statement" && <RowsTable rows={d.statement} columns={[{ key: "date", label: L("date"), render: (s) => dateCell(s.date) }, { key: "transaction", label: L("transaction"), render: (s) => words(s.transaction) }, { key: "share_category_code", label: L("category") }, { key: "shares", label: L("shares"), numeric: true }, { key: "price", label: L("price"), numeric: true }, { key: "amount", label: L("amount"), numeric: true }, { key: "reference", label: L("reference") }]} />}
      </Section>
    </div>
  );
}

// ---------- Purchases, transfers, redemptions ----------

// A maker-checker share operation: the list, a request, approve / reject.
export function ShareOpScreen({ api, title, sub, addLabel, columns, renderForm, toBody, needs, extra }) {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [adding, setAdding] = useState(false);
  const list = useServerList({ api: api.listPath, call: api.list });
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      {header(L, title, sub)}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L(title)}
        emptyTitle={L("Nothing yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L(addLabel)}
            </Button>
          )
        }
        columns={[
          { key: "member_number", label: L("member"), align: "left", render: memberCell },
          { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
          { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
          { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
          ...columns,
          { key: "requested_by", label: L("requested_by"), render: (r) => cell(r.requested_by) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          {
            key: "actions",
            label: t("actions"),
            sortable: false,
            render: (r) => {
              return <RowActions buttons={{ authorize: Boolean(r.actions?.auth), deauthorize: Boolean(r.actions?.deauth) }} onAuthorize={() => act(api.auth, { id: r.id }, list.reload)} onDeauthorize={() => act(api.deauth, { id: r.id }, list.reload)} />;
            },
          },
        ]}
      />
      {adding && (
        <OpDialog title={L(addLabel)} hint={L("A checker approves it.")} fields={[]} needs={needs} confirmLabel={L("Submit for approval")} run={(x) => api.add(toBody(x))} onClose={() => setAdding(false)} onDone={() => (setAdding(false), list.reload())}>
          {(form, setForm) => renderForm(form, setForm)}
        </OpDialog>
      )}
      {extra}
    </div>
  );
}

export const CategoryShares = ({ L, form, setForm, categories, amount = true, sharesOrAmount = false }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <label className={labelClass}>
      {L("category")}
      <FilterSelect className="mt-1" value={form.share_category_code ?? ""} onChange={(v) => setForm((x) => ({ ...x, share_category_code: v }))} options={[{ value: "", label: L("choose") }, ...categories]} />
    </label>
    <label className={labelClass}>
      {L("shares")}
      <input className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" inputMode="numeric" value={form.shares ?? ""} onChange={(e) => setForm((x) => ({ ...x, shares: e.target.value.replace(/\D/g, "") }))} />
    </label>
    {amount && (
      <label className={labelClass}>
        {L("amount")}
        <input className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" inputMode="decimal" value={form.amount ?? ""} onChange={(e) => setForm((x) => ({ ...x, amount: e.target.value.replace(/[^\d.]/g, "") }))} />
        {sharesOrAmount && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{L("Fill shares or amount.")}</span>}
      </label>
    )}
  </div>
);

// The member's open loans, for a lien linked to a loan.
export function LienFacility({ memberId, value, onChange }) {
  const L = useL();
  const o = useShareOptions(memberId);
  if (!memberId) return null;
  return (
    <label className={`${labelClass} mb-3 block`}>
      {L("Loan facility")}
      <FilterSelect className="mt-1" value={value ?? ""} onChange={onChange} options={[{ value: "", label: (o.loan_facilities ?? []).length ? L("choose") : L("The member has no open loans") }, ...(o.loan_facilities ?? []).map((f) => ({ value: String(f.id), label: `${f.facility_number} · ${words(f.status)}` }))]} />
    </label>
  );
}

// A certificate as a printable page (the browser's print gives the PDF).
export function printCertificate(c) {
  const w = window.open("", "_blank", "width=820,height=640");
  if (!w) return;
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.certificate_number)}</title>
<style>body{font-family:Georgia,serif;margin:40px;color:#111}.box{border:6px double #555;padding:36px;text-align:center}h1{margin:0 0 6px;letter-spacing:2px}h2{margin:4px 0 24px;font-weight:normal}table{margin:24px auto;border-collapse:collapse;text-align:left}td{padding:6px 14px;border-bottom:1px solid #ddd}.foot{margin-top:28px;font-size:12px;color:#555}</style></head><body>
<div class="box"><h1>${esc(c.inst_profile_name)}</h1><h2>Share Certificate No. ${esc(c.certificate_number)}</h2>
<p>This is to certify that <b>${esc(c.name)}</b> (member ${esc(c.member_number)}) is the registered holder of</p>
<p style="font-size:22px"><b>${esc(c.shares)}</b> ${esc(c.share_category_name)} (${esc(c.instrument_type)})</p>
<table><tr><td>Distinctive numbers</td><td>${esc(c.from_number)} to ${esc(c.to_number)}</td></tr><tr><td>Face value</td><td>${esc(c.face_value)} ${esc(c.currency)} each</td></tr><tr><td>Issued on</td><td>${esc(c.issued_on)}</td></tr><tr><td>Issued by</td><td>${esc(c.issued_by)}</td></tr>${c.reissued_from ? `<tr><td>Reissued from</td><td>${esc(c.reissued_from)}</td></tr>` : ""}<tr><td>Status</td><td>${esc(c.status)}</td></tr></table>
<p class="foot">Authorised signatory ______________________</p></div><script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

// ---------- Returns & dividends ----------

export function DistributionView({ d, onClose, onDecided }) {
  const L = useL();
  return (
    <OpDialog size="lg" title={`${words(d.kind)} · ${d.share_category_code}`} fields={[]} confirmLabel={L("Close")} run={async () => null} onClose={onClose} onDone={onClose}>
      {() => (
        <>
          <Facts className="mb-3" rows={[[L("period"), `${d.period_from} → ${d.period_to}`], [L("record_date"), d.record_date], [L("rate"), pct(d.rate)], d.amount_per_share && [L("amount_per_share"), d.amount_per_share], d.profit_pool && [L("profit_pool"), d.profit_pool], [L("total_gross"), d.total_gross], [L("total_tax"), d.total_tax], [L("total_net"), d.total_net], d.status && [L("status"), words(d.status)]]} />
          <RowsTable rows={d.lines} empty={L("No members qualify.")} columns={[{ key: "member_number", label: L("member"), render: (x) => `${x.member_number} · ${x.name}` }, { key: "shares", label: L("shares"), numeric: true }, { key: "gross", label: L("gross"), numeric: true }, { key: "tax", label: L("tax"), numeric: true }, { key: "net", label: L("net"), numeric: true }, { key: "acct_id", label: L("Payout account") }]} />
          {(d.actions?.auth || d.actions?.deauth) && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="danger" icon={XCircle} onClick={() => act(distributionApi.deauth, { id: d.id }, onDecided)}>
                {L("reject")}
              </Button>
              <Button size="sm" icon={CheckCircle2} onClick={() => act(distributionApi.auth, { id: d.id }, onDecided)}>
                {L("Approve and pay")}
              </Button>
            </div>
          )}
        </>
      )}
    </OpDialog>
  );
}

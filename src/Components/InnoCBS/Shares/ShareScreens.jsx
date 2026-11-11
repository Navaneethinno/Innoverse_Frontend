import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calculator, CheckCircle2, Lock, Plus, ShieldCheck, Unlock, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { CatalogueReports } from "@/Components/InnoCBS/Deposits/DepositOps";
import { OpDialog, ownerOf, RowsTable, cell, codes, dateCell, first, pct, splitParty, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// InnoCBS > Share Capital (Admin 22).
const SH = "/config/share";
const categoryApi = recordApi(`${SH}/category`);
const requirementRuleApi = recordApi(`${SH}/requirement_rule`);
const requirementApi = calls(`${SH}/requirement`, ["calculate"]);
const memberApi = calls(`${SH}/member`, ["list", "get", "add"]);
const purchaseApi = calls(`${SH}/purchase`, ["list", "add", "auth", "deauth"]);
const holdingApi = calls(`${SH}/holding`, ["list"]);
const lienApi = calls(`${SH}/lien`, ["list", "add", "release"]);
const certificateApi = calls(`${SH}/certificate`, ["list"]);
const transferApi = calls(`${SH}/transfer`, ["list", "add", "auth", "deauth"]);
const redemptionApi = calls(`${SH}/redemption`, ["list", "add", "auth", "deauth", "check"]);
const distributionApi = calls(`${SH}/distribution`, ["list", "get", "add", "auth", "deauth", "preview"]);
const shareReportApi = calls(`${SH}/report`, ["catalogue", "run"]);

const useF = () => {
  const L = useL();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};
const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? 0 : Number(x[k])])) });
const Status = ({ code }) => <StatusBadge status={code} label={words(code)} variant="subtle" />;
const header = (L, title, sub) => (
  <>
    <PageTitle>{L(title)}</PageTitle>
    <p className="mt-1 mb-4 text-sm text-muted-foreground">{L(sub)}</p>
  </>
);
const act = (call, body, after) =>
  call(body)
    .then((x) => {
      notifications.success(x?.message ?? "OK");
      after?.(x);
    })
    .catch((e) => notifications.error(e.message));
const isPending = (r) => ["PENDING", "PENDING_APPROVAL"].includes(r.status);
const memberCell = (r) => (
  <span className="text-xs">
    <b>{r.name || r.member_number}</b>
    <span className="block font-mono text-[10px] text-muted-foreground">{r.member_number}</span>
  </span>
);

// Share categories for a select (active records).
function useCategories() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    categoryApi
      .active({})
      .then((r) => setRows(rowsOf(r).map((c) => ({ value: c.code ?? c.setup?.code, label: `${c.code ?? c.setup?.code} · ${c.name ?? c.setup?.name}` }))))
      .catch(() => {});
  }, []);
  return rows;
}

// A member, searched by number or name.
function MemberPick({ value, onChange, placeholder }) {
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
const MemberField = ({ L, form, setForm, k = "member_id", label = "Member" }) => (
  <div className={`${labelClass} mb-3`}>
    {L(label)}
    <MemberPick value={form[k]} onChange={(v) => setForm((x) => ({ ...x, [k]: v }))} />
  </div>
);

// ---------- Settings ----------

export function ShareCategories() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={categoryApi}
      title={L("shareCategories")}
      subtitle={L("Face value, issue price, limits, voting, dividends, transfer and redemption rules.")}
      effectiveDated
      columns={[
        { key: "instrument_type", label: L("instrument_type"), render: (r) => cell(words(sv(r, "instrument_type"))) },
        { key: "price", label: L("Face value / issue price"), sortable: false, render: (r) => cell(`${sv(r, "face_value") ?? "—"} / ${sv(r, "issue_price") ?? "—"} ${sv(r, "currency") ?? ""}`) },
        { key: "voting_rights", label: L("voting_rights"), render: (r) => cell(words(sv(r, "voting_rights"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "E" }),
        f("name", "text", { required: true }),
        f("instrument_type", "select", { required: true, options: codes("instrument_types") }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("face_value", "amount", { required: true }),
        f("issue_price", "amount", { required: true }),
        f("eligibility_types", "multi", { options: codes("eligibility_types") }),
        f("minimum_shares", "int"),
        f("maximum_shares", "int", { hint: L("0 means no limit.") }),
        f("minimum_investment", "amount"),
        f("maximum_investment", "amount"),
        f("instalment_purchase_allowed", "bool"),
        f("voting_rights", "select", { options: codes("voting_rights") }),
        f("dividend_eligible", "bool"),
        f("interest_applicable", "bool"),
        f("return_type", "select", { options: codes("return_types") }),
        f("return_rate", "rate", { showIf: (x) => x.return_type && x.return_type !== "NONE" }),
        f("rate_type", "select", { options: codes("rate_types"), showIf: (x) => x.return_type && x.return_type !== "NONE" }),
        f("interest_scheme_code", "text", { showIf: (x) => x.interest_applicable }),
        f("calculation_method", "select", { options: codes("calculation_methods") }),
        f("calculation_basis", "select", { options: codes("calculation_bases") }),
        f("payment_frequency", "select", { options: codes("payment_frequencies") }),
        f("tax_rate", "rate"),
        f("transfer_permitted", "bool"),
        f("redemption_permitted", "bool"),
        f("partial_redemption", "bool", { showIf: (x) => x.redemption_permitted }),
        f("full_redemption", "bool", { showIf: (x) => x.redemption_permitted }),
        f("redemption_triggers", "multi", { options: codes("redemption_triggers"), showIf: (x) => x.redemption_permitted }),
        f("redemption_maker_checker", "bool", { showIf: (x) => x.redemption_permitted }),
        f("return_on_redemption", "select", { options: codes("return_on_redemption"), showIf: (x) => x.redemption_permitted }),
        f("deduction_percent", "percent", { showIf: (x) => x.redemption_permitted }),
        f("lock_in_months", "int", { showIf: (x) => x.redemption_permitted }),
        f("minimum_holding_days", "int", { showIf: (x) => x.redemption_permitted }),
        f("processing_days", "int", { showIf: (x) => x.redemption_permitted }),
        f("lien_check", "bool", { showIf: (x) => x.redemption_permitted }),
        f("outstanding_loan_check", "bool", { showIf: (x) => x.redemption_permitted }),
        f("pending_liability_check", "bool", { showIf: (x) => x.redemption_permitted }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={toNum(["minimum_shares", "maximum_shares", "lock_in_months", "minimum_holding_days", "processing_days"])}
    />
  );
}

// Check a customer against the requirement of a product.
function RequirementCheck() {
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

export function ShareRequirementRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={requirementRuleApi}
      title={L("shareRequirementRules")}
      subtitle={L("Shares a customer must hold to get a loan or deposit product.")}
      effectiveDated
      pageActions={<RequirementCheck />}
      columns={[
        { key: "module", label: L("module"), render: (r) => cell(words(sv(r, "module"))) },
        { key: "share_category_code", label: L("share_category_code"), render: (r) => cell(sv(r, "share_category_code")) },
        { key: "value", label: L("requirement"), sortable: false, render: (r) => cell(`${sv(r, "value") ?? "—"} · ${words(sv(r, "calculation_method"))}`) },
      ]}
      fields={[
        f("module", "select", { required: true, options: codes("modules") }),
        f("product_id", "select", { required: true, optionsFor: (c, x) => (c.products?.[x.module] ?? []).map((p) => ({ value: String(p.id), label: p.name })) }),
        f("share_category_code", "text", { required: true, placeholder: "C" }),
        f("requirement_type", "select", { required: true, options: codes("requirement_types") }),
        f("calculation_method", "select", { required: true, options: codes("calculation_methods") }),
        f("value", "amount", { required: true, hint: L("A percentage, an amount or a number of shares, by the method.") }),
        f("percentage_basis", "select", { options: codes("percentage_bases"), showIf: (x) => x.calculation_method === "PERCENTAGE" }),
        f("minimum_quantity", "int"),
        f("maximum_quantity", "int"),
        f("minimum_share_amount", "amount"),
        f("maximum_share_amount", "amount"),
        f("purchase_timing", "select", { options: codes("purchase_timings") }),
        f("redemption_condition", "select", { options: codes("redemption_conditions") }),
        f("existing_share_adjustment", "bool"),
        f("required_for_every_account", "bool"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text", { wide: true }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["product_id", "minimum_quantity", "maximum_quantity"])}
    />
  );
}

// ---------- Members ----------

function MemberView({ id, onBack }) {
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
        <Facts className="mt-3" rows={[[L("joined_on"), dateCell(m.joined_on)], [L("nominee"), m.nominee], [L("Payout account"), m.acct_id], [L("created_by"), m.created_by]]} />
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

export function Members() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const list = useServerList({ api: memberApi.listPath, call: memberApi.list, describe: false, enabled: !openId });
  if (!can("View")) return <NoAccess />;
  if (openId) return <MemberView id={openId} onBack={() => (setOpenId(null), list.reload())} />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "members", "Shareholders, and each member's holdings, certificates and statement.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("members")}
        emptyTitle={L("No members yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L("Add a member")}
            </Button>
          )
        }
        columns={[
          { key: "member_number", label: L("member"), align: "left", render: (r) => <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpenId(r.id)}>{memberCell(r)}</button> },
          { key: "member_category", label: L("member_category"), render: (r) => cell(words(r.member_category)) },
          { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
          { key: "paid_amount", label: L("paid_amount"), render: (r) => cell(r.paid_amount) },
          { key: "joined_on", label: L("joined_on"), render: (r) => dateCell(r.joined_on) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
        ]}
      />
      {adding && (
        <OpDialog
          title={L("Add a member")}
          hint={L("The member becomes active with their first approved purchase.")}
          fields={[
            { key: "party", label: L("Customer"), type: "party", required: true },
            { key: "member_category", label: L("member_category"), required: true, placeholder: "CUSTOMER" },
            { key: "acct_id", label: L("Payout account"), type: "acct", required: true, owner: (x) => ownerOf(x.party) },
            { key: "nominee", label: L("nominee") },
          ]}
          initial={{ member_category: "CUSTOMER" }}
          run={(x) => memberApi.add({ ...splitParty(x.party), member_category: x.member_category, acct_id: Number(x.acct_id), nominee: x.nominee })}
          onClose={() => setAdding(false)}
          onDone={() => (setAdding(false), list.reload())}
        />
      )}
    </div>
  );
}

// ---------- Purchases, transfers, redemptions ----------

// A maker-checker share operation: the list, a request, approve / reject.
function ShareOpScreen({ api, title, sub, addLabel, columns, renderForm, toBody, needs, extra }) {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [adding, setAdding] = useState(false);
  const list = useServerList({ api: api.listPath, call: api.list, describe: false });
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
              const p = isPending(r) && can("Authorize");
              return <RowActions buttons={{ authorize: p, deauthorize: p }} onAuthorize={() => act(api.auth, { id: Number(r.id) }, list.reload)} onDeauthorize={() => act(api.deauth, { id: Number(r.id) }, list.reload)} />;
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

const CategoryShares = ({ L, form, setForm, categories, amount = true, sharesOrAmount = false }) => (
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

export function SharePurchases() {
  const L = useL();
  const categories = useCategories();
  return (
    <ShareOpScreen
      api={purchaseApi}
      title="sharePurchases"
      sub="Share purchases: request, then a checker approves and the certificate is issued."
      addLabel="Request a purchase"
      columns={[
        { key: "certificate_number", label: L("certificate"), render: (r) => cell(r.certificate_number) },
        { key: "rrn", label: "RRN", render: (r) => cell(r.rrn) },
      ]}
      needs={(x) => x.member_id && x.share_category_code && (x.shares || x.amount)}
      toBody={(x) => ({ member_id: Number(x.member_id), share_category_code: x.share_category_code, ...(x.shares ? { shares: Number(x.shares) } : { amount: x.amount }) })}
      renderForm={(form, setForm) => (
        <>
          <MemberField L={L} form={form} setForm={setForm} />
          <CategoryShares L={L} form={form} setForm={setForm} categories={categories} sharesOrAmount />
        </>
      )}
    />
  );
}

export function ShareTransfers() {
  const L = useL();
  const categories = useCategories();
  return (
    <ShareOpScreen
      api={transferApi}
      title="shareTransfers"
      sub="Share transfers between members."
      addLabel="Request a transfer"
      columns={[
        { key: "to_member_number", label: L("To member"), render: (r) => cell(r.to_member_number) },
        { key: "certificate_number", label: L("certificate"), render: (r) => cell(r.certificate_number) },
      ]}
      needs={(x) => x.member_id && x.to_member_id && x.share_category_code && x.shares}
      toBody={(x) => ({ member_id: Number(x.member_id), to_member_id: Number(x.to_member_id), share_category_code: x.share_category_code, shares: Number(x.shares), amount: x.amount })}
      renderForm={(form, setForm) => (
        <>
          <MemberField L={L} form={form} setForm={setForm} label="From member" />
          <MemberField L={L} form={form} setForm={setForm} k="to_member_id" label="To member" />
          <CategoryShares L={L} form={form} setForm={setForm} categories={categories} />
        </>
      )}
    />
  );
}

export function ShareRedemptions() {
  const L = useL();
  const categories = useCategories();
  const [check, setCheck] = useState(null);
  const body = (x) => ({ member_id: Number(x.member_id), share_category_code: x.share_category_code, shares: Number(x.shares), trigger: x.trigger || "MANUAL" });
  return (
    <ShareOpScreen
      api={redemptionApi}
      title="shareRedemptions"
      sub="Redemptions: check eligibility, request, then a checker approves the payout."
      addLabel="Request a redemption"
      columns={[{ key: "rrn", label: "RRN", render: (r) => cell(r.rrn) }]}
      needs={(x) => x.member_id && x.share_category_code && x.shares}
      toBody={body}
      renderForm={(form, setForm) => (
        <>
          <MemberField L={L} form={form} setForm={setForm} />
          <CategoryShares L={L} form={form} setForm={setForm} categories={categories} amount={false} />
          <div className="mt-3">
            <Button
              size="sm"
              variant="secondary"
              icon={ShieldCheck}
              disabled={!(form.member_id && form.share_category_code && form.shares)}
              disabledReason={L("Pick the member, category and shares.")}
              onClick={() =>
                redemptionApi
                  .check(body(form))
                  .then((r) => setCheck(first(r)))
                  .catch((e) => notifications.error(e.message))
              }
            >
              {L("Check eligibility")}
            </Button>
            {check && (
              <div className="mt-3">
                <p className={`mb-2 rounded-xl border px-3 py-2 text-xs font-semibold ${check.allowed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {check.allowed ? L("Redemption allowed") : L("Redemption blocked")}
                  {(check.blocks ?? []).map((b) => (
                    <span key={String(b)} className="block font-normal">{typeof b === "string" ? b : (b.message ?? JSON.stringify(b))}</span>
                  ))}
                </p>
                <Facts rows={[[L("shares_held"), check.shares_held], [L("shares_under_lien"), check.shares_under_lien], [L("shares_required_by_relationships"), check.shares_required_by_relationships], [L("principal"), check.principal], [L("return_up_to_date"), check.return_up_to_date], [L("deduction"), check.deduction], [L("payout"), check.payout]]} />
              </div>
            )}
          </div>
        </>
      )}
    />
  );
}

// ---------- Holdings, liens, certificates ----------

export function Shareholdings() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const categories = useCategories();
  const [tab, setTab] = useState("holdings");
  const [adding, setAdding] = useState(false);
  const holdings = useServerList({ api: holdingApi.listPath, call: holdingApi.list, describe: false, enabled: tab === "holdings" });
  const liens = useServerList({ api: lienApi.listPath, call: lienApi.list, prefix: "l_", describe: false, enabled: tab === "liens" });
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "shareholdings", "Shareholdings across members, and the shares held under lien.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "holdings", label: L("Holdings") }, { value: "liens", label: L("Liens") }]} />
      {tab === "holdings" && (
        <ListTable
          list={holdings}
          rowKey={(r) => `${r.member_id}:${r.share_category_code}`}
          title={L("Holdings")}
          emptyTitle={L("No holdings yet")}
          columns={[
            { key: "member_number", label: L("member"), align: "left", render: memberCell },
            { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
            { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
            { key: "available_shares", label: L("available_shares"), render: (r) => cell(r.available_shares) },
            { key: "lien_shares", label: L("lien_shares"), render: (r) => cell(r.lien_shares) },
            { key: "paid_amount", label: L("paid_amount"), render: (r) => cell(r.paid_amount) },
            { key: "member_status", label: L("status"), render: (r) => <Status code={r.member_status} /> },
          ]}
        />
      )}
      {tab === "liens" && (
        <ListTable
          list={liens}
          rowKey={(r) => r.id}
          title={L("Liens")}
          emptyTitle={L("No liens")}
          actions={
            can("Edit") && (
              <Button size="sm" icon={Lock} onClick={() => setAdding(true)}>
                {L("Mark a lien")}
              </Button>
            )
          }
          columns={[
            { key: "member_number", label: L("member"), align: "left", render: memberCell },
            { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
            { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
            { key: "reason", label: L("reason"), render: (r) => cell(r.reason) },
            { key: "source", label: L("source"), sortable: false, render: (r) => cell(r.source_module ? `${words(r.source_module)} #${r.source_id}` : "—") },
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
            {
              key: "actions",
              label: t("actions"),
              sortable: false,
              render: (r) =>
                r.status === "ACTIVE" &&
                can("Edit") && (
                  <Button size="sm" variant="ghost" icon={Unlock} onClick={() => act(lienApi.release, { lien_id: Number(r.id) }, liens.reload)}>
                    {L("Release")}
                  </Button>
                ),
            },
          ]}
        />
      )}
      {adding && (
        <OpDialog
          title={L("Mark a lien")}
          fields={[
            { key: "reason", label: L("reason"), required: true, wide: true },
            { key: "source_module", label: L("source_module"), placeholder: "LOAN" },
            { key: "source_id", label: L("source_id"), type: "int" },
          ]}
          needs={(x) => x.member_id && x.share_category_code && x.shares}
          run={(x) => lienApi.add({ member_id: Number(x.member_id), share_category_code: x.share_category_code, shares: Number(x.shares), reason: x.reason, source_module: x.source_module, source_id: x.source_id ? Number(x.source_id) : 0 })}
          onClose={() => setAdding(false)}
          onDone={() => (setAdding(false), liens.reload())}
        >
          {(form, setForm) => (
            <>
              <MemberField L={L} form={form} setForm={setForm} />
              <div className="mb-3">
                <CategoryShares L={L} form={form} setForm={setForm} categories={categories} amount={false} />
              </div>
            </>
          )}
        </OpDialog>
      )}
    </div>
  );
}

export function ShareCertificates() {
  const L = useL();
  const can = usePagePermission();
  const list = useServerList({ api: certificateApi.listPath, call: certificateApi.list, describe: false });
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "shareCertificates", "Share certificates issued, cancelled and reissued.")}
      <ListTable
        list={list}
        rowKey={(r) => r.certificate_number}
        title={L("shareCertificates")}
        emptyTitle={L("No certificates yet")}
        columns={[
          { key: "certificate_number", label: L("certificate"), render: (r) => <span className="font-mono text-xs font-bold">{r.certificate_number}</span> },
          { key: "member_number", label: L("member"), align: "left", render: memberCell },
          { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
          { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
          { key: "range", label: L("Numbers"), sortable: false, render: (r) => cell(`${r.from_number}–${r.to_number}`) },
          { key: "issued_on", label: L("issued_on"), render: (r) => dateCell(r.issued_on) },
          { key: "issued_by", label: L("issued_by"), render: (r) => cell(r.issued_by) },
          { key: "cancelled_on", label: L("cancelled_on"), render: (r) => dateCell(r.cancelled_on) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
        ]}
      />
    </div>
  );
}

// ---------- Returns & dividends ----------

function DistributionView({ d, onClose, onDecided }) {
  const L = useL();
  const can = usePagePermission();
  return (
    <OpDialog size="lg" title={`${words(d.kind)} · ${d.share_category_code}`} fields={[]} confirmLabel={L("Close")} run={async () => null} onClose={onClose} onDone={onClose}>
      {() => (
        <>
          <Facts className="mb-3" rows={[[L("period"), `${d.period_from} → ${d.period_to}`], [L("record_date"), d.record_date], [L("rate"), pct(d.rate)], d.amount_per_share && [L("amount_per_share"), d.amount_per_share], d.profit_pool && [L("profit_pool"), d.profit_pool], [L("total_gross"), d.total_gross], [L("total_tax"), d.total_tax], [L("total_net"), d.total_net], d.status && [L("status"), words(d.status)]]} />
          <RowsTable rows={d.lines} empty={L("No members qualify.")} columns={[{ key: "member_number", label: L("member"), render: (x) => `${x.member_number} · ${x.name}` }, { key: "shares", label: L("shares"), numeric: true }, { key: "gross", label: L("gross"), numeric: true }, { key: "tax", label: L("tax"), numeric: true }, { key: "net", label: L("net"), numeric: true }, { key: "acct_id", label: L("Payout account") }]} />
          {d.id > 0 && (isPending(d) || ["CALCULATED", "DECLARED"].includes(d.status)) && can("Authorize") && (
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

export function ReturnsDividends() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const categories = useCategories();
  const [open, setOpen] = useState(null);
  const [declaring, setDeclaring] = useState(false);
  const [preview, setPreview] = useState(null);
  const list = useServerList({ api: distributionApi.listPath, call: distributionApi.list, describe: false });
  if (!can("View")) return <NoAccess />;
  const view = (id) =>
    distributionApi
      .get({ id: Number(id) })
      .then((r) => setOpen(first(r)))
      .catch((e) => notifications.error(e.message));
  const fields = [
    { key: "kind", label: L("kind"), type: "select", required: true, options: [{ value: "DIVIDEND", label: L("Dividend") }, { value: "INTEREST", label: L("Interest") }] },
    { key: "share_category_code", label: L("category"), type: "select", required: true, options: categories },
    { key: "period_from", label: L("period_from"), type: "date", required: true },
    { key: "period_to", label: L("period_to"), type: "date", required: true },
    { key: "rate", label: L("rate"), type: "rate", required: true },
  ];
  return (
    <div className="pt-1 pb-6">
      {header(L, "Returns & Dividends", "Dividends and interest on shares: declare (worked out per member), then a checker approves and pays.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("Returns & Dividends")}
        emptyTitle={L("Nothing declared yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setDeclaring(true)}>
              {L("Declare")}
            </Button>
          )
        }
        columns={[
          { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind)) },
          { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
          { key: "period", label: L("period"), sortable: false, render: (r) => cell(`${r.period_from} → ${r.period_to}`) },
          { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate)) },
          { key: "members", label: L("members"), render: (r) => cell(r.members) },
          { key: "total_net", label: L("total_net"), render: (r) => cell(r.total_net) },
          { key: "calculated_by", label: L("calculated_by"), render: (r) => cell(r.calculated_by) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => view(r.id)} /> },
        ]}
      />
      {open && <DistributionView d={open} onClose={() => setOpen(null)} onDecided={() => (setOpen(null), list.reload())} />}
      {declaring && (
        <OpDialog
          size="lg"
          title={L("Declare")}
          hint={L("Preview the per-member split first; declaring saves it for a checker.")}
          fields={fields}
          initial={{ kind: "DIVIDEND" }}
          confirmLabel={L("Declare")}
          run={(x) => distributionApi.add(x)}
          onClose={() => (setDeclaring(false), setPreview(null))}
          onDone={() => (setDeclaring(false), setPreview(null), list.reload())}
        >
          {(form) => (
            <div className="mb-3">
              <Button
                size="sm"
                variant="secondary"
                icon={Calculator}
                disabled={!fields.every((f) => form[f.key])}
                disabledReason={t("blockedFillRequired")}
                onClick={() =>
                  distributionApi
                    .preview(form)
                    .then((r) => setPreview(first(r)))
                    .catch((e) => notifications.error(e.message))
                }
              >
                {L("Preview")}
              </Button>
              {preview && (
                <div className="mt-3">
                  <Facts className="mb-2" rows={[[L("total_gross"), preview.total_gross], [L("total_tax"), preview.total_tax], [L("total_net"), preview.total_net], [L("members"), (preview.lines ?? []).length]]} />
                  <RowsTable rows={preview.lines} empty={L("No members qualify.")} columns={[{ key: "member_number", label: L("member"), render: (x) => `${x.member_number} · ${x.name}` }, { key: "shares", label: L("shares"), numeric: true }, { key: "gross", label: L("gross"), numeric: true }, { key: "tax", label: L("tax"), numeric: true }, { key: "net", label: L("net"), numeric: true }]} />
                </div>
              )}
            </div>
          )}
        </OpDialog>
      )}
    </div>
  );
}

export function ShareReports() {
  return <CatalogueReports api={shareReportApi} title="shareReports" sub="Pick a share report from the catalogue and run it." />;
}

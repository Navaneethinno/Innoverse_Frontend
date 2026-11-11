import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calculator, Play } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { VerbDialog } from "@/Components/MakerChecker/SetupDocument";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { Facts, NarrationDialog, Section, inputClass, labelClass, ratePct } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// InnoCBS > Interest Rate Management (Admin 19).
const BASE = "/config/interest";
const schemeApi = recordApi(`${BASE}/scheme`);
const ageApi = recordApi(`${BASE}/age_category`);
const paramApi = recordApi(`${BASE}/parameter`);
const benchmarkApi = recordApi(`${BASE}/benchmark`);
const rateApi = recordApi(`${BASE}/rate`, ["matrix"]);
const mappingApi = recordApi(`${BASE}/mapping`);
const resetApi = calls(`${BASE}/reset`, ["run"]);
const approvalApi = calls(`${BASE}/approval`, ["list"]);
const simulateApi = calls(BASE, ["simulate"]);
const accountApi = calls(`${BASE}/account`, ["get", "list"]);
const historyApi = calls(`${BASE}/history`, ["list"]);

// Codes shown as words: TERM_DEPOSIT -> Term deposit.
const words = (code) => {
  const s = String(code ?? "").replace(/_/g, " ").toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : "";
};
const codes = (key) => (c) => (c[key] ?? []).map((v) => ({ value: v, label: words(v) }));
const coded = (key) => (c) => (c[key] ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` }));
const useL = () => {
  const { t } = useTranslation("record");
  return (key) => t(`ir_${key}`, { defaultValue: words(key) });
};
const pct = (v) => (v === "" || v == null ? "—" : ratePct(v));
const cell = (v) => <span className="text-xs">{v === "" || v == null ? "—" : v}</span>;

export function InterestSchemes() {
  const L = useL();
  const f = (key, type = "select", extra = {}) => ({ key, label: L(key), type, ...extra });
  return (
    <RecordScreen
      api={schemeApi}
      title={L("interestSchemes")}
      subtitle={L("How interest is worked out for a kind of product: frequencies, day count, and what its rates depend on.")}
      effectiveDated
      columns={[
        { key: "category", label: L("category"), render: (r) => cell(words(r.category ?? r.setup?.category)) },
        { key: "rate_type", label: L("rate_type"), render: (r) => cell(words(r.rate_type ?? r.setup?.rate_type)) },
        { key: "calculation_type", label: L("calculation_type"), render: (r) => cell(words(r.calculation_type ?? r.setup?.calculation_type)) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "HL_FLOAT" }),
        f("name", "text", { required: true }),
        f("category", "select", { required: true, options: codes("categories") }),
        f("scheme_type", "select", { required: true, options: codes("scheme_types") }),
        f("deposit_type", "select", { options: codes("deposit_types"), showIf: (x) => x.category === "DEPOSIT" }),
        f("rate_type", "select", { required: true, options: codes("rate_types") }),
        f("calculation_type", "select", { required: true, options: codes("calculation_types") }),
        f("day_count", "select", { required: true, options: codes("day_counts") }),
        f("accrual_frequency", "select", { options: codes("accrual_frequencies") }),
        f("compounding_frequency", "select", { options: codes("compounding_frequencies") }),
        f("credit_frequency", "select", { options: codes("credit_frequencies") }),
        f("balance_method", "select", { options: codes("balance_methods") }),
        f("tier_method", "select", { options: codes("tier_methods") }),
        f("currency", "select", { options: (c) => (c.currencies ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` })), hint: L("Leave empty for any currency.") }),
        f("benchmark_code", "select", { options: coded("benchmarks"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("reset_frequency", "select", { options: codes("reset_frequencies"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("floor_rate", "rate"),
        f("cap_rate", "rate"),
        f("min_interest", "amount"),
        f("max_interest", "amount"),
        f("decimals", "int"),
        f("rounding_mode", "select", { options: codes("rounding_modes") }),
        f("rate_change_rule", "select", { options: codes("rate_change_rules") }),
        f("age_reference", "select", { options: codes("age_references") }),
        f("dimensions", "multi", { options: codes("dimensions"), hint: L("What the scheme's rates depend on. Gender and age are optional pricing dimensions; check them against fair-lending rules.") }),
        f("override_allowed", "bool"),
        f("max_override_bps", "int", { showIf: (x) => x.override_allowed }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={(x) => ({ ...x, decimals: Number(x.decimals || 0), max_override_bps: Number(x.max_override_bps || 0) })}
    />
  );
}

export function AgeCategories() {
  const L = useL();
  return (
    <RecordScreen
      api={ageApi}
      title={L("ageCategories")}
      subtitle={L("Age bands used by rates. Bands may not overlap.")}
      columns={[{ key: "min_age", label: L("ages"), render: (r) => cell(`${r.min_age ?? r.setup?.min_age ?? 0} – ${(r.max_age ?? r.setup?.max_age) ?? "∞"}`) }]}
      fields={[
        { key: "code", label: L("code"), type: "code", required: true, fixedOnEdit: true, placeholder: "SENIOR" },
        { key: "name", label: L("name"), required: true },
        { key: "min_age", label: L("min_age"), type: "int", required: true },
        { key: "max_age", label: L("max_age"), type: "int", hint: L("Leave empty for no upper limit.") },
        { key: "description", label: L("description"), type: "textarea" },
      ]}
      bodyOf={(x) => ({ ...x, min_age: Number(x.min_age), max_age: x.max_age === "" || x.max_age == null ? null : Number(x.max_age) })}
    />
  );
}

// The values of one parameter (a list, or bands with min / max).
function ParameterValues({ value, onChange, band }) {
  const L = useL();
  const rows = value ?? [];
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="mt-1 grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-2 sm:grid-cols-6">
          <input aria-label={L("code")} className={inputClass} placeholder={L("code")} value={r.code ?? ""} onChange={(e) => set(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} />
          <input aria-label={L("name")} className={`${inputClass} sm:col-span-2`} placeholder={L("name")} value={r.name ?? ""} onChange={(e) => set(i, { name: e.target.value })} />
          {band && <input aria-label={L("min")} className={inputClass} placeholder={L("min")} value={r.min ?? ""} onChange={(e) => set(i, { min: e.target.value })} />}
          {band && <input aria-label={L("max")} className={inputClass} placeholder={L("max")} value={r.max ?? ""} onChange={(e) => set(i, { max: e.target.value })} />}
          <div className="flex items-center gap-2">
            <Field field={{ type: "bool", label: L("active") }} value={r.active !== false} onChange={(v) => set(i, { active: v })} />
            <Button size="sm" variant="ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              {L("remove")}
            </Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => onChange([...rows, { code: "", name: "", description: "", active: true, ...(band ? { min: "", max: "" } : {}) }])}>
        {L("addValue")}
      </Button>
    </div>
  );
}

export function CustomerParameters() {
  const L = useL();
  const fields = [
    { key: "code", label: L("code"), type: "code", required: true, fixedOnEdit: true, placeholder: "CREDIT_SCORE_BAND" },
    { key: "name", label: L("name"), required: true },
    { key: "kind", label: L("kind"), type: "select", required: true, options: codes("kinds") },
    { key: "source", label: L("source"), type: "select", options: codes("sources") },
    { key: "applies_to", label: L("applies_to"), type: "multi", options: codes("applies_to") },
    { key: "regulated", label: L("regulated"), type: "bool", hint: L("A regulated dimension (such as gender) must be justified under fair-lending rules.") },
    { key: "description", label: L("description"), type: "textarea" },
  ];
  return (
    <RecordScreen
      api={paramApi}
      title={L("customerParameters")}
      subtitle={L("Customer parameters a rate can depend on: segment, risk category, loan type, credit score bands.")}
      columns={[
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? r.setup?.kind)) },
        { key: "values", label: L("values"), sortable: false, render: (r) => cell((r.values ?? r.setup?.values ?? []).length) },
      ]}
      fields={[...fields, { key: "values", label: L("values"), type: "custom", wide: true, render: (v, set, form) => <ParameterValues value={v} onChange={set} band={form.kind === "BAND"} /> }]}
      factsOf={(s) => [...fields.map((f) => [f.label, Array.isArray(s[f.key]) ? s[f.key].map(words).join(", ") || "—" : typeof s[f.key] === "boolean" ? (s[f.key] ? "✓" : "—") : words(s[f.key]) || "—"]), [L("values"), (s.values ?? []).map((v) => `${v.name}${v.min !== undefined && v.min !== "" ? ` (${v.min}–${v.max || "∞"})` : ""}${v.active === false ? " ✕" : ""}`).join(", ") || "—"]]}
    />
  );
}

export function BenchmarkRates() {
  const L = useL();
  return (
    <RecordScreen
      api={benchmarkApi}
      title={L("benchmarkRates")}
      subtitle={L("Benchmark rates for floating schemes, effective-dated.")}
      effectiveDated
      columns={[
        { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate ?? r.setup?.rate)) },
        { key: "effective_from", label: L("effective_from"), render: (r) => cell(accountDate(r.effective_from ?? r.setup?.effective_from)) },
      ]}
      fields={[
        { key: "code", label: L("code"), type: "code", required: true, fixedOnEdit: true, placeholder: "MPR" },
        { key: "name", label: L("name"), required: true },
        { key: "kind", label: L("kind"), type: "select", required: true, options: codes("kinds") },
        { key: "rate", label: L("rate"), type: "rate", required: true },
        { key: "currency", label: L("currency"), placeholder: "NGN" },
        { key: "effective_from", label: L("effective_from"), type: "date", required: true },
        { key: "source", label: L("source"), placeholder: "Central Bank" },
        { key: "fallback_benchmark", label: L("fallback_benchmark") },
        { key: "publication_note", label: L("publication_note"), wide: true },
        { key: "description", label: L("description"), type: "textarea" },
      ]}
    />
  );
}

// Run the floating-rate reset for a day (the INTEREST_RESET job does it daily).
function ResetRun() {
  const L = useL();
  const can = usePagePermission();
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  if (!can("Authorize")) return null;
  const run = async () => {
    setBusy(true);
    try {
      const r = await resetApi.run({ on });
      notifications.success(r?.message ?? L("Reset run done"));
      setOpen(false);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button size="sm" variant="secondary" icon={Play} onClick={() => setOpen(true)}>
        {L("Run rate reset")}
      </Button>
      {open && (
        <NarrationDialog title={L("Run rate reset")} hint={L("Resets the floating-rate accounts due on this day. The daily job does this on its own.")} confirmLabel={L("Run")} busy={busy} onClose={() => setOpen(false)} onSave={run}>
          <label className={`${labelClass} mb-3 block`}>
            {L("on")}
            <Field field={{ type: "date" }} value={on} onChange={setOn} />
          </label>
        </NarrationDialog>
      )}
    </>
  );
}

const param = (key) => (c) => (c.parameters?.[key] ?? []).map((x) => ({ value: x.code, label: x.name }));

export function InterestRateConfiguration() {
  const L = useL();
  const opt = (key, from) => ({ key, label: L(key), type: "select", options: param(from) });
  return (
    <RecordScreen
      api={rateApi}
      title={L("interestRateConfiguration")}
      subtitle={L("Rate slabs of a scheme: tenure, amount and customer conditions to a rate. If no slab matches, a booking is refused.")}
      effectiveDated
      pageActions={<ResetRun />}
      columns={[
        { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(r.scheme_code ?? r.setup?.scheme_code) },
        { key: "base_rate", label: L("base_rate"), render: (r) => cell(pct(r.base_rate ?? r.setup?.base_rate)) },
        { key: "tenure", label: L("tenure"), sortable: false, render: (r) => { const s = r.setup ?? r; return cell(`${s.min_tenure ?? "—"}–${s.max_tenure ?? "—"} ${words(s.tenure_unit)}`); } },
        { key: "priority", label: L("priority"), render: (r) => cell(r.priority ?? r.setup?.priority) },
      ]}
      fields={[
        { key: "scheme_code", label: L("scheme_code"), type: "select", required: true, options: coded("schemes"), fixedOnEdit: true },
        { key: "code", label: L("code"), type: "code", fixedOnEdit: true, hint: L("Leave empty and the server gives one.") },
        { key: "name", label: L("name"), wide: true },
        { key: "base_rate", label: L("base_rate"), type: "rate", required: true },
        { key: "additional_rate", label: L("additional_rate"), type: "rate" },
        { key: "tenure_unit", label: L("tenure_unit"), type: "select", options: codes("tenure_units") },
        { key: "min_tenure", label: L("min_tenure"), type: "int" },
        { key: "max_tenure", label: L("max_tenure"), type: "int" },
        { key: "min_amount", label: L("min_amount"), type: "amount" },
        { key: "max_amount", label: L("max_amount"), type: "amount" },
        { key: "currency", label: L("currency"), placeholder: "NGN" },
        { key: "age_category", label: L("age_category"), type: "select", options: coded("age_categories") },
        { key: "gender", label: L("gender"), type: "select", options: param("GENDER") },
        opt("customer_segment", "CUSTOMER_SEGMENT"),
        opt("risk_category", "RISK_CATEGORY"),
        opt("loan_type", "LOAN_TYPE"),
        opt("collateral_type", "COLLATERAL_TYPE"),
        opt("credit_score_band", "CREDIT_SCORE_BAND"),
        { key: "relationship", label: L("relationship") },
        { key: "special_scheme", label: L("special_scheme") },
        { key: "priority", label: L("priority"), type: "int", hint: L("Higher wins when two slabs match equally.") },
        { key: "effective_from", label: L("effective_from"), type: "date", required: true },
        { key: "remarks", label: L("remarks"), type: "textarea" },
      ]}
      bodyOf={(x, rec) => ({
        ...x,
        branch_id: Number((rec?.setup ?? {}).branch_id ?? 0),
        conditions: (rec?.setup ?? {}).conditions ?? {},
        priority: Number(x.priority || 0),
        min_tenure: x.min_tenure === "" ? null : Number(x.min_tenure),
        max_tenure: x.max_tenure === "" ? null : Number(x.max_tenure),
      })}
    />
  );
}

export function ProductInterestMapping() {
  const L = useL();
  return (
    <RecordScreen
      api={mappingApi}
      title={L("productInterestMapping")}
      subtitle={L("Which scheme prices which product. A mapped product takes its rate from the scheme at booking.")}
      effectiveDated
      columns={[
        { key: "product_code", label: L("product"), render: (r) => cell(`${words(r.product_kind ?? r.setup?.product_kind)} · ${r.product_code ?? r.setup?.product_code ?? ""}`) },
        { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(r.scheme_code ?? r.setup?.scheme_code) },
      ]}
      fields={[
        { key: "product_kind", label: L("product_kind"), type: "select", required: true, options: codes("product_kinds"), fixedOnEdit: true },
        { key: "product_id", label: L("product"), type: "select", required: true, fixedOnEdit: true, options: () => [], dependsOn: "product_kind", optionsFor: (c, form) => (c.products?.[form.product_kind] ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` })) },
        { key: "scheme_code", label: L("scheme_code"), type: "select", required: true, options: coded("schemes") },
        { key: "penal_scheme_code", label: L("penal_scheme_code"), type: "select", options: coded("schemes") },
        { key: "rate_type", label: L("rate_type"), type: "select", options: codes("rate_types") },
        { key: "effective_from", label: L("effective_from"), type: "date" },
        { key: "mandatory", label: L("mandatory"), type: "bool" },
        { key: "override_allowed", label: L("override_allowed"), type: "bool" },
        { key: "code", label: L("code"), type: "code", fixedOnEdit: true, hint: L("Leave empty and the server gives one.") },
        { key: "name", label: L("name"), hint: L("Leave empty and the server names it.") },
      ]}
      bodyOf={(x) => ({ ...x, product_id: Number(x.product_id) })}
    />
  );
}

// Rate slabs waiting for a second user's approval.
export function InterestRateApproval() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const list = useServerList({ api: approvalApi.listPath, call: approvalApi.list, describe: false });
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const { t: tr } = useTranslation("record");
  if (!can("View")) return <NoAccess />;
  const decide = async (narration) => {
    setBusy(true);
    try {
      const r = await rateApi[decision.verb]({ id: decision.id, narration });
      notifications.success(r?.message ?? L("Done"));
      setDecision(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const s = (r) => r.pending?.setup ?? r.setup ?? r;
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("interestRateApproval")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("Rate slabs waiting for approval. The user who proposed a change cannot approve it.")}</p>
      <ListTable
        list={list}
        rowKey={(r) => r.id ?? r.code}
        title={L("interestRateApproval")}
        emptyTitle={L("No rates are waiting for approval")}
        columns={[
          { key: "code", label: L("slab"), align: "left", render: (r) => <span className="text-xs"><b>{s(r).name ?? r.name}</b><span className="block font-mono text-[10px] text-muted-foreground">{s(r).code ?? r.code}</span></span> },
          { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(s(r).scheme_code) },
          { key: "base_rate", label: L("base_rate"), render: (r) => cell(pct(s(r).base_rate ?? r.rate)) },
          { key: "effective_from", label: L("effective_from"), render: (r) => cell(accountDate(s(r).effective_from)) },
          { key: "action", label: L("change"), render: (r) => cell(words(r.pending?.action ?? r.action)) },
          { key: "proposed_by", label: L("proposed_by"), render: (r) => cell(r.pending?.proposed_by ?? r.proposed_by) },
          {
            key: "actions",
            label: t("actions"),
            sortable: false,
            render: (r) => (
              <RowActions
                buttons={{ authorize: can("Authorize") && r.actions?.auth !== false, deauthorize: can("Authorize") && r.actions?.deauth !== false }}
                onAuthorize={() => setDecision({ id: r.id, verb: "auth" })}
                onDeauthorize={() => setDecision({ id: r.id, verb: "deauth" })}
              />
            ),
          },
        ]}
      />
      <VerbDialog dialog={decision?.verb ?? null} t={tr} busy={busy} onClose={() => setDecision(null)} onSave={decide} />
    </div>
  );
}

function Candidates({ rows }) {
  const L = useL();
  if (!rows?.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <SimpleTable columns={[L("slab"), L("rate"), L("priority"), L("specificity"), L("matched")]}>
        <tbody>
          {rows.map((c) => (
            <tr key={c.code} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-1.5"><b className="text-xs">{c.name}</b><span className="block font-mono text-[10px] text-muted-foreground">{c.code}</span></td>
              <td className="px-3 py-1.5 tabular-nums">{pct(c.rate)}</td>
              <td className="px-3 py-1.5">{c.priority}</td>
              <td className="px-3 py-1.5">{c.specificity}</td>
              <td className="px-3 py-1.5 text-xs">{(c.matched_conditions ?? []).map(words).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>
    </div>
  );
}

function RateChoice({ choice }) {
  const L = useL();
  if (!choice) return null;
  return (
    <>
      <Facts
        className="mb-3"
        rows={[
          [L("rate"), pct(choice.rate)],
          [L("slab"), choice.slab_name ?? choice.slab_code],
          [L("base_rate"), pct(choice.base_rate)],
          [L("additional_rate"), pct(choice.additional_rate)],
          [L("rate_before_limits"), pct(choice.rate_before_limits)],
          [L("rate_type"), words(choice.rate_type)],
          [L("calculation_type"), words(choice.calculation_type)],
          [L("day_count"), choice.day_count],
          choice.age_years != null && [L("age"), `${choice.age_years} · ${words(choice.age_category)}`],
          [L("tenure"), `${choice.tenure_months ?? "—"} ${L("months")} · ${choice.tenure_days ?? "—"} ${L("days")}`],
        ]}
      />
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{L("Slabs that matched")}</p>
      <Candidates rows={choice.candidates} />
    </>
  );
}

export function InterestSimulation() {
  const L = useL();
  const can = usePagePermission();
  const [by, setBy] = useState("scheme");
  const [form, setForm] = useState({ scheme_code: "", product_kind: "", product_id: "", amount: "", tenure_value: "", tenure_unit: "MONTHS", booking_date: new Date().toISOString().slice(0, 10), birth_date: "" });
  const [choices, setChoices] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([rateApi.options({}), mappingApi.options({})])
      .then(([a, b]) => setChoices({ ...(rowsOf(a)[0] ?? {}), ...(rowsOf(b)[0] ?? {}) }))
      .catch(() => setChoices({}));
  }, []);
  if (!can("View")) return <NoAccess />;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const c = choices ?? {};
  const ready = form.amount && form.tenure_value && (by === "scheme" ? form.scheme_code : form.product_kind && form.product_id);
  const run = async () => {
    setBusy(true);
    try {
      const body = { amount: form.amount, tenure_value: Number(form.tenure_value), tenure_unit: form.tenure_unit, booking_date: form.booking_date, ...(form.birth_date ? { birth_date: form.birth_date } : {}), ...(by === "scheme" ? { scheme_code: form.scheme_code } : { product_kind: form.product_kind, product_id: Number(form.product_id) }) };
      const r = await simulateApi.simulate(body);
      setResult(rowsOf(r)[0] ?? r?.data ?? null);
    } catch (e) {
      notifications.error(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };
  const calc = result?.calculation;
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("interestSimulation")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("The rate a booking would get, why, and the interest it earns. Nothing is saved.")}</p>
      <Section title={L("Booking")} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            {L("Price by")}
            <Field field={{ type: "select", options: [{ value: "scheme", label: L("scheme") }, { value: "product", label: L("product") }] }} value={by} onChange={setBy} />
          </label>
          {by === "scheme" ? (
            <label className={labelClass}>
              {L("scheme_code")}
              <Field field={{ type: "select", blank: L("choose"), options: coded("schemes")(c) }} value={form.scheme_code} onChange={set("scheme_code")} />
            </label>
          ) : (
            <>
              <label className={labelClass}>
                {L("product_kind")}
                <Field field={{ type: "select", blank: L("choose"), options: codes("product_kinds")(c) }} value={form.product_kind} onChange={(v) => setForm((f) => ({ ...f, product_kind: v, product_id: "" }))} />
              </label>
              <label className={labelClass}>
                {L("product")}
                <Field field={{ type: "select", blank: L("choose"), options: (c.products?.[form.product_kind] ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` })) }} value={form.product_id} onChange={set("product_id")} />
              </label>
            </>
          )}
          <label className={labelClass}>
            {L("amount")}
            <Field field={{ type: "amount", placeholder: "500000" }} value={form.amount} onChange={set("amount")} />
          </label>
          <label className={labelClass}>
            {L("tenure")}
            <Field field={{ type: "int", placeholder: "12" }} value={form.tenure_value} onChange={set("tenure_value")} />
          </label>
          <label className={labelClass}>
            {L("tenure_unit")}
            <Field field={{ type: "select", options: codes("tenure_units")(c).length ? codes("tenure_units")(c) : [{ value: "MONTHS", label: "Months" }] }} value={form.tenure_unit} onChange={set("tenure_unit")} />
          </label>
          <label className={labelClass}>
            {L("booking_date")}
            <Field field={{ type: "date" }} value={form.booking_date} onChange={set("booking_date")} />
          </label>
          <label className={labelClass}>
            {L("birth_date")}
            <Field field={{ type: "date" }} value={form.birth_date} onChange={set("birth_date")} />
          </label>
        </div>
        <Button className="mt-3" icon={Calculator} loading={busy} disabled={!ready} disabledReason={L("Fill the scheme or product, amount and tenure.")} onClick={run}>
          {L("Simulate")}
        </Button>
      </Section>
      {result && (
        <>
          {(result.problems ?? []).length > 0 && (
            <ul className="mb-4 list-disc rounded-xl border border-red-200 bg-red-50 px-3 py-2 pl-7 text-xs font-semibold text-red-700">
              {result.problems.map((p) => (
                <li key={String(p)}>{typeof p === "string" ? p : p.message}</li>
              ))}
            </ul>
          )}
          <Section title={L("Rate chosen")} className="mb-4">
            <RateChoice choice={result.rate_selection} />
            {(result.notes ?? []).map((n) => (
              <p key={n} className="mt-2 text-xs text-muted-foreground">{n}</p>
            ))}
          </Section>
          {calc && (
            <Section title={L("Interest")} className="mb-4">
              <Facts
                className="mb-3"
                rows={[
                  [L("principal"), calc.principal],
                  [L("interest"), calc.interest],
                  [L("maturity_value"), calc.maturity_value],
                  [L("method"), words(calc.method)],
                  [L("day_count"), calc.day_count],
                  [L("days"), calc.days],
                ]}
              />
              {(calc.periods ?? []).length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <SimpleTable columns={[L("from"), L("to"), L("days"), L("opening_balance"), L("rate"), L("interest"), L("capitalised"), L("closing_balance")]}>
                    <tbody>
                      {calc.periods.map((p) => (
                        <tr key={p.from} className="border-b border-border/50 text-xs tabular-nums last:border-0">
                          <td className="px-3 py-1.5 whitespace-nowrap">{accountDate(p.from)}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{accountDate(p.to)}</td>
                          <td className="px-3 py-1.5">{p.days}</td>
                          <td className="px-3 py-1.5">{p.opening_balance}</td>
                          <td className="px-3 py-1.5">{pct(p.rate)}</td>
                          <td className="px-3 py-1.5">{p.interest}</td>
                          <td className="px-3 py-1.5">{p.capitalised}</td>
                          <td className="px-3 py-1.5">{p.closing_balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </SimpleTable>
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function AccountRate({ row, onBack }) {
  const L = useL();
  const [r, setR] = useState(row);
  useEffect(() => {
    accountApi
      .get({ account_kind: row.account_kind, account_id: row.account_id })
      .then((x) => setR(rowsOf(x)[0] ?? x?.data ?? row))
      .catch((e) => notifications.error(e.message));
  }, [row]);
  const q = r.conditions?.query ?? {};
  const params = Object.entries(q.Params ?? {});
  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {L("Back to accounts")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-black">{r.account_ref}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{[words(r.account_kind), r.owner_name || `${words(r.owner_kind)} #${r.owner_id}`, r.inst_profile_name].filter(Boolean).join(" · ")}</p>
        <Facts
          className="mt-3"
          rows={[
            [L("current_rate"), pct(r.current_rate)],
            [L("original_rate"), pct(r.original_rate)],
            [L("scheme_code"), `${r.scheme_code} · ${r.scheme_name}`],
            [L("slab"), r.slab_code],
            [L("rate_type"), words(r.rate_type)],
            [L("calculation_type"), words(r.calculation_type)],
            [L("day_count"), r.day_count],
            [L("rate_change_rule"), words(r.rate_change_rule)],
            [L("effective_date"), accountDate(r.effective_date)],
            r.next_reset_date && [L("next_reset_date"), accountDate(r.next_reset_date)],
            r.benchmark_code && [L("benchmark_code"), `${r.benchmark_code} ${pct(r.benchmark_rate)} + ${pct(r.spread)}`],
            r.override_rate && [L("override_rate"), `${pct(r.override_rate)} · ${r.override_reason}`],
          ]}
        />
      </div>
      <Section title={L("Booking conditions")} className="mb-4">
        <Facts
          rows={[
            [L("amount"), q.Amount],
            [L("tenure"), `${q.TenureValue ?? "—"} ${words(q.TenureUnit)}`],
            q.Gender && [L("gender"), words(q.Gender)],
            q.AgeCategory && [L("age_category"), words(q.AgeCategory)],
            ...params.map(([k, v]) => [words(k), words(v)]),
          ]}
        />
      </Section>
      <Section title={L("Rate chosen at booking")} className="mb-4">
        <RateChoice choice={r.conditions?.choice} />
      </Section>
      <Section title={L("Revisions")}>
        {(r.revisions ?? []).length ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <SimpleTable columns={[L("effective_date"), L("old_rate"), L("new_rate"), L("reason")]}>
              <tbody>
                {r.revisions.map((v, i) => (
                  <tr key={i} className="border-b border-border/50 text-xs last:border-0">
                    <td className="px-3 py-1.5">{accountDate(v.effective_date ?? v.effective_from)}</td>
                    <td className="px-3 py-1.5">{pct(v.old_rate)}</td>
                    <td className="px-3 py-1.5">{pct(v.new_rate ?? v.rate)}</td>
                    <td className="px-3 py-1.5">{v.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </SimpleTable>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{L("The rate has not changed since booking.")}</p>
        )}
      </Section>
    </div>
  );
}

export function AccountInterestInquiry() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [open, setOpen] = useState(null);
  const list = useServerList({ api: accountApi.listPath, call: accountApi.list, describe: false, enabled: !open });
  if (!can("View")) return <NoAccess />;
  if (open) return <AccountRate row={open} onBack={() => setOpen(null)} />;
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("accountInterestInquiry")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("The rate each account got at booking, and its revisions.")}</p>
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("accountInterestInquiry")}
        emptyTitle={L("No account rates yet")}
        columns={[
          { key: "account_ref", label: L("account"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpen(r)}>{r.account_ref}<span className="block text-[10px] font-normal text-muted-foreground">{words(r.account_kind)}</span></button> },
          { key: "owner_name", label: L("owner"), render: (r) => cell(r.owner_name || `${words(r.owner_kind)} #${r.owner_id}`) },
          { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(r.scheme_code) },
          { key: "current_rate", label: L("current_rate"), render: (r) => cell(pct(r.current_rate)) },
          { key: "original_rate", label: L("original_rate"), render: (r) => cell(pct(r.original_rate)) },
          { key: "rate_type", label: L("rate_type"), render: (r) => cell(words(r.rate_type)) },
          { key: "effective_date", label: L("effective_date"), render: (r) => cell(accountDate(r.effective_date)) },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpen(r)} /> },
        ]}
      />
    </div>
  );
}

export function InterestRateHistory() {
  const L = useL();
  const can = usePagePermission();
  const list = useServerList({ api: historyApi.listPath, call: historyApi.list, describe: false });
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("interestRateHistory")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("Every approved version of every rate slab over time.")}</p>
      <ListTable
        list={list}
        rowKey={(r) => `${r.code}:${r.version}`}
        title={L("interestRateHistory")}
        emptyTitle={L("No rate history yet")}
        columns={[
          { key: "code", label: L("slab"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b><span className="block font-mono text-[10px] text-muted-foreground">{r.code} · v{r.version}</span></span> },
          { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(r.scheme_code) },
          { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate)) },
          { key: "effective_from", label: L("effective_from"), render: (r) => cell(accountDate(r.effective_from)) },
          { key: "effective_to", label: L("effective_to"), render: (r) => cell(r.effective_to ? accountDate(r.effective_to) : L("open")) },
          { key: "state", label: L("state"), render: (r) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.state === "CURRENT" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{words(r.state)}</span> },
          { key: "proposed_by", label: L("proposed_by"), render: (r) => cell(r.proposed_by) },
          { key: "approved_by", label: L("approved_by"), render: (r) => cell(r.approved_by) },
          { key: "approved_at", label: L("approved_on"), render: (r) => cell(r.approved_at ? accountDate(r.approved_at) : "—") },
        ]}
      />
    </div>
  );
}


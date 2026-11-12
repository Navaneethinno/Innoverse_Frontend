import { API_ENDPOINTS } from "@/Utils/Constant";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { Facts, NarrationDialog, Section, inputClass, labelClass, ratePct } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { OpDialog, RowsTable, first, words as cbsWords } from "@/Components/InnoCBS/cbsOps";

// InnoCBS > Interest Rate Management (Admin 19).
export const BASE = API_ENDPOINTS.CBS_MODULES.INTEREST;

export const schemeApi = recordApi(`${BASE}/scheme`);

export const ageApi = recordApi(`${BASE}/age_category`);

export const paramApi = recordApi(`${BASE}/parameter`);

export const benchmarkApi = recordApi(`${BASE}/benchmark`);

export const rateApi = recordApi(`${BASE}/rate`, ["matrix"]);

export const mappingApi = recordApi(`${BASE}/mapping`);

export const resetApi = calls(`${BASE}/reset`, ["run"]);

export const approvalApi = calls(`${BASE}/approval`, ["list"]);

export const simulateApi = { ...calls(BASE, ["simulate"]), options: (b = {}) => calls(`${BASE}/simulate`, ["options"]).options(b) };

export const accountApi = calls(`${BASE}/account`, ["get", "list"]);

export const historyApi = calls(`${BASE}/history`, ["list"]);

export const words = cbsWords;

export const codes = (key) => (c) => (c[key] ?? []).map((v) => ({ value: v, label: words(v) }));

export const coded = (key) => (c) => (c[key] ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` }));

export const useL = () => {
  const { t } = useTranslation("record");
  return (key) => (/\s/.test(String(key)) ? key : t(`ir_${key}`, { defaultValue: words(key) }));
};

export const pct = (v) => (v === "" || v == null ? "—" : ratePct(v));

export const cell = (v) => <span className="text-xs">{v === "" || v == null ? "—" : typeof v === "string" && /^-?\d+\.\d+$/.test(v) ? Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v}</span>;

// The values of one parameter (a list, or bands with min / max).
export function ParameterValues({ value, onChange, band }) {
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

// Run the floating-rate reset for a day (the INTEREST_RESET job does it daily).
export function ResetRun() {
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
      const d = first(r);
      notifications.success(d?.accounts_checked != null ? `${d.accounts_checked} ${L("accounts checked")}, ${d.accounts_repriced} ${L("repriced")}` : (r?.message ?? L("Reset run done")));
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

export const param = (key) => (c) => (c.parameters?.[key] ?? []).map((x) => ({ value: x.code, label: x.name }));

// Interest changes waiting for a second user (schemes, slabs, age categories,
// parameters, benchmarks, mappings). Each row names its record route; the
// decision goes to <route>/auth or /deauth, and `actions` says who may decide.
export const routeApi = (route) => calls(route, ["get", "auth", "deauth"]);

export const impactApi = calls(`${BASE}/rate`, ["impact"]);

export function ApprovalView({ row, onClose }) {
  const L = useL();
  const [d, setD] = useState(null);
  const [impact, setImpact] = useState(null);
  useEffect(() => {
    routeApi(row.route)
      .get({ id: row.id })
      .then((r) => setD(first(r)))
      .catch((e) => notifications.error(e.message));
    if (["SCHEME", "RATE", "BENCHMARK"].includes(row.type))
      impactApi
        .impact({ kind: row.type, id: row.id })
        .then((r) => setImpact(first(r)))
        .catch(() => {});
  }, [row]);
  const facts = (o) => Object.entries(o ?? {}).filter(([, v]) => typeof v !== "object" || v === null).map(([k, v]) => [L(k), v === "" || v == null ? "—" : String(v)]);
  return (
    <OpDialog size="lg" title={`${words(row.type)} · ${row.name ?? row.code}`} fields={[]} confirmLabel={L("Close")} run={async () => null} onClose={onClose} onDone={onClose}>
      {() =>
        !d ? null : (
          <div className="grid gap-4">
            {d.setup && (
              <Section title={L("In force")}>
                <Facts rows={facts(d.setup)} />
              </Section>
            )}
            {d.pending?.setup && (
              <Section title={`${L("Proposed")} · ${words(d.pending.action)}`}>
                <Facts rows={facts(d.pending.setup).map(([k, v]) => (d.setup && String(d.setup[Object.keys(d.pending.setup).find((x) => L(x) === k)] ?? "—") !== v ? [k, v, "text-amber-800"] : [k, v]))} />
              </Section>
            )}
            {impact && (
              <Section title={L("What approving touches")}>
                <Facts
                  className="mb-3"
                  rows={[
                    [L("Accounts"), impact.accounts_total],
                    [L("Will reprice"), impact.accounts_repriced, impact.accounts_repriced ? "text-amber-800" : undefined],
                    [L("Keep their rate"), impact.accounts_preserved],
                    [L("schemes"), (impact.schemes ?? []).join(", ") || "—"],
                  ]}
                />
                {(impact.products ?? []).length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-bold text-muted-foreground">{L("Products")}</p>
                    <RowsTable rows={impact.products} columns={[{ key: "product_kind", label: L("kind"), render: (p) => words(p.product_kind) }, { key: "product_code", label: L("code") }, { key: "product_name", label: L("name") }, { key: "scheme_code", label: L("scheme") }]} />
                  </div>
                )}
                <RowsTable
                  rows={impact.accounts}
                  empty={L("No accounts are on these schemes.")}
                  columns={[
                    { key: "account_ref", label: L("account") },
                    { key: "account_kind", label: L("kind"), render: (a) => words(a.account_kind) },
                    { key: "scheme_code", label: L("scheme") },
                    { key: "current_rate", label: L("current_rate"), render: (a) => pct(a.current_rate) },
                    { key: "rate_change_rule", label: L("rate_change_rule"), render: (a) => words(a.rate_change_rule) },
                    { key: "treatment", label: L("treatment"), render: (a) => <span className={a.treatment === "REPRICE" ? "font-bold text-amber-800" : ""}>{words(a.treatment)}</span> },
                  ]}
                />
                {impact.accounts_total > (impact.accounts ?? []).length && <p className="mt-2 text-xs text-muted-foreground">{`${L("and")} ${impact.accounts_total - impact.accounts.length} ${L("more")}`}</p>}
              </Section>
            )}
          </div>
        )
      }
    </OpDialog>
  );
}

export const r_inst = (L) => ({ key: "inst_profile_name", label: L("institution"), render: (r) => cell(r.inst_profile_name) });

export function Candidates({ rows }) {
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

export function RateChoice({ choice }) {
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

export function AccountRate({ row, onBack }) {
  const L = useL();
  const [r, setR] = useState(row);
  useEffect(() => {
    accountApi
      .get({ account_kind: row.account_kind, account_id: row.account_id })
      .then((x) => setR(rowsOf(x)[0] ?? x?.data ?? row))
      .catch((e) => notifications.error(e.message));
  }, [row]);
  const q = r.conditions?.query ?? {};
  const params = Object.entries(q.params ?? {});
  const slabRate = r.conditions?.choice?.rate;
  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {L("Back to accounts")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-black">{r.account_ref}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{[words(r.account_kind), r.account_name, r.owner_name, r.inst_profile_name].filter(Boolean).join(" · ")}</p>
        <p className="mt-3 text-2xl font-black text-primary">
          {L("Applied rate")} {pct(r.current_rate)}
        </p>
        {r.override_rate && slabRate != null && <p className="text-xs text-muted-foreground">{`${L("Scheme slab rate")} ${pct(slabRate)} · ${L("overridden")}: ${r.override_reason}`}</p>}
        <Facts
          className="mt-3"
          rows={[
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
          ]}
        />
      </div>
      <Section title={L("Booking conditions")} className="mb-4">
        <Facts
          rows={[
            [L("on"), q.on ? accountDate(q.on) : "—"],
            [L("amount"), q.amount],
            [L("tenure"), `${q.tenure_value ?? "—"} ${words(q.tenure_unit)}`],
            q.birth_date && [L("birth_date"), accountDate(q.birth_date)],
            q.gender && [L("gender"), words(q.gender)],
            q.age_category && [L("age_category"), words(q.age_category)],
            q.currency && [L("currency"), q.currency],
            q.branch_id ? [L("branch"), `#${q.branch_id}`] : null,
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
            <SimpleTable columns={[L("revised_on"), L("old_rate"), L("new_rate"), L("benchmark_rate"), L("spread"), L("reason"), L("by")]}>
              <tbody>
                {r.revisions.map((v, i) => (
                  <tr key={i} className="border-b border-border/50 text-xs last:border-0">
                    <td className="px-3 py-1.5">{accountDate(v.revised_on)}</td>
                    <td className="px-3 py-1.5">{pct(v.old_rate)}</td>
                    <td className="px-3 py-1.5">{pct(v.new_rate)}</td>
                    <td className="px-3 py-1.5">{pct(v.benchmark_rate)}</td>
                    <td className="px-3 py-1.5">{pct(v.spread)}</td>
                    <td className="px-3 py-1.5">{words(v.reason)}</td>
                    <td className="px-3 py-1.5">{v.actor}</td>
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

// ---------- Rate matrix ----------

export const matrixApi = calls(`${BASE}/rate`, ["matrix", "matrix_view"]);

export const cellInput = "w-full min-w-24 rounded-lg border border-border bg-card px-2 py-1 text-xs tabular-nums outline-none focus:border-primary";

// A whole rate card at once: columns are conditions, rows tenure bands, and
// each filled cell proposes one slab (each approved by a checker).
export function MatrixEntry() {
  const L = useL();
  const can = usePagePermission();
  const [open, setOpen] = useState(null);
  const [c, setC] = useState({});
  const [grid, setGrid] = useState(null);
  useEffect(() => {
    if (!open) return;
    rateApi
      .options({})
      .then((r) => setC(first(r) ?? {}))
      .catch(() => {});
  }, [open]);
  const schemes = (c.schemes ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` }));
  const opt = (list) => [{ value: "", label: "—" }, ...list];
  const param = (k) => opt((c.parameters?.[k] ?? []).map((x) => ({ value: x.code, label: x.name })));
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen("view")}>
        {L("View rate card")}
      </Button>
      {can("Add") && (
        <Button size="sm" variant="secondary" onClick={() => setOpen("add")}>
          {L("Enter a rate card")}
        </Button>
      )}
      {open === "view" && (
        <OpDialog
          size="xl"
          title={L("Rate card in force")}
          fields={[
            { key: "scheme_code", label: L("scheme_code"), type: "select", required: true, options: schemes },
            { key: "on", label: L("on"), type: "date" },
          ]}
          confirmLabel={L("Show")}
          run={(x) => matrixApi.matrix_view({ scheme_code: x.scheme_code, ...(x.on ? { on: x.on } : {}) })}
          onClose={() => (setOpen(null), setGrid(null))}
          onDone={(r) => setGrid(first(r))}
        >
          {() =>
            grid && (
              <div className="mb-3 overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-2 py-1.5 text-left">{L("Tenure")}</th>
                      {(grid.columns ?? []).map((h) => (
                        <th key={h} className="px-2 py-1.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(grid.rows ?? []).map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-2 py-1.5 font-semibold">{typeof row === "object" ? row.label : row}</td>
                        {(grid.columns ?? []).map((_, j) => (
                          <td key={j} className="px-2 py-1.5 text-center tabular-nums" title={grid.slab_codes?.[i]?.[j] ?? ""}>
                            {grid.rates?.[i]?.[j] ? pct(grid.rates[i][j]) : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </OpDialog>
      )}
      {open === "add" && (
        <OpDialog
          size="xl"
          childrenAfter
          title={L("Enter a rate card")}
          hint={L("Each filled cell proposes one rate slab, approved by a checker. Leave a cell empty for no slab.")}
          fields={[
            { key: "scheme_code", label: L("scheme_code"), type: "select", required: true, options: schemes },
            { key: "tenure_unit", label: L("tenure_unit"), type: "select", required: true, options: (c.tenure_units ?? []).map((v) => ({ value: v, label: words(v) })) },
            { key: "effective_from", label: L("effective_from"), type: "date", required: true },
            { key: "narration", label: L("narration") },
          ]}
          initial={{ tenure_unit: "MONTHS", columns: [{ label: "Regular" }], rows: [{ label: "", min_tenure: "", max_tenure: "", min_amount: "", max_amount: "", rates: [""] }] }}
          needs={(x) => x.columns.length && x.rows.length && x.rows.every((r) => r.min_tenure !== "" && r.max_tenure !== "") && x.rows.some((r) => r.rates.some(Boolean))}
          confirmLabel={L("Submit for approval")}
          run={(x) =>
            matrixApi.matrix({
              scheme_code: x.scheme_code,
              tenure_unit: x.tenure_unit,
              effective_from: x.effective_from,
              effective_to: "",
              narration: x.narration,
              columns: x.columns.map((col) => Object.fromEntries(Object.entries({ ...col, priority: col.priority === "" || col.priority == null ? undefined : Number(col.priority) }).filter(([, v]) => v !== "" && v != null))),
              rows: x.rows.map((r) => ({ label: r.label || `${r.min_tenure}–${r.max_tenure}`, min_tenure: Number(r.min_tenure), max_tenure: Number(r.max_tenure), min_amount: r.min_amount, max_amount: r.max_amount, rates: x.columns.map((_, j) => r.rates[j] ?? "") })),
            })
          }
          onClose={() => setOpen(null)}
          onDone={(r) => {
            const d = first(r);
            if (d?.count != null) notifications.success(`${d.count} ${L("slabs proposed")}`);
            setOpen(null);
          }}
        >
          {(form, setForm) => {
            const setCol = (j, patch) => setForm((x) => ({ ...x, columns: x.columns.map((col, k) => (k === j ? { ...col, ...patch } : col)) }));
            const setRow = (i, patch) => setForm((x) => ({ ...x, rows: x.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)) }));
            const sel = (label, value, onChange, options) => (
              <select aria-label={label} className={cellInput} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value ? o.label : label}
                  </option>
                ))}
              </select>
            );
            return (
              <div className="mb-3 overflow-x-auto rounded-xl border border-border p-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="w-64 px-1 text-left align-bottom">{L("Tenure band")}</th>
                      {form.columns.map((col, j) => (
                        <th key={j} className="w-36 px-1 align-top">
                          <div className="grid gap-1">
                            <input className={cellInput} placeholder={L("label")} value={col.label ?? ""} onChange={(e) => setCol(j, { label: e.target.value })} />
                            {sel(L("age_category"), col.age_category, (v) => setCol(j, { age_category: v }), opt((c.age_categories ?? []).map((a) => ({ value: a.code, label: a.name }))))}
                            {sel(L("gender"), col.gender, (v) => setCol(j, { gender: v }), param("GENDER"))}
                            {sel(L("customer_segment"), col.customer_segment, (v) => setCol(j, { customer_segment: v }), param("CUSTOMER_SEGMENT"))}
                            {sel(L("risk_category"), col.risk_category, (v) => setCol(j, { risk_category: v }), param("RISK_CATEGORY"))}
                            <input className={cellInput} placeholder={L("priority")} value={col.priority ?? ""} onChange={(e) => setCol(j, { priority: e.target.value.replace(/\D/g, "") })} />
                            {form.columns.length > 1 && (
                              <button type="button" className="text-[10px] text-red-600" onClick={() => setForm((x) => ({ ...x, columns: x.columns.filter((_, k) => k !== j), rows: x.rows.map((r) => ({ ...r, rates: r.rates.filter((_, k) => k !== j) })) }))}>
                                {L("remove")}
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-1 align-top">
                        <Button size="sm" variant="ghost" onClick={() => setForm((x) => ({ ...x, columns: [...x.columns, { label: "" }], rows: x.rows.map((r) => ({ ...r, rates: [...r.rates, ""] })) }))}>
                          + {L("Column")}
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.rows.map((r, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-1 py-1">
                          <div className="grid grid-cols-2 gap-1">
                            <input className={cellInput} placeholder={L("min")} value={r.min_tenure} onChange={(e) => setRow(i, { min_tenure: e.target.value.replace(/\D/g, "") })} />
                            <input className={cellInput} placeholder={L("max")} value={r.max_tenure} onChange={(e) => setRow(i, { max_tenure: e.target.value.replace(/\D/g, "") })} />
                            <input className={cellInput} placeholder={L("Min amount")} value={r.min_amount} onChange={(e) => setRow(i, { min_amount: e.target.value.replace(/[^\d.]/g, "") })} />
                            <input className={cellInput} placeholder={L("Max amount")} value={r.max_amount} onChange={(e) => setRow(i, { max_amount: e.target.value.replace(/[^\d.]/g, "") })} />
                          </div>
                        </td>
                        {form.columns.map((_, j) => (
                          <td key={j} className="px-1 py-1 text-center">
                            <input className={cellInput} placeholder="%" value={r.rates[j] ?? ""} onChange={(e) => setRow(i, { rates: form.columns.map((__, k) => (k === j ? e.target.value.replace(/[^\d.]/g, "") : (r.rates[k] ?? ""))) })} />
                          </td>
                        ))}
                        <td className="px-1">
                          {form.rows.length > 1 && (
                            <button type="button" className="text-[10px] text-red-600" onClick={() => setForm((x) => ({ ...x, rows: x.rows.filter((_, k) => k !== i) }))}>
                              {L("remove")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button className="mt-2" size="sm" variant="ghost" onClick={() => setForm((x) => ({ ...x, rows: [...x.rows, { label: "", min_tenure: "", max_tenure: "", min_amount: "", max_amount: "", rates: x.columns.map(() => "") }] }))}>
                  + {L("Tenure band")}
                </Button>
              </div>
            );
          }}
        </OpDialog>
      )}
    </>
  );
}

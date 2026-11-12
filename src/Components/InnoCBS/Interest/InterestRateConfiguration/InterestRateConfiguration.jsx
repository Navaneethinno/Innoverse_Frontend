import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { RowsInput } from "@/Components/InnoCBS/cbsOps";
import { MatrixEntry, ResetRun, cell, coded, codes, param, pct, rateApi, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function InterestRateConfiguration() {
  const L = useL();
  const opt = (key, from) => ({ key, label: L(key), type: "select", options: param(from) });
  return (
    <RecordScreen
      api={rateApi}
      title={L("interestRateConfiguration")}
      subtitle={L("Rate slabs of a scheme: tenure, amount and customer conditions to a rate. If no slab matches, a booking is refused.")}
      effectiveDated
      pageActions={
        <div className="flex flex-wrap gap-2">
          <MatrixEntry />
          <ResetRun />
        </div>
      }
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
        { key: "branch_id", label: L("branch"), type: "select", blank: L("Every branch"), options: (c) => (c.branches ?? []).map((b) => ({ value: String(b.id), label: `${b.code} · ${b.name}` })) },
        {
          key: "conditions",
          label: L("Other conditions"),
          type: "custom",
          from: (s0) => Object.entries(s0.conditions ?? {}).map(([parameter, value]) => ({ parameter, value })),
          render: (v, set, _form, c) => {
            const own = ["CUSTOMER_SEGMENT", "RISK_CATEGORY", "CREDIT_SCORE_BAND", "COLLATERAL_TYPE", "RELATIONSHIP", "LOAN_TYPE", "SPECIAL_SCHEME", "GENDER"];
            const params = Object.keys(c?.parameters ?? {}).filter((p) => !own.includes(p));
            return (
              <RowsInput
                value={v}
                onChange={set}
                blank={() => ({ parameter: "", value: "" })}
                addLabel={L("Add a condition")}
                columns={[
                  { key: "parameter", label: L("parameter"), type: "select", options: params.map((p) => ({ value: p, label: words(p) })) },
                  { key: "value", label: L("value"), type: "select", options: [...new Set(params.flatMap((p) => (c.parameters[p] ?? []).map((x) => JSON.stringify({ value: x.code, label: `${words(p)} · ${x.name}` }))))].map((j) => JSON.parse(j)) },
                ]}
              />
            );
          },
        },
        { key: "priority", label: L("priority"), type: "int", hint: L("Higher wins when two slabs match equally.") },
        { key: "effective_from", label: L("effective_from"), type: "date", required: true },
        { key: "remarks", label: L("remarks"), type: "textarea" },
      ]}
      bodyOf={(x) => ({
        ...x,
        branch_id: Number(x.branch_id || 0),
        conditions: Object.fromEntries((x.conditions ?? []).filter((c) => c.parameter && c.value).map((c) => [c.parameter, c.value])),
        priority: Number(x.priority || 0),
        min_tenure: x.min_tenure === "" ? null : Number(x.min_tenure),
        max_tenure: x.max_tenure === "" ? null : Number(x.max_tenure),
      })}
    />
  );
}

import { cell, codes, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { reserveReqApi, useF } from "../treasuryShared";

export function StatutoryReserves() {
  const L = useL();
  const f = useF();
  const ids = (key) => ({ key, label: L(key), type: "multi", options: (c) => (c.gl_accounts ?? []).map((g) => ({ value: g.id, label: `${g.gl_code} · ${g.name}` })) });
  return (
    <RecordScreen
      api={reserveReqApi}
      title={L("statutoryReserves")}
      subtitle={L("Reserve requirements (CRR, SLR...): basis, percentage, eligible assets, tolerance and penalty.")}
      effectiveDated
      columns={[
        { key: "requirement_type", label: L("requirement_type"), render: (r) => cell(sv(r, "requirement_type")) },
        { key: "required_percent", label: L("required_percent"), render: (r) => cell(pct(sv(r, "required_percent"))) },
        { key: "maintenance_period", label: L("maintenance_period"), render: (r) => cell(words(sv(r, "maintenance_period"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "CRR" }),
        f("name", "text", { required: true }),
        f("requirement_type", "select", { required: true, options: codes("requirement_types") }),
        f("regulatory_authority", "text"),
        f("required_percent", "percent", { required: true }),
        f("basis_source", "select", { required: true, options: codes("basis_sources") }),
        ids("basis_gl_ids"),
        ids("exempt_gl_ids"),
        f("exempt_amount", "amount"),
        f("eligible_assets", "multi", { options: codes("eligible_assets") }),
        ids("eligible_cash_gl_ids"),
        f("eligible_security_types", "multi", { options: codes("security_types") }),
        f("maintenance_period", "select", { options: codes("maintenance_periods") }),
        f("reporting_day", "text"),
        f("shortfall_tolerance_percent", "percent"),
        f("alert_buffer_percent", "percent"),
        f("penalty_rate", "rate"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({ ...x, ...Object.fromEntries(["basis_gl_ids", "exempt_gl_ids", "eligible_cash_gl_ids"].map((k) => [k, (x[k] ?? []).map(Number)])) })}
    />
  );
}

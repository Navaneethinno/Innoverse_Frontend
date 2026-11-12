import { cell, codes, dateCell, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, glChoices, securityApi, toNum, useF } from "../treasuryShared";

export function Securities() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={securityApi}
      title={L("securities")}
      subtitle={L("Security master: equity, bonds, T-bills, CP, CD; coupon, maturity and accounting classification.")}
      effectiveDated
      columns={[
        { key: "instrument_type", label: L("instrument_type"), render: (r) => cell(words(sv(r, "instrument_type"))) },
        { key: "classification", label: L("classification"), render: (r) => cell(sv(r, "classification")) },
        { key: "coupon_rate", label: L("coupon_rate"), render: (r) => cell(pct(sv(r, "coupon_rate"))) },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(sv(r, "maturity_date")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "NTB-182" }),
        f("name", "text", { required: true }),
        f("instrument_type", "select", { required: true, options: codes("instrument_types") }),
        f("classification", "select", { required: true, options: codes("classifications") }),
        f("isin", "text"),
        f("issuer_code", "text"),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("face_value", "amount"),
        f("coupon_rate", "rate"),
        f("coupon_frequency", "select", { options: codes("coupon_frequencies") }),
        f("day_count", "select", { options: codes("day_counts") }),
        f("issue_date", "date"),
        f("maturity_date", "date"),
        f("listed", "bool"),
        f("exchange", "text", { showIf: (x) => x.listed }),
        f("rating", "text"),
        f("industry", "text"),
        f("list_status", "select", { options: codes("list_statuses") }),
        f("gl_account_id", "select", { label: L("GL account"), options: (c) => glChoices(c.gl_accounts) }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["gl_account_id"])}
    />
  );
}

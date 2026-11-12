import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, exposureLimitApi, useF } from "../treasuryShared";

export function ExposureLimits() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={exposureLimitApi}
      title={L("exposureLimits")}
      subtitle={L("Limits by group, country, currency, industry, instrument and the equity book. BLOCK refuses a booking over it; ALERT only warns.")}
      effectiveDated
      columns={[
        { key: "limit_kind", label: L("limit_kind"), render: (r) => cell(`${words(sv(r, "limit_kind"))} · ${sv(r, "limit_key") ?? ""}`) },
        { key: "limit_amount", label: L("limit_amount"), render: (r) => cell(sv(r, "limit_amount")) },
        { key: "breach_action", label: L("breach_action"), render: (r) => cell(words(sv(r, "breach_action"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "CCY-USD" }),
        f("name", "text", { required: true }),
        f("limit_kind", "select", { required: true, options: codes("limit_kinds") }),
        f("limit_key", "select", { hint: L("Not needed for the equity total."), options: () => [], optionsFor: (c, x) => choices(c.limit_keys?.[x.limit_kind]), showIf: (x) => x.limit_kind !== "EQUITY_TOTAL" }),
        f("limit_amount", "amount", { required: true }),
        f("warn_percent", "percent"),
        f("breach_action", "select", { required: true, options: codes("breach_actions") }),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}

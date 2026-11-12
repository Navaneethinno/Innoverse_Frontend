import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { Status } from "@/Components/InnoCBS/OpsList";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, counterpartyApi, toNum, useF } from "../treasuryShared";

export function Counterparties() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={counterpartyApi}
      title={L("counterparties")}
      subtitle={L("Banks, institutions, companies and brokers: rating, list status and exposure limit. A downgrade raises an alert.")}
      effectiveDated
      columns={[
        { key: "counterparty_type", label: L("counterparty_type"), render: (r) => cell(words(sv(r, "counterparty_type"))) },
        { key: "rating", label: L("rating"), render: (r) => cell(sv(r, "rating")) },
        { key: "list_status", label: L("list_status"), render: (r) => <Status code={sv(r, "list_status")} /> },
        { key: "exposure_limit", label: L("exposure_limit"), render: (r) => cell(sv(r, "exposure_limit")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "ZENITH" }),
        f("name", "text", { required: true }),
        f("counterparty_type", "select", { required: true, options: codes("counterparty_types") }),
        f("roles", "multi", { options: codes("roles") }),
        f("list_status", "select", { required: true, options: codes("list_statuses") }),
        f("group_code", "text"),
        f("country", "text", { placeholder: "NG" }),
        f("industry", "text"),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("swift_code", "text"),
        f("rating", "text"),
        f("rating_rank", "int", { hint: L("1 is the best; a higher number is a downgrade.") }),
        f("rating_agency", "text"),
        f("rating_date", "date"),
        f("exposure_limit", "amount"),
        f("warn_percent", "percent"),
        f("contact_email", "text"),
        f("contact_phone", "text"),
        f("branch_details", "textarea"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["rating_rank"])}
    />
  );
}

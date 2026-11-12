import { RowsInput, cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, alertRuleApi, toNum, useF } from "../treasuryShared";
import { csv, csvField } from "@/Components/InnoTreasury/treasuryRecordsShared";

export function AlertRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={alertRuleApi}
      title={L("alertRules")}
      subtitle={L("Which events alert, how many days before, on which channels, and who is told at each escalation level.")}
      effectiveDated
      columns={[
        { key: "kind", label: L("kind"), render: (r) => cell(words(sv(r, "kind"))) },
        { key: "offsets", label: L("Days before"), sortable: false, render: (r) => cell((sv(r, "offsets") ?? []).join(", ")) },
        { key: "channels", label: L("channels"), sortable: false, render: (r) => cell((sv(r, "channels") ?? []).map(words).join(", ")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "MATURITIES" }),
        f("name", "text", { required: true }),
        f("kind", "select", { required: true, options: codes("kinds") }),
        { key: "event_types", label: L("event_types"), type: "multi", options: () => [], optionsFor: (c, x) => choices(c.event_types?.[x.kind] ?? c.event_types?.ANY), hint: L("Leave empty for every event of the kind.") },
        { ...csvField(L, "offsets", "90, 30, 7, 1, 0"), hint: L("Days before the event, comma separated.") },
        f("channels", "multi", { options: codes("channels") }),
        f("escalate_after_days", "int"),
        {
          key: "recipients",
          label: L("recipients"),
          type: "custom",
          render: (v, set, _x, c) => (
            <RowsInput
              value={(v ?? []).map((r) => ({ ...r, user_ids: Array.isArray(r.user_ids) ? String(r.user_ids[0] ?? "") : r.user_ids }))}
              onChange={set}
              blank={() => ({ level: "0", role: "", user_ids: "" })}
              columns={[
                { key: "level", label: L("level"), type: "int" },
                { key: "role", label: L("role"), type: "select", options: codes("escalation_roles")(c) },
                { key: "user_ids", label: L("User"), type: "select", options: choices(c?.users) },
              ]}
            />
          ),
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({
        ...toNum(["escalate_after_days"])(x),
        event_types: x.event_types ?? [],
        offsets: csv(x.offsets).map(Number),
        recipients: (x.recipients ?? []).map((r) => ({ level: Number(r.level || 0), role: r.role, user_ids: csv(r.user_ids).map(Number) })),
      })}
    />
  );
}

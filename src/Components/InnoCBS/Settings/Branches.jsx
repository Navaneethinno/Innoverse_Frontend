import { useTranslation } from "react-i18next";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { cbsBranchesApi } from "@/Services/Accounting/accounting.api";
import { RowsEditor } from "../Loans/loanShared";
import { SectionScreen } from "./SectionScreen";

// A saved branch keeps its code (branches are matched by code).
const toForm = (rows) => (rows ?? []).map((b) => ({ ...b, head_office_type: b.head_office_type ?? (b.head_office ? "OPERATIONAL" : ""), _saved: true }));
const toValue = (rows) =>
  rows.map((b) => ({
    code: b.code,
    name: String(b.name ?? "").trim(),
    address: String(b.address ?? "").trim(),
    // "" a branch; a head office is OPERATIONAL or ADMINISTRATIVE (no counters,
    // cash or loans there). The server sets head_office from it.
    head_office_type: b.head_office_type ?? "",
    // The most cash the branch may hold (tills and vaults, base currency);
    // above it the branch can't close its day. "0": no limit.
    cash_holding_limit: String(b.cash_holding_limit || "0"),
    status: b.status || "OPEN",
  }));
// One head office at least, one of each type, codes once.
function problemOf(t, rows) {
  if (rows.some((b) => !b.code || !String(b.name ?? "").trim())) return t("branchNeedsCodeName");
  if (new Set(rows.map((b) => b.code)).size !== rows.length) return t("branchCodeOnce");
  const types = rows.map((b) => b.head_office_type).filter(Boolean);
  if (rows.length && !types.length) return t("oneHeadOffice");
  if (new Set(types).size !== types.length) return t("headOfficeTypeOnce");
  return "";
}

// InnoCBS > Settings > Branches (menu 193): branches, head office, cash limits.
export function Branches() {
  const { t } = useTranslation("corebank");
  return (
    <SectionScreen api={cbsBranchesApi} fallbackTitle={t("tab_branches")} toForm={toForm} toValue={toValue} problemOf={problemOf}>
      {({ data, shown, editing, setForm }) => {
        const named = (list) => list.map((value) => ({ value, label: data.names?.[value] ?? value }));
        return (
          <>
            <p className="mb-1 text-xs text-muted-foreground">{t("branchesHint")}</p>
            <p className="mb-3 text-xs text-muted-foreground">{t("headOfficeTypesHint")}</p>
            <RowsEditor
              rows={shown ?? []}
              disabled={!editing}
              onChange={setForm}
              blank={() => ({ code: "", name: "", address: "", head_office_type: shown?.length ? "" : "OPERATIONAL", cash_holding_limit: "0", status: "OPEN" })}
              addLabel={t("addBranch")}
              columns="lg:grid-cols-6"
              fields={[
                { key: "code", label: <>{t("code")}<RequiredMark /></>, type: "code", disabledIf: (r) => r._saved },
                { key: "name", label: <>{t("name")}<RequiredMark /></> },
                { key: "address", label: t("address") },
                { key: "status", label: t("status"), type: "select", options: named(data.options?.branch_statuses ?? ["OPEN", "CLOSED"]) },
                { key: "head_office_type", label: t("branchType"), type: "select", options: named(data.options?.head_office_types ?? ["", "OPERATIONAL", "ADMINISTRATIVE"]) },
                { key: "cash_holding_limit", label: t("cashHoldingLimit"), type: "amount", disabledIf: (r) => r.head_office_type === "ADMINISTRATIVE" },
              ]}
            />
          </>
        );
      }}
    </SectionScreen>
  );
}

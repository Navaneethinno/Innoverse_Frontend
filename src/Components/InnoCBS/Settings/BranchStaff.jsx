import { useTranslation } from "react-i18next";
import { cbsBranchStaffApi } from "@/Services/Accounting/accounting.api";
import { accountDate } from "../Accounts/accountShared";
import { RowsEditor } from "../Loans/loanShared";
import { SectionScreen } from "./SectionScreen";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { useClientPage } from "@/Hooks/useClientPage";
import { Pager } from "@/Components/Common/Pager";

const administrative = (data) => (data?.branches ?? []).find((b) => b.head_office_type === "ADMINISTRATIVE")?.code;
const toValue = (rows) =>
  rows.map((r) => ({
    user_id: Number(r.user_id),
    branch_code: r.branch_code,
    loan_officer: Boolean(r.loan_officer),
    teller: Boolean(r.teller),
    vault_custodian: Boolean(r.vault_custodian),
    // Sees only their branch's accounts, applications and loans.
    own_branch_only: Boolean(r.own_branch_only),
  }));
// Each user once, at an open branch; no counters, cash or loans at the
// administrative head office.
function problemOf(t, rows, data) {
  const open = new Set((data?.branches ?? []).filter((b) => b.status !== "CLOSED").map((b) => b.code));
  if (rows.some((r) => !r.user_id || !open.has(r.branch_code))) return t("staffNeedsOpenBranch");
  const admin = administrative(data);
  if (admin && rows.some((r) => r.branch_code === admin && (r.teller || r.vault_custodian || r.loan_officer))) return t("adminOfficeNoRoles");
  if (new Set(rows.map((r) => String(r.user_id))).size !== rows.length) return t("staffOnce");
  return "";
}

// InnoCBS > Settings > Branch Staff (menu 206): each user's branch and roles.
export function BranchStaff() {
  const { t } = useTranslation("corebank");
  return (
    <SectionScreen api={cbsBranchStaffApi} fallbackTitle={t("tab_staff")} toValue={toValue} problemOf={problemOf}>
      {({ data, shown, editing, setForm }) => {
        const adminOffice = administrative(data);
        const rows = shown ?? [];
        const users = (data.users ?? []).map((u) => ({ value: String(u.id), label: u.name }));
        const branches = (data.branches ?? []).filter((b) => b.status !== "CLOSED").map((b) => ({ value: b.code, label: `${b.code} · ${b.name}` }));
        return (
          <>
            <p className="mb-1 text-xs text-muted-foreground">{t("staffHint")}</p>
            <p className="mb-3 text-xs text-muted-foreground">{t("vaultCustodianHint")}</p>
            <RowsEditor
              rows={rows.map((r) => ({ ...r, user_id: r.user_id ? String(r.user_id) : "" }))}
              disabled={!editing}
              onChange={setForm}
              blank={() => ({ user_id: "", branch_code: "", loan_officer: false, teller: false, vault_custodian: false })}
              addLabel={t("addStaff")}
              fields={[
                {
                  key: "user_id",
                  label: t("user"),
                  type: "select",
                  blank: t("choose"),
                  options: editing ? users : [...users, ...rows.filter((r) => !users.some((u) => u.value === String(r.user_id))).map((r) => ({ value: String(r.user_id), label: r.user_name }))],
                },
                { key: "branch_code", label: t("branch"), type: "select", blank: t("choose"), options: branches },
                { key: "loan_officer", label: t("loanOfficer"), type: "bool", disabledIf: (r) => r.branch_code === adminOffice },
                { key: "teller", label: t("teller"), type: "bool", disabledIf: (r) => r.branch_code === adminOffice },
                { key: "vault_custodian", label: t("vaultCustodian"), type: "bool", disabledIf: (r) => r.branch_code === adminOffice },
                { key: "own_branch_only", label: t("ownBranchOnly"), type: "bool" },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">{t("ownBranchOnlyHint")}</p>
            <StaffTransfers rows={data.staff_history ?? []} />
          </>
        );
      }}
    </SectionScreen>
  );
}

// Staff moved between branches (newest first): from where, to where, from when.
function StaffTransfers({ rows }) {
  const { t } = useTranslation("corebank");
  const sorted = [...rows].sort((x, y) => String(y.effective_from).localeCompare(String(x.effective_from)));
  const { rows: page, pager } = useClientPage(sorted);
  if (!rows.length) return null;
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{t("transfers")}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <SimpleTable columns={[t("user"), t("fromBranch"), t("toBranch"), t("effectiveFrom"), t("changedBy")]}>
          <tbody>
            {page.map((r, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-1.5 font-semibold">{r.user_name}</td>
                <td className="px-3 py-1.5">{r.from_branch || t("firstAttachment")}</td>
                <td className="px-3 py-1.5">{r.to_branch || t("removedFromBranch")}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{accountDate(r.effective_from)}</td>
                <td className="px-3 py-1.5">{r.changed_by ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
      </div>
      {pager && <Pager {...pager} className="mt-2" />}
    </div>
  );
}

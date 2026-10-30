import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { lendingAuthorityApi } from "@/Services/Loans/loans.api";
import { profilesApi } from "@/Services/UserManagement/profiles.api";
import { usersApi } from "@/Services/UserManagement/users.api";
import { notifications } from "@/Utils/Lib/notifications";
import { Section, labelClass } from "../../Deposits/depositShared";
import { Field } from "../../Loans/loanShared";

// Lending Regulatory Profile › Approval limits: who may approve how much.
// A user's own limit wins over their profile's; above it they forward the
// application. From the board amount, a board resolution is required. Once
// any user or profile limit is set, approval works by limits (one approval
// within the approver's limit), not by the product's approval matrix.
// Saved at once; edit and delete follow each row's `actions`.
export function ApprovalLimits({ scope }) {
  const { t } = useTranslation("loans");
  const can = usePagePermission();
  const [rows, setRows] = useState(null);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [board, setBoard] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    lendingAuthorityApi
      .list(scope({}))
      .then((r) => {
        const list = rowsOf(r);
        setRows(list);
        setBoard(list.find((x) => x.kind === "BOARD")?.maximum_amount ?? "");
      })
      .catch((e) => {
        setError(e.message);
        setRows([]);
      });
  }, [scope]);
  useEffect(() => load(), [load]);
  useEffect(() => {
    usersApi
      .list({ page: 1, limit: 500, status: 1 })
      .then((r) => setUsers(rowsOf(r).map((u) => ({ value: String(u.user_id ?? u.id), label: u.username ?? u.user_name ?? u.name }))))
      .catch(() => setUsers([]));
    profilesApi
      .getAll()
      .then((r) => setProfiles(rowsOf(r).map((p) => ({ value: String(p.profile_id ?? p.id), label: p.profile_name }))))
      .catch(() => setProfiles([]));
  }, []);

  const run = async (verb, body) => {
    setBusy(true);
    setError("");
    try {
      const r = await lendingAuthorityApi[verb](scope(body));
      notifications.success(r?.message ?? t("saved"));
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const people = (rows ?? []).filter((x) => x.kind !== "BOARD");
  const boardRow = (rows ?? []).find((x) => x.kind === "BOARD");
  const saveEditing = () =>
    run("save", {
      kind: editing.kind,
      ...(editing.kind === "USER" ? { user_id: Number(editing.user_id) } : { profile_id: Number(editing.profile_id) }),
      maximum_amount: String(editing.maximum_amount),
    });

  return (
    <Section title={t("approvalLimits")}>
      <p className="mb-3 text-xs text-muted-foreground">{t("approvalLimitsHint")}</p>
      {!rows ? (
        <Spinner size={16} />
      ) : (
        <div className="grid gap-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="border-b border-border text-left text-[10px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("whoApproves")}</th>
                  <th className="px-3 py-2 text-right">{t("upToAmount")}</th>
                  <th className="px-3 py-2">{t("updated")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {!people.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                      {t("noApprovalLimits")}
                    </td>
                  </tr>
                )}
                {people.map((x) => (
                  <tr key={x.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-1.5">
                      <b>{x.kind === "USER" ? x.user_name : x.profile_name}</b> <span className="text-muted-foreground">· {t(`authority_${x.kind}`)}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{money(x.maximum_amount)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {x.updated_by} · {accountDate(x.updated_time)}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="flex justify-end gap-1">
                        {x.actions?.edit && <ActionIconButton label={t("edit")} intent="edit" icon={Pencil} onClick={() => setEditing({ kind: x.kind, user_id: String(x.user_id ?? ""), profile_id: String(x.profile_id ?? ""), maximum_amount: x.maximum_amount })} />}
                        {x.actions?.delete && <ActionIconButton label={t("delete")} intent="delete" icon={Trash2} onClick={() => void run("delete", { id: x.id })} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing ? (
            <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-4 sm:items-end">
              <label className={labelClass}>
                {t("limitFor")}
                <Field field={{ type: "select", options: [{ value: "USER", label: t("authority_USER") }, { value: "PROFILE", label: t("authority_PROFILE") }] }} value={editing.kind} onChange={(kind) => setEditing((f) => ({ ...f, kind }))} />
              </label>
              <label className={labelClass}>
                {t(editing.kind === "USER" ? "authority_USER" : "authority_PROFILE")}
                <Field
                  field={{ type: "select", blank: t("choose"), options: editing.kind === "USER" ? users : profiles }}
                  value={editing.kind === "USER" ? editing.user_id : editing.profile_id}
                  onChange={(v) => setEditing((f) => ({ ...f, [f.kind === "USER" ? "user_id" : "profile_id"]: v }))}
                />
              </label>
              <label className={labelClass}>
                {t("upToAmount")}
                <Field field={{ type: "amount" }} value={editing.maximum_amount} onChange={(maximum_amount) => setEditing((f) => ({ ...f, maximum_amount }))} />
              </label>
              <span className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  {t("cancel")}
                </Button>
                <Button size="sm" loading={busy} disabled={!Number(editing.maximum_amount) || !(editing.kind === "USER" ? editing.user_id : editing.profile_id)} onClick={() => void saveEditing()}>
                  {t("save")}
                </Button>
              </span>
            </div>
          ) : (
            can("Edit") && (
              <div>
                <Button size="sm" variant="outline" icon={Plus} onClick={() => setEditing({ kind: "USER", user_id: "", profile_id: "", maximum_amount: "" })}>
                  {t("addLimit")}
                </Button>
              </div>
            )
          )}

          <div className="grid gap-2 rounded-xl border border-border p-3 sm:max-w-md">
            <label className={labelClass}>
              {t("boardFrom")}
              <Field field={{ type: "amount" }} disabled={!can("Edit") || (boardRow && !boardRow.actions?.edit)} value={board} onChange={setBoard} />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("boardFromHint")}</span>
            </label>
            {can("Edit") && (
              <Button size="sm" className="justify-self-start" loading={busy} disabled={!Number(board) || board === boardRow?.maximum_amount} onClick={() => void run("save", { kind: "BOARD", maximum_amount: String(board) })}>
                {t("save")}
              </Button>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
    </Section>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LockKeyhole, Unlock } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { AmountInput } from "@/Components/Common/AmountInput";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { usePagePermission } from "@/Hooks/usePermission";
import { accountLiensApi } from "@/Services/Epurse/accounts.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import {
  ActionButtons,
  Facts,
  NarrationDialog,
  inputClass,
  labelClass,
} from "../Deposits/depositShared";
import { Field, MiniTable } from "../Loans/loanShared";
import { accountDate, money } from "./accountShared";

const REASONS = ["COURT_ORDER", "OTHER"];

// An account's liens, active first: money held that no debit may touch
// (court orders, loan pledges and compulsory savings). Staff place a lien
// over free money and release it; loans place and release their own.
export function AccountLiens({ account }) {
  const { t } = useTranslation("accounts");
  const can = usePagePermission();
  const [liens, setLiens] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("COURT_ORDER");
  const load = useCallback(
    () =>
      accountLiensApi
        .list({ acct_id: account.id, limit: 200 })
        .then((r) => setLiens(Array.isArray(r?.data) ? r.data : []))
        .catch((e) => (setLiens([]), notifications.error(e.message))),
    [account.id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const held = (liens ?? [])
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const free = Number(account.avail_bal ?? 0) - held;
  const run = async (verb, body) => {
    try {
      const r = await accountLiensApi[verb](body);
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      setAmount("");
      await load();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <div className="grid gap-3">
      <Facts
        rows={[
          [t("availBal"), money(account.avail_bal, account.currency_code)],
          [t("underLien"), money(held, account.currency_code), held ? "text-amber-700" : undefined],
          [t("freeOfLiens"), money(free, account.currency_code), "font-black"],
        ]}
      />
      {can("Add") && (
        <ActionButtons
          buttons={[
            {
              key: "add",
              label: t("placeLien"),
              icon: LockKeyhole,
              run: () => setDialog({ kind: "add" }),
            },
          ]}
        />
      )}
      <MiniTable
        rows={liens ?? []}
        empty={liens ? t("noLiens") : "…"}
        columns={[
          {
            key: "amount",
            label: t("amount"),
            align: "right",
            render: (l) => <b>{money(l.amount, account.currency_code)}</b>,
          },
          {
            key: "reason",
            label: t("lienReason"),
            render: (l) => (
              <span className="text-xs leading-tight">
                <b className="block">{t(`lien_${l.reason}`, { defaultValue: l.reason })}</b>
                <span className="text-[10px] text-muted-foreground">
                  {[l.source_module !== "ADMIN" && l.source_module, l.source_name]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            ),
          },
          {
            key: "narration",
            label: t("narration"),
            wrap: true,
            render: (l) => <span className="text-xs">{l.narration || "—"}</span>,
          },
          {
            key: "created_at",
            label: t("placed"),
            render: (l) => (
              <span className="text-xs leading-tight">
                {l.created_by}
                <span className="block text-[10px] text-muted-foreground">
                  {accountDate(l.created_at)}
                </span>
              </span>
            ),
          },
          {
            key: "status",
            label: t("status"),
            render: (l) => (
              <span className="text-xs leading-tight">
                <StatusBadge status={l.status} />
                {l.released_at && (
                  <span className="block text-[10px] text-muted-foreground">
                    {[l.released_by, accountDate(l.released_at)].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "actions",
            label: "",
            // Only staff liens are released here; a loan releases its own.
            render: (l) =>
              l.status === "ACTIVE" &&
              l.source_module === "ADMIN" &&
              can("Edit") && (
                <ActionIconButton
                  label={t("releaseLien")}
                  intent="reactivate"
                  icon={Unlock}
                  onClick={() => setDialog({ kind: "release", lien: l })}
                />
              ),
          },
        ]}
      />
      {dialog?.kind === "add" && (
        <NarrationDialog
          title={t("placeLien")}
          hint={t("placeLienHint", { amount: money(free, account.currency_code) })}
          confirmLabel={t("placeLien")}
          required
          onClose={() => setDialog(null)}
          onSave={(narration) => run("add", { acct_id: account.id, amount, reason, narration })}
        >
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              {t("amount")}
              <AmountInput
                className={cn(inputClass, "mt-1.5")}
                value={amount}
                onChange={setAmount}
              />
            </label>
            <label className={labelClass}>
              {t("lienReason")}
              <Field
                field={{
                  type: "select",
                  options: REASONS.map((r) => ({ value: r, label: t(`lien_${r}`) })),
                }}
                value={reason}
                onChange={setReason}
              />
            </label>
          </div>
        </NarrationDialog>
      )}
      {dialog?.kind === "release" && (
        <NarrationDialog
          title={t("releaseLien")}
          hint={t("releaseLienHint", { amount: money(dialog.lien.amount, account.currency_code) })}
          confirmLabel={t("releaseLien")}
          required
          onClose={() => setDialog(null)}
          onSave={(narration) => run("release", { id: dialog.lien.id, narration })}
        />
      )}
    </div>
  );
}

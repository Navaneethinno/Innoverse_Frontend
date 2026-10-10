import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Power, RotateCcw, Send, Trash2, XCircle } from "lucide-react";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { glAccountsApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { NarrationDialog } from "../TermDeposits/depositShared";

export const GL_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

const TYPE_TONE = {
  ASSET: "bg-sky-50 text-sky-800",
  LIABILITY: "bg-violet-50 text-violet-800",
  EQUITY: "bg-slate-100 text-slate-700",
  INCOME: "bg-emerald-50 text-emerald-700",
  EXPENSE: "bg-amber-50 text-amber-900",
};

export function GlType({ value }) {
  const { t } = useTranslation("accounting");
  if (!value) return null;
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold", TYPE_TONE[value] ?? "bg-muted")}>{t(`type_${value}`, { defaultValue: value })}</span>;
}

// An amount on the GL's normal side: negative means the other side.
export const glAmount = (value, currency) => money(Number(value ?? 0), currency);

// One line per currency: "1,234.00 MZN".
export function Balances({ balances, className }) {
  if (!balances?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("flex flex-col items-end gap-0.5", className)}>
      {balances.map((b) => (
        <span key={b.currency_id} className={cn("whitespace-nowrap text-xs font-semibold tabular-nums", Number(b.balance) < 0 && "text-red-700")}>
          {glAmount(b.balance, b.currency_code)}
        </span>
      ))}
    </span>
  );
}

// "Name · 210101 · GL000004", for pickers.
export const glLabel = (g) => [g.path || g.name, g.gl_code, g.account_number].filter(Boolean).join(" · ");

// Every active GL account (not parents) of the caller's institution, for
// pickers: the list in pages of 500 until all are in.
export function useGlAccounts(enabled = true) {
  const [accounts, setAccounts] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    (async () => {
      const all = [];
      for (let page = 1; ; page += 1) {
        const row = rowsOf(await glAccountsApi.list({ is_account: true, status: 1, page, page_size: 500 }))[0];
        all.push(...(row?.items ?? []));
        if (!row?.items?.length || all.length >= (row?.total ?? 0)) break;
      }
      if (!cancelled) setAccounts(all);
    })().catch((e) => {
      if (!cancelled) {
        notifications.error(e.message);
        setAccounts([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return accounts;
}

// The maker-checker buttons a record's `actions` allow (and the menu's
// rights), each asking for a narration first; deauth needs one. `run(verb,
// narration)` performs it.
export function useRecordActions({ actions, run, labels = {} }) {
  const { t } = useTranslation(["accounting", "fees"]);
  const can = usePagePermission();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const a = actions ?? {};
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && labels.edit && { key: "edit", label: t("fees:edit"), icon: Pencil, run: labels.edit },
    a.submit && can("Add") && { key: "submit", label: t("fees:submit"), icon: Send, variant: "outline", run: ask("submit") },
    a.deactivate && can("Deactivate") && { key: "deactivate", label: t("fees:deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Reactivate") && { key: "reactivate", label: t("fees:reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("fees:delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.cancel && { key: "cancel", label: t("cancelIt"), icon: XCircle, run: ask("cancel") },
    a.reverse && can("Add") && { key: "reverse", label: t("reverse"), icon: RotateCcw, run: ask("reverse") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("fees:reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("fees:approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const confirm = useCallback(
    async (narration) => {
      setBusy(true);
      try {
        await run(dialog, narration);
        setDialog(null);
      } catch (e) {
        notifications.error(e.message);
      } finally {
        setBusy(false);
      }
    },
    [dialog, run],
  );
  const dialogEl = dialog && (
    <NarrationDialog
      title={t(`confirm_${dialog}`)}
      hint={t(`confirmHint_${dialog}`, { defaultValue: "" })}
      confirmLabel={t(dialog === "auth" ? "fees:approve" : dialog === "deauth" ? "fees:reject" : dialog === "cancel" ? "cancelIt" : dialog === "reverse" ? "reverse" : `fees:${dialog}`)}
      variant={["delete", "deauth", "deactivate", "cancel"].includes(dialog) ? "danger" : "primary"}
      required={dialog === "deauth" || dialog === "reverse"}
      busy={busy}
      onClose={() => setDialog(null)}
      onSave={confirm}
    />
  );
  return { buttons, busy, dialog: dialogEl };
}

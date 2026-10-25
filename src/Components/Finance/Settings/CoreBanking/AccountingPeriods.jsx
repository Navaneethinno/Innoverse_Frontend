import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Lock, LockOpen } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { accountingPeriodsApi } from "@/Services/Accounting/accounting.api";
import { formatNumber } from "@/Utils/Lib/numberFormat";
import { notifications } from "@/Utils/Lib/notifications";
import { NarrationDialog, Section } from "../../Deposits/depositShared";
import { MiniTable, useInstitutionScope } from "../../Loans/loanShared";

const monthName = (period) => {
  const [y, m] = String(period).split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
const money = (v) => (v == null || v === "" ? "—" : formatNumber(v, { min: 2, max: 2 }));

// SETTINGS > Accounting Periods (menu 195): months from the first posting,
// latest first. Close an ended month once every earlier one is closed (the
// fiscal year's last month also posts the year-end close into Retained
// Earnings); reopen only the latest closed month, by another user.
export function AccountingPeriods() {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const [rows, setRows] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [balances, setBalances] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (chooser && !institution) return;
    try {
      const r = await accountingPeriodsApi.list(scope());
      setRows(Array.isArray(r?.data) ? r.data : []);
    } catch (e) {
      setRows([]);
      notifications.error(e.message);
    }
  }, [chooser, institution, scope]);
  useEffect(() => {
    setRows(null);
    void load();
  }, [load]);

  const act = async (narration) => {
    setBusy(true);
    try {
      const r = await accountingPeriodsApi[dialog.verb](
        scope({ period: dialog.row.period, narration }),
      );
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      await load();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openBalances = async (row) => {
    setBalances({ row, list: null });
    try {
      const r = await accountingPeriodsApi.balances(scope({ period: row.period }));
      setBalances({ row, list: Array.isArray(r?.data) ? r.data : [] });
    } catch (e) {
      setBalances(null);
      notifications.error(e.message);
    }
  };

  const who = (name, at) => (name ? `${name?.name ?? name} · ${accountDate(at)}` : "—");
  const columns = [
    {
      key: "period",
      label: t("period"),
      render: (r) => (
        <span className="text-xs leading-tight">
          <b className="block">{monthName(r.period)}</b>
          {r.year_end && (
            <span className="text-[10px] font-bold uppercase text-primary">{t("yearEnd")}</span>
          )}
        </span>
      ),
    },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "closed_by",
      label: t("closedBy"),
      render: (r) => <span className="text-xs">{who(r.closed_by, r.closed_at)}</span>,
    },
    {
      key: "reopened_by",
      label: t("reopenedBy"),
      render: (r) => <span className="text-xs">{who(r.reopened_by, r.reopened_at)}</span>,
    },
    {
      key: "actions",
      label: t("actions"),
      render: (r) => (
        <span className="flex gap-1">
          {r.status === "CLOSED" && (
            <ActionIconButton
              label={t("viewBalances")}
              intent="view"
              icon={Eye}
              onClick={() => void openBalances(r)}
            />
          )}
          {r.closable && can("Edit") && (
            <ActionIconButton
              label={t("closeMonth")}
              intent="deactivate"
              icon={Lock}
              onClick={() => setDialog({ verb: "close", row: r })}
            />
          )}
          {r.reopenable && can("Authorize") && (
            <ActionIconButton
              label={t("reopenMonth")}
              intent="reactivate"
              icon={LockOpen}
              onClick={() => setDialog({ verb: "reopen", row: r })}
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle>{t("periodsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("periodsSubtitle")}</p>
      </div>
      {chooser && !institution ? null : !rows ? (
        <PageSkeleton />
      ) : (
        <Section title={t("months")}>
          <MiniTable
            rows={rows}
            rowKey={(r) => r.period}
            columns={columns}
            empty={t("noPeriods")}
          />
        </Section>
      )}

      {dialog && (
        <NarrationDialog
          title={t(`${dialog.verb}Title`, { month: monthName(dialog.row.period) })}
          hint={
            dialog.verb === "close"
              ? dialog.row.year_end
                ? t("closeYearEndHint")
                : t("closeHint")
              : dialog.row.year_end
                ? t("reopenYearEndHint")
                : t("reopenHint")
          }
          confirmLabel={t(dialog.verb === "close" ? "closeMonth" : "reopenMonth")}
          variant={dialog.verb === "reopen" ? "danger" : "primary"}
          required={dialog.verb === "reopen"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={act}
        />
      )}

      {balances && (
        <Modal
          open
          size="xl"
          onClose={() => setBalances(null)}
          title={t("balancesTitle", { month: monthName(balances.row.period) })}
        >
          {!balances.list ? (
            <PageSkeleton />
          ) : (
            <MiniTable
              rows={balances.list}
              rowKey={(r, i) => `${r.account_number}-${r.currency}-${i}`}
              empty={t("noBalances")}
              columns={[
                {
                  key: "name",
                  label: t("glAccount"),
                  render: (r) => (
                    <span className="text-xs leading-tight">
                      <b className="block">{r.name}</b>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {[r.account_number, r.gl_code].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  ),
                },
                { key: "gl_type", label: t("glType") },
                { key: "currency", label: t("currency") },
                {
                  key: "debits",
                  label: t("debits"),
                  align: "right",
                  render: (r) => money(r.debits),
                },
                {
                  key: "credits",
                  label: t("credits"),
                  align: "right",
                  render: (r) => money(r.credits),
                },
                {
                  key: "closing_balance",
                  label: t("closingBalance"),
                  align: "right",
                  render: (r) => <b>{money(r.closing_balance)}</b>,
                },
              ]}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

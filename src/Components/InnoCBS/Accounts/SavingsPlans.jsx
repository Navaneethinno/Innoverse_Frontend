import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { useServerList } from "@/Hooks/useServerList";
import { useMenuPermission } from "@/Hooks/usePermission";
import { savingsPlansApi } from "@/Services/Epurse/accounts.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { accountDate, dayDate, money } from "./accountShared";
import { AccountDetail } from "./Accounts";
import { TxnDialog } from "./AccountStatement";

const STATUS_TONES = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  MATURED: "bg-sky-50 text-sky-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

function PlanStatus({ status }) {
  const { t } = useTranslation("accounts");
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_TONES[status] ?? "bg-muted")}>{t(`svStatus_${status}`, { defaultValue: status })}</span>;
}

// Saved so far against the goal.
function Progress({ plan }) {
  const goal = Number(plan.goal) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((Number(plan.balance) / goal) * 100)) : 0;
  return (
    <div className="min-w-[9rem]">
      <p className="whitespace-nowrap text-xs font-semibold">
        {money(plan.balance, plan.currency_code)} <span className="font-normal text-muted-foreground">/ {money(plan.goal)}</span>
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const Party = ({ party, acct }) => (
  <div>
    <p className="text-xs font-semibold">{party?.name || "—"}</p>
    {acct && <p className="font-mono text-[10px] text-muted-foreground">{acct}</p>}
  </div>
);

// Accounts › Savings (Admin_43): customers' savings plans (Poupança), read
// only. `owner` ({ kind, id }) limits it to one customer's plans, as saver
// or beneficiary.
export function SavingsPlans({ owner = null }) {
  const { t } = useTranslation(["accounts", "common"]);
  const [openId, setOpenId] = useState(null);
  const list = useServerList({
    api: savingsPlansApi.listPath,
    call: savingsPlansApi.list,
    prefix: owner ? "sv_" : "",
    extra: owner ? { entity_type: owner.kind, entity_id: owner.id } : null,
  });

  const columns = [
    { key: "plan_ref", label: t("svPlanRef"), render: (r) => <span className="font-mono text-xs font-bold">{r.plan_ref}</span> },
    { key: "payer", label: t("svSaver"), render: (r) => <Party party={r.payer} acct={r.payer_acct_num} /> },
    { key: "beneficiary", label: t("svBeneficiary"), render: (r) => (r.for_self ? <span className="text-xs text-muted-foreground">{t("svSelf")}</span> : <Party party={r.beneficiary} acct={r.beneficiary_acct_num} />) },
    { key: "balance", label: t("svBalanceGoal"), render: (r) => <Progress plan={r} /> },
    {
      key: "amount",
      label: t("svContribution"),
      render: (r) => (
        <span className="whitespace-nowrap text-xs">
          {money(r.amount, r.currency_code)} · {t(`svFreq_${r.frequency}`, { defaultValue: r.frequency })}
        </span>
      ),
    },
    { key: "maturity_date", label: t("svMaturity"), render: (r) => <span className="whitespace-nowrap text-xs">{dayDate(r.maturity_date)}</span> },
    { key: "status", label: t("status"), render: (r) => <PlanStatus status={r.status} /> },
    ...(owner ? [] : [{ key: "inst_profile_name", label: t("institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> }]),
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
  ];

  return (
    <>
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("svTitle")} emptyTitle={t("svEmpty")} />
      {openId && <SavingsPlanDetail id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

const Fact = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <div className="mt-0.5 text-sm">{children ?? "—"}</div>
  </div>
);

function SavingsPlanDetail({ id, onClose }) {
  const { t } = useTranslation(["accounts", "common"]);
  const [detail, setDetail] = useState(null);
  const [rrn, setRrn] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    savingsPlansApi
      .get({ id })
      .then((r) => !cancelled && setDetail(Array.isArray(r?.data) ? r.data[0] ?? null : null))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // onClose is the parent's inline setter; the fetch depends on the id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const p = detail?.plan;
  const txns = detail?.transactions ?? [];
  return (
    <>
      <Modal open onClose={onClose} size="xl" icon={PiggyBank} title={t("svDetailTitle", { ref: p?.plan_ref ?? "" })} subtitle={p?.payer?.name}>
        {!p ? (
          <div className="flex justify-center py-8">
            <Spinner size={20} />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PlanStatus status={p.status} />
              <Progress plan={p} />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Fact label={t("svSaver")}><Party party={p.payer} acct={p.payer_acct_num} /></Fact>
              <Fact label={t("svBeneficiary")}>{p.for_self ? t("svSelf") : <Party party={p.beneficiary} acct={p.beneficiary_acct_num} />}</Fact>
              <Fact label={t("svWallet")}>
                <button type="button" onClick={() => setAccount({ id: p.acct_id, acct_num: p.acct_num })} className="font-mono text-xs text-primary hover:underline">
                  {p.acct_num}
                </button>
              </Fact>
              <Fact label={t("svContribution")}>
                {money(p.amount, p.currency_code)} · {t(`svFreq_${p.frequency}`, { defaultValue: p.frequency })} · {t(`svMode_${p.mode}`, { defaultValue: p.mode })}
              </Fact>
              <Fact label={t("svStart")}>{dayDate(p.start_date)}</Fact>
              <Fact label={t("svMaturity")}>{dayDate(p.maturity_date)}</Fact>
              <Fact label={t("svNextDue")}>{p.status === "ACTIVE" ? dayDate(p.next_due_date) : "—"}</Fact>
              <Fact label={t("svPeriods")}>{p.periods}</Fact>
              <Fact label={t("svContributions")}>{t("svContributionsValue", { count: Number(p.contributions) || 0, amount: money(p.contributed, p.currency_code) })}</Fact>
              <Fact label={t("svMissed")}>{p.missed ?? 0}</Fact>
              <Fact label={t("svCreatedBy")}><span className="break-all text-xs">{p.created_by}</span></Fact>
              <Fact label={t("svCreatedAt")}>{accountDate(p.created_at)}</Fact>
              {p.closed_at && <Fact label={t("svClosedAt")}>{accountDate(p.closed_at)}</Fact>}
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">{t("svMovements", { count: txns.length })}</p>
              {txns.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("svNoMovements")}</p>
              ) : (
                <div className="max-h-80 overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{t("svWhen")}</th>
                        <th className="px-3 py-2">{t("svType")}</th>
                        <th className="px-3 py-2 text-right">{t("ptAmount")}</th>
                        <th className="px-3 py-2">{t("svSource")}</th>
                        <th className="px-3 py-2">RRN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((x) => (
                        <tr key={x.txn_id} className={cn("border-t border-border", x.reversed && "text-muted-foreground line-through")}>
                          <td className="whitespace-nowrap px-3 py-2">{accountDate(x.tran_date_time)}</td>
                          <td className="px-3 py-2">{t(`svTxn_${x.txn_type}`, { defaultValue: x.short_desc || x.txn_type })}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{money(x.amount, p.currency_code)}</td>
                          <td className="px-3 py-2">{x.source_module === "SAVINGS" ? t("svAuto") : x.source_module || x.channel || "—"}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => setRrn(x.rrn)} className="font-mono text-[11px] text-primary hover:underline">
                              {x.rrn}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      {rrn && <TxnDialog rrn={rrn} onClose={() => setRrn(null)} />}
      {account && <AccountDetail account={account} onClose={() => setAccount(null)} onStatement={() => setAccount(null)} />}
    </>
  );
}

// In a customer's details: their savings plans, for users who may view Accounts.
export function OwnerSavingsButton({ owner }) {
  const { t } = useTranslation("accounts");
  const can = useMenuPermission("Accounts");
  const [open, setOpen] = useState(false);
  // Savings plans are customers' only (entity types CUST_*).
  if (!owner?.id || !String(owner.kind ?? "").startsWith("CUST") || !can("View")) return null;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" icon={PiggyBank} onClick={() => setOpen(true)}>
          {t("svTitle")}
        </Button>
      </div>
      {open && (
        <Modal open onClose={() => setOpen(false)} size="xl" icon={PiggyBank} title={t("svTitle")} subtitle={owner.name}>
          <SavingsPlans owner={owner} />
        </Modal>
      )}
    </>
  );
}

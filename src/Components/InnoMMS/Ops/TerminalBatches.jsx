import { useEffect, useState } from "react";
import { useLatest } from "@/Hooks/useLatest";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts, NarrationDialog } from "@/Components/InnoCBS/Deposits/depositShared";
import { money } from "@/Components/InnoCBS/Accounts/accountShared";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { useServerList } from "@/Hooks/useServerList";
import { usePagePermission } from "@/Hooks/usePermission";
import { terminalBatchApi } from "@/Services/Merchant/ops.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { actorText } from "@/Utils/Lib/actor";
import { notifications } from "@/Utils/Lib/notifications";
import { mmsDate } from "../mmsShared";

// A batch's totals: one line per type, status and currency.
export function BatchTotals({ totals }) {
  const { t } = useTranslation("ops");
  if (!totals?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="grid gap-0.5 text-[11px]">
      {totals.map((x) => (
        <span key={`${x.txn_type}-${x.status}-${x.currency_code}`} className="whitespace-nowrap">
          {x.txn_type} · {t(`txnStatus_${x.status}`, { defaultValue: x.status })}: {x.count} · <b>{money(x.amount, x.currency_code)}</b>
        </span>
      ))}
    </div>
  );
}

// Asks to close a terminal's open batch now (Edit on Terminal Batches); also
// offered on a terminal row in MMS > Terminals.
export function CloseBatchDialog({ terminalId, tid, onClose, onDone }) {
  const { t } = useTranslation("ops");
  const [busy, setBusy] = useState(false);
  const close = async () => {
    setBusy(true);
    try {
      const r = await terminalBatchApi.close({ terminal_id: terminalId });
      notifications.success(r?.message ?? t("batchClosed"));
      onDone?.(rowsOf(r)[0]);
      onClose();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <NarrationDialog title={t("closeBatchTitle", { tid })} hint={t("closeBatchHint")} confirmLabel={t("closeBatch")} variant="danger" busy={busy} onClose={onClose} onSave={() => void close()} />;
}

// MMS > Terminal Batches (230): each terminal's settlement windows.
export function TerminalBatches() {
  const { t } = useTranslation(["ops", "common"]);
  const can = usePagePermission();
  const menu = useMenuContext()?.menu;
  const [viewing, setViewing] = useState(null);
  const [closing, setClosing] = useState(null);
  const list = useServerList({ api: terminalBatchApi.listPath, call: terminalBatchApi.list });

  const columns = [
    { key: "tid", label: t("tid"), render: (r) => <span className="font-mono text-xs font-bold">{r.tid}</span> },
    { key: "batch_no", label: t("batchNo"), render: (r) => <span className="font-mono text-xs">{r.batch_no}</span> },
    { key: "opened_at", label: t("openedAt"), render: (r) => <span className="whitespace-nowrap text-xs">{mmsDate(r.opened_at)}</span> },
    { key: "closed_at", label: t("closedAt"), render: (r) => <span className="whitespace-nowrap text-xs">{r.closed_at ? `${mmsDate(r.closed_at)} · ${t(`closeSource_${r.close_source}`, { defaultValue: r.close_source ?? "" })}` : "—"}</span> },
    { key: "txn_count", label: t("txnCount"), render: (r) => <span className="tabular-nums">{r.txn_count ?? 0}</span> },
    { key: "totals", label: t("totals"), sortable: false, render: (r) => <BatchTotals totals={r.totals} /> },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={r.status} label={t(`batchStatus_${r.status}`, { defaultValue: r.status })} /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1">
          <RowActions buttons={{ view: true }} onView={() => setViewing(r)} />
          {r.actions?.close && (
            <Button size="sm" variant="secondary" icon={Lock} disabled={!can("Edit")} disabledReason={t("whyNoPermission")} onClick={() => setClosing(r)}>
              {t("closeBatch")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle>{menu ? menuLabel(menu) : t("batchesTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("batchesSubtitle")}</p>
      </div>
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("batchesTitle")} emptyTitle={t("noBatches")} />
      {viewing && <BatchDetail id={viewing.id} row={viewing} onClose={() => setViewing(null)} />}
      {closing && <CloseBatchDialog terminalId={closing.terminal_id} tid={closing.tid} onClose={() => setClosing(null)} onDone={list.reload} />}
    </div>
  );
}

function BatchDetail({ id, row, onClose }) {
  const { t } = useTranslation(["ops", "common"]);
  const [data, setData] = useState(null);
  const closeRef = useLatest(onClose);
  useEffect(() => {
    let cancelled = false;
    terminalBatchApi
      .get({ id })
      .then((r) => !cancelled && setData(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        if (!cancelled) closeRef.current();
      });
    return () => {
      cancelled = true;
    };
  }, [id, closeRef]);
  const b = data?.batch ?? row;
  const txns = data?.transactions ?? [];
  return (
    <Modal open onClose={onClose} size="xl" title={t("batchTitle", { tid: b.tid, no: b.batch_no })}>
      <div className="grid gap-4">
        <Facts
          rows={[
            [t("common:status"), t(`batchStatus_${b.status}`, { defaultValue: b.status })],
            [t("openedAt"), mmsDate(b.opened_at)],
            [t("closedAt"), b.closed_at ? mmsDate(b.closed_at) : "—"],
            [t("closeSourceLabel"), b.close_source ? t(`closeSource_${b.close_source}`, { defaultValue: b.close_source }) : "—"],
            [t("closedBy"), actorText(b, "closed_by", "—")],
            [t("txnCount"), b.txn_count ?? 0],
          ]}
        />
        <div>
          <p className="mb-1 text-xs font-bold">{t("totals")}</p>
          <BatchTotals totals={b.totals} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <SimpleTable columns={[t("rrn"), t("txnType"), t("common:status"), t("amount"), t("at")]}>
            <tbody>
              {txns.map((x) => (
                <tr key={x.rrn} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{x.rrn}</td>
                  <td className="px-3 py-2">{x.txn_type}</td>
                  <td className="px-3 py-2">{t(`txnStatus_${x.status}`, { defaultValue: x.status })}</td>
                  <td className="px-3 py-2 tabular-nums">{money(x.amount, x.currency_code)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{mmsDate(x.at)}</td>
                </tr>
              ))}
              {data && !txns.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-muted-foreground">
                    {t("noTxns")}
                  </td>
                </tr>
              )}
            </tbody>
          </SimpleTable>
        </div>
      </div>
    </Modal>
  );
}

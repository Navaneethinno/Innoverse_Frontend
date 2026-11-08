import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
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
import { errorText, Tiles } from "@/Components/InnoMMS/Ops/opsShared";
import { mmsDate } from "@/Components/InnoMMS/mmsShared";
import { useServerList } from "@/Hooks/useServerList";
import { usePagePermission } from "@/Hooks/usePermission";
import { safApi } from "@/Services/Merchant/ops.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { actorText } from "@/Utils/Lib/actor";
import { notifications } from "@/Utils/Lib/notifications";

// InnoEFT > SAF Queue (232): card network reversals owed (REVERSAL_PENDING)
// or sent (REVERSED). Stuck = still pending after 5 sends.
export function SafQueue() {
  const { t } = useTranslation(["ops", "common"]);
  const menu = useMenuContext()?.menu;
  const [viewing, setViewing] = useState(null);
  const list = useServerList({ api: safApi.listPath, call: safApi.list });
  const s = list.summary ?? {};
  const tb = list.toolbar;
  const tabTo = (value) => (tb.options?.tabs?.options?.some((o) => o.value === value) ? () => tb.onTab(value) : undefined);
  const stuckFilter = tb.filterDefs?.some((f) => f.key === "stuck");

  const columns = [
    {
      key: "rrn",
      label: t("rrn"),
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-bold">{r.rrn}</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {t("stan")} {r.stan}
          </p>
        </div>
      ),
    },
    { key: "network", label: t("network"), render: (r) => <span className="text-xs">{[r.network, r.interface_code].filter(Boolean).join(" · ")}</span> },
    { key: "txn_type", label: t("txnType"), render: (r) => <span className="text-xs">{r.txn_type}</span> },
    { key: "amount", label: t("amount"), render: (r) => <span className="whitespace-nowrap text-xs tabular-nums">{money(r.amount, r.currency_code)}</span> },
    { key: "pan_masked", label: t("card"), render: (r) => <span className="font-mono text-xs">{r.pan_masked}</span> },
    { key: "terminal_id", label: t("tid"), render: (r) => <span className="font-mono text-xs">{r.terminal_id}</span> },
    {
      key: "attempts",
      label: t("attempts"),
      render: (r) => (
        <div className="text-xs">
          <span className="tabular-nums">{r.attempts ?? 0}</span>
          {r.stuck && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">{t("stuck")}</span>}
          {r.next_try_at && <span className="block text-[10px] text-muted-foreground">{t("nextTry", { at: mmsDate(r.next_try_at) })}</span>}
        </div>
      ),
    },
    {
      key: "status",
      label: t("common:status"),
      render: (r) => (
        <span className="inline-flex flex-wrap gap-1">
          <StatusBadge status={r.status} label={t(`saf_${r.status}`, { defaultValue: r.status })} />
          {r.pending_replay && <StatusBadge status="PENDING" label={t("replayPending")} />}
        </span>
      ),
    },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle>{menu ? menuLabel(menu) : t("safTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("safSubtitle")}</p>
      </div>
      <Tiles
        items={[
          { key: "pending", label: t("saf_REVERSAL_PENDING"), value: s.pending, tone: "text-amber-700", onClick: tabTo("REVERSAL_PENDING"), active: tb.tab === "REVERSAL_PENDING" },
          { key: "stuck", label: t("stuck"), value: s.stuck, tone: "text-red-700", onClick: stuckFilter ? () => tb.setFilter("stuck", tb.filters.stuck ? "" : "1") : undefined, active: Boolean(tb.filters?.stuck) },
          { key: "reversed", label: t("saf_REVERSED"), value: s.reversed, tone: "text-emerald-700", onClick: tabTo("REVERSED"), active: tb.tab === "REVERSED" },
        ]}
      />
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("safTitle")} emptyTitle={t("noSaf")} />
      {viewing && <SafDetail id={viewing.id} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </div>
  );
}

function SafDetail({ id, onClose, onChanged }) {
  const { t } = useTranslation(["ops", "common"]);
  const can = usePagePermission();
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      safApi
        .get({ id })
        .then((r) => setData(rowsOf(r)[0] ?? {}))
        .catch((e) => notifications.error(errorText(t, e))),
    [id, t],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const x = data?.item ?? {};
  const replays = data?.replays ?? [];
  const a = x.actions ?? {};
  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const r = await safApi[verb]({ id, ...(narration ? { narration } : {}) });
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      await load();
      onChanged();
    } catch (e) {
      notifications.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const replayWhy = !can("Edit") ? t("whyNoPermission") : "";
  const checkWhy = !can("Authorize") ? t("whyNoPermission") : "";
  return (
    <Modal open onClose={onClose} size="xl" title={t("safItemTitle", { rrn: x.rrn ?? "" })}>
      {!data ? null : (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {a.replay && (
              <Button size="sm" variant="secondary" icon={RotateCcw} disabled={Boolean(replayWhy) || busy} disabledReason={replayWhy} onClick={() => setDialog("replay")}>
                {t("replay")}
              </Button>
            )}
            {a.deauth && (
              <Button size="sm" variant="danger" icon={XCircle} disabled={Boolean(checkWhy) || busy} disabledReason={checkWhy} onClick={() => setDialog("deauth")}>
                {t("rejectReplay")}
              </Button>
            )}
            {a.auth && (
              <Button size="sm" icon={CheckCircle2} disabled={Boolean(checkWhy) || busy} disabledReason={checkWhy} onClick={() => setDialog("auth")}>
                {t("approveReplay")}
              </Button>
            )}
          </div>
          <Facts
            rows={[
              [t("common:status"), t(`saf_${x.status}`, { defaultValue: x.status })],
              [t("network"), [x.network, x.interface_code].filter(Boolean).join(" · ")],
              [t("txnType"), x.txn_type],
              [t("amount"), money(x.amount, x.currency_code)],
              [t("card"), x.pan_masked],
              [t("tid"), x.terminal_id],
              [t("stan"), x.stan],
              [t("attempts"), x.attempts ?? 0, x.stuck ? "text-red-700" : undefined],
              [t("nextTryLabel"), mmsDate(x.next_try_at)],
              [t("createdAt"), mmsDate(x.created_at)],
            ]}
          />
          {x.last_error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{t("lastError", { error: x.last_error })}</p>}
          <div>
            <p className="mb-2 text-sm font-bold">{t("replays")}</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <SimpleTable columns={[t("common:status"), t("narration"), t("requestedBy"), t("decidedBy"), t("decisionNote")]}>
                <tbody>
                  {replays.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2">{r.narration || "—"}</td>
                      <td className="px-3 py-2">
                        {actorText(r, "requested_by", "—")}
                        <span className="block text-[10px] text-muted-foreground">{mmsDate(r.requested_at)}</span>
                      </td>
                      <td className="px-3 py-2">
                        {actorText(r, "decided_by", "—")}
                        <span className="block text-[10px] text-muted-foreground">{mmsDate(r.decided_at)}</span>
                      </td>
                      <td className="px-3 py-2">{r.decision_note || "—"}</td>
                    </tr>
                  ))}
                  {!replays.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-muted-foreground">
                        {t("noReplays")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </SimpleTable>
            </div>
          </div>
        </div>
      )}
      {dialog && (
        <NarrationDialog
          title={t(`safConfirm_${dialog}`, { rrn: x.rrn })}
          hint={t(`safConfirmHint_${dialog}`)}
          confirmLabel={t(dialog === "replay" ? "replay" : dialog === "auth" ? "approveReplay" : "rejectReplay")}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => void act(dialog, narration)}
        />
      )}
    </Modal>
  );
}

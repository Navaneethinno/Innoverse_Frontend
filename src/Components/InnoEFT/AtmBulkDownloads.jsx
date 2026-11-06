import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Power } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { InstitutionField } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { MiniTable } from "@/Components/InnoCBS/Loans/loanShared";
import { mmsDate } from "@/Components/InnoMMS/mmsShared";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { atmBatchesApi } from "@/Services/Cards/atm.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { PARTS } from "./Atms";
import { useLatest } from "@/Hooks/useLatest";

// Downloads to every ACTIVE ATM at once: start one, and follow it.
function Batches() {
  const { t } = useTranslation(["atm", "common"]);
  const can = usePagePermission();
  const [starting, setStarting] = useState(false);
  const [viewing, setViewing] = useState(null);
  const list = useServerList({ api: atmBatchesApi.listPath, call: atmBatchesApi.list, prefix: "batch_" });
  const columns = [
    { key: "id", label: "#", render: (b) => <span className="font-mono text-xs">{b.id}</span> },
    { key: "part", label: t("part"), render: (b) => <span className="text-xs">{t(`part_${b.part}`, { defaultValue: b.part })}</span> },
    { key: "status", label: t("status"), render: (b) => <BatchStatus value={b.status} /> },
    { key: "counts", label: t("counts"), render: (b) => <span className="text-xs">{countsText(t, b.counts)}</span> },
    { key: "started", label: t("started"), render: (b) => <span className="whitespace-nowrap text-xs">{`${b.created_by ?? ""} · ${mmsDate(b.created_at)}`}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (b) => <RowActions buttons={{ view: true }} onView={() => setViewing(b)} /> },
  ];
  const actions = can("Change Status") && (
    <Button size="sm" icon={Power} onClick={() => setStarting(true)}>
      {t("downloadAll")}
    </Button>
  );
  return (
    <>
      <ListTable list={list} actions={actions} columns={columns} rowKey={(b) => b.id} title={t("tab_batches")} emptyTitle={t("noBatches")} />
      {starting && (
        <StartBatch
          onClose={() => setStarting(false)}
          onStarted={(batch) => {
            setStarting(false);
            list.reload();
            setViewing(batch);
          }}
        />
      )}
      {viewing && <BatchDetail batch={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </>
  );
}

const BatchStatus = ({ value }) => {
  const { t } = useTranslation("atm");
  const tone = { RUNNING: "bg-sky-50 text-sky-700", DONE: "bg-emerald-50 text-emerald-700", INTERRUPTED: "bg-red-50 text-red-700" }[value] ?? "bg-muted";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tone)}>{t(`batch_${value}`, { defaultValue: value })}</span>;
};
const countsText = (t, counts) =>
  Object.entries(counts ?? {})
    .map(([k, v]) => `${t(`count_${k}`, { defaultValue: k })} ${v}`)
    .join(" · ") || "—";

function StartBatch({ onClose, onStarted }) {
  const { t } = useTranslation("atm");
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [part, setPart] = useState("FULL");
  const [parallel, setParallel] = useState("4");
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const response = await atmBatchesApi.download({ part, parallel: Number(parallel), ...(isPlatform && instId ? { inst_profile_id: Number(instId) } : {}) });
      if (response?.message) notifications.success(response.message);
      onStarted(rowsOf(response)[0]);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("downloadAll")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Power} loading={busy} disabled={!(Number(parallel) >= 1 && Number(parallel) <= 8)} onClick={() => void start()}>
            {t("start")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t("downloadAllHint")}</p>
        {isPlatform && <InstitutionField value={instId} onChange={setInstId} />}
        <label className={labelClass}>
          {t("part")}
          <FilterSelect className="mt-1.5" value={part} onChange={setPart} options={PARTS.map((p) => ({ value: p, label: t(`part_${p}`) }))} />
        </label>
        <label className={labelClass}>
          {t("parallel")}
          <input className={`${inputClass} mt-1.5`} inputMode="numeric" maxLength={1} value={parallel} onChange={(e) => setParallel(e.target.value.replace(/\D/g, ""))} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("parallelHint")}</span>
        </label>
      </div>
    </Modal>
  );
}

// A batch, polled every 2 seconds while it runs: each ATM's state, and the
// counts per state (a state with no ATM is left out).
function BatchDetail({ batch, onClose, onChanged }) {
  const { t } = useTranslation("atm");
  const [b, setB] = useState(batch);
  const latest = useLatest({ batch, onChanged });
  useEffect(() => {
    const { batch, onChanged } = latest.current;
    let cancelled = false;
    let timer = null;
    const poll = () =>
      atmBatchesApi
        .get({ id: batch.id })
        .then((r) => {
          if (cancelled) return;
          const next = rowsOf(r)[0] ?? batch;
          setB(next);
          if (next.status === "RUNNING") timer = window.setTimeout(poll, 2000);
          else onChanged();
        })
        .catch((error) => notifications.error(error.message));
    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [batch.id, latest]);
  return (
    <Modal open onClose={onClose} size="xl" title={t("batchTitle", { id: b.id })}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <BatchStatus value={b.status} /> {countsText(t, b.counts)}
          <span className="text-xs text-muted-foreground">{[t(`part_${b.part}`, { defaultValue: b.part }), b.parallel && t("parallelN", { n: b.parallel }), `${b.created_by ?? ""} · ${mmsDate(b.created_at)}`, b.finished_at && t("finishedAt", { at: mmsDate(b.finished_at) })].filter(Boolean).join(" · ")}</span>
        </div>
        <MiniTable
          rows={b.items ?? []}
          rowKey={(i) => i.atm}
          empty={t("noItems")}
          columns={[
            { key: "atm_id", label: t("atmId"), render: (i) => <span className="font-mono">{i.atm_id}</span> },
            { key: "status", label: t("status"), render: (i) => t(`item_${i.status}`, { defaultValue: i.status }) },
            { key: "detail", label: t("detail"), wrap: true },
            { key: "started_at", label: t("started"), render: (i) => mmsDate(i.started_at) },
            { key: "finished_at", label: t("finished"), render: (i) => mmsDate(i.finished_at) },
          ]}
        />
      </div>
    </Modal>
  );
}

// InnoEFT > ATM Bulk Downloads (menu 216).
export function AtmBulkDownloads() {
  const { t } = useTranslation("atm");
  const menu = useMenuContext()?.menu;
  return (
    <div className="pt-1 pb-6">
      <div className="mb-5">
        <PageTitle>{menu ? menuLabel(menu) : t("tab_batches")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("batchesSubtitle")}</p>
      </div>
      <Batches />
    </div>
  );
}

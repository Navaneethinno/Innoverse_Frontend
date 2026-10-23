import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, FileStack } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { preFilesApi } from "@/Services/Cards/cards.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { NarrationDialog } from "../Finance/Deposits/depositShared";
import { CardPill, cardWord } from "./cardOpsShared";

// The PRE file holds full card numbers and CVVs: it goes from the reply
// straight to a file on the user's machine; the server never keeps it.
function savePreFile(reply) {
  const bytes = Uint8Array.from(atob(reply.content_base64), (c) => c.charCodeAt(0));
  saveBlob(new Blob([bytes], { type: reply.encrypted ? "application/pgp-encrypted" : "text/csv" }), reply.file_name);
}

// InnoCMS > PRE Files (menu 158): one emboss file for the bureau from cards
// picked across an issuance group's orders. Waiting cards, cards already in
// a file (again only with a reason, by another user), and the files made.
export function PreFiles() {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  // The cards (tabs Waiting / In a file; filters issuance group and holder
  // type, from list/options) or the files made.
  const [view, setView] = useState("cards");
  const [ticked, setTicked] = useState(() => new Map());
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const jobs = view === "jobs";
  const cards = useServerList({ api: "/config/card/prefile/list", call: preFilesApi.list });
  const made = useServerList({ api: "/config/card/prefile/jobs", call: preFilesApi.jobs, prefix: "j_" });
  const list = jobs ? made : cards;
  const data = { items: cards.rows, total: cards.pagination.totalRecords };
  const groupId = cards.toolbar.filters.issuance_group_id ?? "";
  const load = () => (cards.reload(), made.reload());

  // A new group or tab starts a new pick.
  useEffect(() => setTicked(new Map()), [groupId, view, cards.toolbar.tab]);

  const tick = (card) =>
    setTicked((m) => {
      const next = new Map(m);
      if (next.has(card.id)) next.delete(card.id);
      else next.set(card.id, card);
      return next;
    });
  const tickPage = () =>
    setTicked((m) => {
      const next = new Map(m);
      const all = data.items.every((c) => next.has(c.id));
      data.items.forEach((c) => (all ? next.delete(c.id) : next.set(c.id, c)));
      return next;
    });

  const generate = async (reason) => {
    setBusy(true);
    try {
      const reply = rowsOf(await preFilesApi.generate({ issuance_group_id: Number(groupId), card_ids: [...ticked.keys()], ...(reason ? { reason } : {}) }))[0];
      if (reply?.content_base64) savePreFile(reply);
      notifications.success(t("preFileMade", { count: Number(reply?.card_count ?? 0), ref: reply?.job_ref }));
      setAsking(false);
      setTicked(new Map());
      load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const cardColumns = [
    {
      key: "pick",
      label: <input type="checkbox" aria-label={t("tickPage")} checked={data.items.length > 0 && data.items.every((c) => ticked.has(c.id))} onChange={tickPage} className="accent-[var(--primary)]" />,
      sortable: false,
      render: (c) => <input type="checkbox" aria-label={c.pan_masked} checked={ticked.has(c.id)} onChange={() => tick(c)} className="accent-[var(--primary)]" />,
    },
    { key: "order_ref", label: t("order"), render: (c) => <span className="font-mono text-xs">{c.order_ref}</span> },
    { key: "pan_masked", label: t("cardNumber"), render: (c) => <span className="whitespace-nowrap font-mono text-xs">{c.pan_masked}</span> },
    { key: "perso_mode", label: t("persoMode"), render: (c) => <span className="text-xs">{cardWord(t, "opt", c.perso_mode)}</span> },
    { key: "name_on_card", label: t("nameOnCard"), render: (c) => <span className="text-xs">{c.name_on_card || "—"}</span> },
    { key: "holder_name", label: t("holder"), render: (c) => <span className="text-xs">{c.holder_name || "—"}</span> },
    { key: "expiry", label: t("expiry"), render: (c) => <span className="text-xs tabular-nums">{c.expiry}</span> },
    { key: "issuance_status", label: t("status"), render: (c) => <CardPill prefix="iss" code={c.issuance_status} /> },
    { key: "last_job_ref", label: t("lastFile"), render: (c) => (c.last_job_ref ? <span className="whitespace-nowrap text-xs"><span className="font-mono">{c.last_job_ref}</span><span className="block text-[10px] text-muted-foreground">{accountDate(c.last_job_time)}</span></span> : <span className="text-xs">—</span>) },
  ];
  const jobColumns = [
    { key: "job_ref", label: t("fileRef"), render: (j) => <span className="font-mono text-xs font-bold">{j.job_ref}</span> },
    { key: "issuance_group_name", label: t("group"), render: (j) => <span className="text-xs">{j.issuance_group_name}</span> },
    { key: "order_ref", label: t("order"), render: (j) => <span className="font-mono text-xs">{j.order_ref || t("acrossOrders")}</span> },
    { key: "card_count", label: t("cards"), render: (j) => <span className="text-xs font-bold tabular-nums">{j.card_count}</span> },
    { key: "created_by", label: t("madeBy"), render: (j) => <span className="text-xs">{j.created_by}</span> },
    { key: "created_time", label: t("madeAt"), render: (j) => <span className="whitespace-nowrap text-xs">{accountDate(j.created_time)}</span> },
    { key: "reason", label: t("reason"), render: (j) => <span className="text-xs">{j.reason || "—"}</span> },
  ];

  const again = cards.toolbar.tab === "PREFILED";
  const canMake = can("Add") && groupId && !jobs && (ticked.size > 0 || (!again && data.total > 0));

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <FileStack size={22} className="text-primary" /> {t("preFilesTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("preFilesSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          {!jobs && can("Add") && (
            <Button size="sm" icon={FileDown} loading={busy && !asking} disabled={!canMake || busy} onClick={() => (again ? setAsking(true) : void generate())}>
              {ticked.size ? t("makePreFileN", { count: ticked.size }) : t("makePreFileAll")}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SegmentedSwitch options={["cards", "jobs"].map((key) => ({ value: key, label: t(key === "jobs" ? "prefile_jobs" : "prefile_cards") }))} value={view} onChange={setView} />
        {!jobs && ticked.size > 0 && <span className="text-xs font-semibold text-primary">{t("tickedN", { count: ticked.size })}</span>}
      </div>

      <ListTable
        key={view}
        list={list}
        columns={jobs ? jobColumns : cardColumns}
        title={t("preFilesTitle")}
        emptyTitle={t(jobs ? "noPreFiles" : "noPreFileCards")}
        emptyDescription={jobs ? "" : t(again ? "noPreFileCardsAgainHint" : "noPreFileCardsHint")}
      />

      {asking && (
        <NarrationDialog
          title={t("makeAgainTitle")}
          hint={t("makeAgainHint")}
          confirmLabel={t("makePreFileN", { count: ticked.size })}
          required
          busy={busy}
          onClose={() => setAsking(false)}
          onSave={(reason) => generate(reason)}
        />
      )}
    </div>
  );
}

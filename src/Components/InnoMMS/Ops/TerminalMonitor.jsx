import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { useServerList } from "@/Hooks/useServerList";
import { terminalMonitorApi } from "@/Services/Merchant/ops.api";
import { MmsStatus, mmsDate } from "../mmsShared";
import { PagedTable, Tiles, usePagedCall } from "./opsShared";

const ONLINE_TONE = { ONLINE: "text-emerald-700", OFFLINE: "text-red-700", NEVER_SEEN: "text-slate-500", BLOCKED: "text-red-700" };
const HEALTH_KEYS = ["battery_level", "charging", "firmware_version", "app_version", "network_type", "signal_strength", "paper_out", "printer_error", "reader_error", "latitude", "longitude"];

// What the terminal last reported; any field may be missing.
function healthValue(t, key, v) {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? t("common:yes") : t("common:no");
  if (key === "battery_level") return `${v}%`;
  return String(v);
}

// The short health line in the list: battery, network, faults.
function HealthLine({ health }) {
  const { t } = useTranslation(["ops", "common"]);
  if (!health) return <span className="text-xs text-muted-foreground">—</span>;
  const faults = ["paper_out", "printer_error", "reader_error"].filter((k) => health[k]);
  if (health.battery_level == null && !health.network_type && !faults.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="text-[11px]">
      {health.battery_level != null && (
        <span>
          {t("battery")}: {health.battery_level}%{health.charging ? ` (${t("charging")})` : ""}
        </span>
      )}
      {health.network_type && <span className="block">{[health.network_type, health.signal_strength != null && `${health.signal_strength}`].filter(Boolean).join(" · ")}</span>}
      {faults.length > 0 && <span className="block font-semibold text-red-700">{faults.map((k) => t(`health_${k}`)).join(", ")}</span>}
    </div>
  );
}

// MMS > Terminal Monitor (231): which terminals are online, silent the longest first.
export function TerminalMonitor() {
  const { t } = useTranslation(["ops", "common"]);
  const menu = useMenuContext()?.menu;
  const [viewing, setViewing] = useState(null);
  const list = useServerList({ api: terminalMonitorApi.listPath, call: terminalMonitorApi.list });
  const s = list.summary ?? {};
  const tb = list.toolbar;
  const tabTo = (value) => (tb.options?.tabs?.options?.some((o) => o.value === value) ? () => tb.onTab(value) : undefined);

  const columns = [
    {
      key: "tid",
      label: t("tid"),
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-bold">{r.tid}</p>
          <p className="text-[10px] text-muted-foreground">{r.name}</p>
        </div>
      ),
    },
    { key: "store_name", label: t("store"), render: (r) => <span className="text-xs">{r.store_name || "—"}</span> },
    { key: "online", label: t("online"), render: (r) => <span className={`text-xs font-bold ${ONLINE_TONE[r.online] ?? ""}`}>{t(`online_${r.online}`, { defaultValue: r.online })}</span> },
    { key: "status", label: t("common:status"), render: (r) => <MmsStatus value={r.status} /> },
    { key: "last_seen_at", label: t("lastSeen"), render: (r) => <span className="whitespace-nowrap text-xs">{mmsDate(r.last_seen_at)}</span> },
    { key: "last_txn_at", label: t("lastTxn"), render: (r) => <span className="whitespace-nowrap text-xs">{mmsDate(r.last_txn_at)}</span> },
    { key: "health", label: t("health"), sortable: false, render: (r) => <HealthLine health={r.health} /> },
    {
      key: "signed_in",
      label: t("session"),
      render: (r) => (
        <span className="text-xs">
          {r.signed_in ? t("signedIn") : t("signedOut")}
          {r.open_batch_no ? <span className="block text-[10px] text-muted-foreground">{t("openBatch", { no: r.open_batch_no })}</span> : null}
        </span>
      ),
    },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-5">
        <PageTitle>{menu ? menuLabel(menu) : t("monitorTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("monitorSubtitle")}</p>
      </div>
      <Tiles
        items={[
          { key: "terminals", label: t("tileTerminals"), value: s.terminals },
          { key: "online", label: t("online_ONLINE"), value: s.online, tone: ONLINE_TONE.ONLINE, onClick: tabTo("ONLINE"), active: tb.tab === "ONLINE" },
          { key: "offline", label: t("online_OFFLINE"), value: s.offline, tone: ONLINE_TONE.OFFLINE, onClick: tabTo("OFFLINE"), active: tb.tab === "OFFLINE" },
          { key: "never_seen", label: t("online_NEVER_SEEN"), value: s.never_seen, onClick: tabTo("NEVER_SEEN"), active: tb.tab === "NEVER_SEEN" },
          { key: "blocked", label: t("online_BLOCKED"), value: s.blocked, tone: ONLINE_TONE.BLOCKED },
        ]}
      />
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("monitorTitle")} emptyTitle={t("noTerminals")} />
      {viewing && <HealthDialog terminal={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function HealthDialog({ terminal, onClose }) {
  const { t } = useTranslation(["ops", "common"]);
  const history = usePagedCall({ call: terminalMonitorApi.health, body: { terminal_id: terminal.id } });
  const h = terminal.health ?? {};
  return (
    <Modal open onClose={onClose} size="xl" title={t("healthTitle", { tid: terminal.tid })}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge status={terminal.online} label={t(`online_${terminal.online}`, { defaultValue: terminal.online })} />
          <span className="text-muted-foreground">{t("healthAt", { at: mmsDate(terminal.health_at) })}</span>
        </div>
        <Facts
          rows={[
            [t("lastSeen"), mmsDate(terminal.last_seen_at)],
            [t("lastTxn"), mmsDate(terminal.last_txn_at)],
            [t("appVersion"), terminal.app_version],
            [t("owner"), terminal.entity_type ? `${terminal.entity_type} ${terminal.entity_id}` : "—"],
            ...HEALTH_KEYS.map((k) => [t(`health_${k}`), healthValue(t, k, h[k])]),
          ]}
        />
        <div>
          <p className="mb-2 text-sm font-bold">{t("healthHistory")}</p>
          <PagedTable
            paged={history}
            rowKey={(r, i) => `${r.recorded_at}-${i}`}
            empty={t("noHealth")}
            columns={[
              { label: t("recordedAt"), render: (r) => <span className="whitespace-nowrap">{mmsDate(r.recorded_at)}</span> },
              { label: t("health"), render: (r) => <HealthLine health={r.health} /> },
              { label: t("health_firmware_version"), render: (r) => r.health?.firmware_version ?? "—" },
              { label: t("health_app_version"), render: (r) => r.health?.app_version ?? "—" },
              { label: t("location"), render: (r) => (r.health?.latitude != null ? `${r.health.latitude}, ${r.health.longitude}` : "—") },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}

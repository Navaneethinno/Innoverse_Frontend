import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Spinner } from "@/Components/Common/Spinner";
import { MiniTable } from "@/Components/InnoCBS/Loans/loanShared";
import { mmsDate } from "@/Components/InnoMMS/mmsShared";
import { useMenuContext } from "@/Pages/Sidebar/menuContext";
import { menuLabel } from "@/Pages/Sidebar/menuLabels";
import { atmsApi } from "@/Services/Cards/atm.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

const PORT_TONES = { LISTENING: "bg-sky-50 text-sky-700", CONNECTED: "bg-emerald-50 text-emerald-700", FAILED: "bg-red-50 text-red-700", STOPPED: "bg-slate-100 text-slate-600" };

// Every ATM's port as it is now, refreshed every 15 seconds.
function PortBoard() {
  const { t } = useTranslation("atm");
  const [rows, setRows] = useState(null);
  const load = useCallback(() => {
    atmsApi
      .ports()
      .then((r) => setRows(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);
  if (!rows) return <Spinner size={16} />;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("portsHint")}</p>
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={load}>
          {t("refresh")}
        </Button>
      </div>
      <MiniTable
        rows={rows}
        rowKey={(p) => p.atm ?? p.port}
        empty={t("noPorts")}
        columns={[
          { key: "atm_id", label: t("atmId"), render: (p) => <span className="font-mono font-bold">{p.atm_id}</span> },
          { key: "port", label: t("listenPort"), render: (p) => <span className="font-mono">{`:${p.port} (${t(`header_${p.length_header}`, { defaultValue: p.length_header })})`}</span> },
          { key: "state", label: t("state"), render: (p) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", PORT_TONES[p.state] ?? "bg-muted")}>{t(`port_${p.state}`, { defaultValue: p.state })}</span> },
          { key: "since", label: t("since"), render: (p) => mmsDate(p.since) },
          { key: "remote", label: t("remote"), render: (p) => <span className="font-mono">{p.remote ?? "—"}</span> },
          { key: "download_step", label: t("download"), render: (p) => p.download_step ?? "—" },
          { key: "error", label: t("error"), wrap: true, render: (p) => <span className="text-red-700">{p.error ?? ""}</span> },
        ]}
      />
    </div>
  );
}

// InnoEFT > Settings > ATM Ports (menu 215).
export function AtmPorts() {
  const { t } = useTranslation("atm");
  const menu = useMenuContext()?.menu;
  return (
    <div className="pt-1 pb-6">
      <div className="mb-5">
        <PageTitle>{menu ? menuLabel(menu) : t("tab_ports")}</PageTitle>
      </div>
      <PortBoard />
    </div>
  );
}

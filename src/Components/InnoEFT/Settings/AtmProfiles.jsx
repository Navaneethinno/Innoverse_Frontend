import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { usePagedList } from "@/Components/InnoAML/Shared/usePagedList";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { mmsDate } from "@/Components/InnoMMS/mmsShared";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { atmProfilesApi } from "@/Services/Cards/atm.api";
import { actorText } from "@/Utils/Lib/actor";

const FILTERS = {};
const recordCount = (p) => Object.values(p.records ?? {}).reduce((n, x) => n + (Number(x) || 0), 0);

// InnoEFT > Settings > ATM Profiles (menu 214): what a download sends an ATM
// (states, screens, keys). Read only; an ATM picks its profile.
export function AtmProfiles() {
  const { t } = useTranslation(["atm", "common"]);
  const menu = useMenuContext()?.menu;
  const list = usePagedList(atmProfilesApi.list, FILTERS);
  const [viewing, setViewing] = useState(null);
  const columns = [
    { key: "code", label: t("code"), render: (p) => <span className="font-mono text-xs font-bold">{p.code}</span> },
    { key: "name", label: t("name"), align: "left", render: (p) => <span className="text-xs font-semibold">{p.name}</span> },
    { key: "protocol", label: t("protocol") },
    { key: "records", label: t("profileRecords"), render: (p) => <span className="tabular-nums">{recordCount(p)}</span> },
    { key: "updated_at", label: t("updated"), render: (p) => `${actorText(p, "updated_by", "")} · ${mmsDate(p.updated_at)}` },
    { key: "actions", label: t("common:actions"), sortable: false, render: (p) => <RowActions buttons={{ view: true }} onView={() => setViewing(p)} /> },
  ];
  return (
    <div className="pt-1 pb-6">
      <div className="mb-5">
        <PageTitle>{menu ? menuLabel(menu) : t("profilesTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("profilesSubtitle")}</p>
      </div>
      <DataTable columns={columns} rows={list.rows} rowKey={(p) => p.id} isLoading={list.loading} title={t("profilesTitle")} emptyTitle={t("noProfiles")} serverPagination={list.serverPagination} serverSorted />
      {viewing && (
        <Modal open size="lg" onClose={() => setViewing(null)} title={`${viewing.name} (${viewing.code})`}>
          <Facts
            rows={[
              [t("protocol"), viewing.protocol],
              [t("pageSize"), viewing.page_size],
              [t("loadedFrom"), viewing.loaded_from],
              ...Object.entries(viewing.records ?? {}).map(([key, count]) => [key.replaceAll("_", " "), count]),
            ]}
          />
        </Modal>
      )}
    </div>
  );
}

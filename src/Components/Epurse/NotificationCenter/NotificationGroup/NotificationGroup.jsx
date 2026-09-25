import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Plus, Smartphone } from "lucide-react";
import { notificationGroupApi } from "@/Services/Epurse/notification.api";
import { LifecycleList } from "../../Onboarding/OnboardingConfiguration/LifecycleList";
import { ViewItem, draftAwareRow } from "../notificationShared";
import { NotificationGroupForm } from "./NotificationGroupForm";

// EPURSE > Notification Center > Notification Group (menu 95): named lists of
// email / mobile recipients that alerts send to.
export function NotificationGroup() {
  const { t } = useTranslation(["notification", "common"]);
  const [form, setForm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const openEdit = async (row) => setForm({ editing: await draftAwareRow(notificationGroupApi, row) });

  const columns = [
    { key: "code", label: t("notification:code"), render: (row) => <span className="font-mono text-xs">{row.code ?? "-"}</span> },
    { key: "name", label: t("notification:name"), align: "left", render: (row) => <span className="font-semibold">{row.name ?? "-"}</span> },
    { key: "inst_profile_name", label: t("notification:institution"), render: (row) => row.inst_profile_name ?? "-" },
    { key: "members", label: t("notification:recipients"), sortable: false, render: (row) => t("notification:recipientCount", { count: row.members?.length ?? 0 }) },
  ];

  return (
    <>
      <LifecycleList
        title={t("notification:groupTitle")}
        subtitle={t("notification:groupSubtitle")}
        api={notificationGroupApi}
        menuName="Notification Group"
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => void openEdit(row)}
        auditFields={[["code", t("notification:code")], ["name", t("notification:name")], ["description", t("common:description")]]}
        emptyTitle={t("notification:noGroupsFound")}
        addButton={
          <button type="button" onClick={() => setForm({ editing: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus size={14} /> {t("notification:addGroup")}
          </button>
        }
        renderView={(row) => (
          <dl className="grid gap-3">
            <ViewItem label={t("notification:code")}>{row.code}</ViewItem>
            <ViewItem label={t("notification:name")}>{row.name}</ViewItem>
            <ViewItem label={t("notification:institution")}>{row.inst_profile_name}</ViewItem>
            {row.description && <ViewItem label={t("common:description")}>{row.description}</ViewItem>}
            <ViewItem label={t("notification:recipientCount", { count: row.members?.length ?? 0 })}>
              <ul className="mt-1 space-y-1">
                {(row.members ?? []).map((m) => (
                  <li key={`${m.type}:${m.value}`} className="flex items-center gap-2 font-normal">
                    {m.type === "MOBILE" ? <Smartphone size={13} className="text-muted-foreground" /> : <Mail size={13} className="text-muted-foreground" />}
                    {m.value}
                  </li>
                ))}
              </ul>
            </ViewItem>
            <ViewItem label={t("common:status")}>{row.process_status_name ?? row.status_name}</ViewItem>
          </dl>
        )}
      />
      {form && (
        <NotificationGroupForm
          editing={form.editing}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}

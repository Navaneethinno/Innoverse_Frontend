import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, MessageSquare, Plus } from "lucide-react";
import { notificationAlertApi } from "@/Services/Epurse/notification.api";
import { LifecycleList } from "../../Onboarding/OnboardingConfiguration/LifecycleList";
import { ViewItem, draftAwareRow } from "../notificationShared";
import { NotificationAlertForm } from "./NotificationAlertForm";
import { describeTrigger, useAlertOptions } from "./useAlertOptions";

const ChannelChips = ({ row, t }) => (
  <span className="inline-flex gap-1">
    {row.send_email && (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary">
        <Mail size={11} /> {t("notification:email")}
      </span>
    )}
    {row.send_sms && (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary">
        <MessageSquare size={11} /> {t("notification:sms")}
      </span>
    )}
  </span>
);

// EPURSE > Notification Center > Notification Alerts (menu 94): what to send
// (email / SMS), to which groups, on which menu actions.
export function NotificationAlerts() {
  const { t } = useTranslation(["notification", "common"]);
  const [form, setForm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // For names in the View modal (group and trigger ids -> names).
  const { options } = useAlertOptions();
  const groupName = (id) => options.groups.find((g) => g.id === id)?.name ?? `#${id}`;

  const openEdit = async (row) => setForm({ editing: await draftAwareRow(notificationAlertApi, row) });

  const columns = [
    { key: "code", label: t("notification:code"), render: (row) => <span className="font-mono text-xs">{row.code ?? "-"}</span> },
    { key: "name", label: t("notification:name"), align: "left", render: (row) => <span className="font-semibold">{row.name ?? "-"}</span> },
    { key: "channels", label: t("notification:channels"), sortable: false, render: (row) => <ChannelChips row={row} t={t} /> },
    { key: "group_ids", label: t("notification:groups"), sortable: false, render: (row) => t("notification:groupCount", { count: row.group_ids?.length ?? 0 }) },
    { key: "triggers", label: t("notification:triggers"), sortable: false, render: (row) => t("notification:triggerCount", { count: row.triggers?.length ?? 0 }) },
  ];

  return (
    <>
      <LifecycleList
        title={t("notification:alertTitle")}
        subtitle={t("notification:alertSubtitle")}
        api={notificationAlertApi}
        menuName="Notification Alerts"
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => void openEdit(row)}
        auditFields={[
          ["code", t("notification:code")],
          ["name", t("notification:name")],
          ["email_subject", t("notification:emailSubject")],
          ["sms_body", t("notification:smsBody")],
        ]}
        emptyTitle={t("notification:noAlertsFound")}
        addButton={
          <button type="button" onClick={() => setForm({ editing: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus size={14} /> {t("notification:addAlert")}
          </button>
        }
        renderView={(row) => (
          <dl className="grid gap-3">
            <ViewItem label={t("notification:code")}>{row.code}</ViewItem>
            <ViewItem label={t("notification:name")}>{row.name}</ViewItem>
            <ViewItem label={t("notification:institution")}>{row.inst_profile_name}</ViewItem>
            <ViewItem label={t("notification:channels")}>
              <ChannelChips row={row} t={t} />
            </ViewItem>
            {row.send_email && (
              <ViewItem label={t("notification:emailSubject")}>
                {row.email_subject}
                <p className="mt-1 whitespace-pre-wrap font-normal text-muted-foreground">{row.email_body}</p>
              </ViewItem>
            )}
            {row.send_sms && <ViewItem label={t("notification:smsBody")}>{row.sms_body}</ViewItem>}
            <ViewItem label={t("notification:recipients")}>
              {[...(row.group_ids ?? []).map(groupName), ...(row.notify_maker ? [t("notification:theMaker")] : [])].join(", ") || "-"}
            </ViewItem>
            <ViewItem label={t("notification:triggers")}>
              <ul className="space-y-0.5 font-normal">
                {(row.triggers ?? []).map((tr) => (
                  <li key={`${tr.menu_id}:${tr.action_id}`}>{describeTrigger(options, tr)}</li>
                ))}
              </ul>
            </ViewItem>
            <ViewItem label={t("common:status")}>{row.process_status_name ?? row.status_name}</ViewItem>
          </dl>
        )}
      />
      {form && (
        <NotificationAlertForm
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

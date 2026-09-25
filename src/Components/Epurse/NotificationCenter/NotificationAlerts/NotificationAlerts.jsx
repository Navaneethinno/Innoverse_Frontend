import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Inbox, Mail, MessageSquare, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { notificationAlertApi } from "@/Services/Epurse/notification.api";
import { LifecycleList } from "../../Onboarding/OnboardingConfiguration/LifecycleList";
import { ViewItem, draftAwareRow } from "../notificationShared";
import { NotificationAlertForm } from "./NotificationAlertForm";
import { describeTrigger, useAlertOptions } from "./useAlertOptions";
import { NotificationOutbox } from "./NotificationOutbox";

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

// EPURSE > Notification Center > Notification Alerts (menu 94). Hosts the
// alerts list and the read-only Outbox (the messages alerts produced), which
// has no menu of its own and needs View on this one — switched in ?view=,
// with ?alert=<id> narrowing the outbox to one alert.
export function NotificationAlerts() {
  const { t } = useTranslation("notification");
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "outbox" ? "outbox" : "alerts";
  const alertId = params.get("alert") ?? "";
  const show = (next, alert = "") => setParams(next === "outbox" ? { view: "outbox", ...(alert ? { alert } : {}) } : {}, { replace: true });

  return (
    <div>
      <SegmentedSwitch
        className="mb-3"
        options={[
          { value: "alerts", label: t("alertTitle") },
          { value: "outbox", label: t("outbox") },
        ]}
        value={view}
        onChange={(next) => show(next)}
      />
      <div key={view} className="segmented-view-enter">
        {view === "outbox" ? (
          <>
            <div className="mb-3">
              <h1 className="text-xl font-black text-slate-800">{t("outbox")}</h1>
              <p className="mt-1 text-xs text-muted-foreground">{t("outboxSubtitle")}</p>
            </div>
            <NotificationOutbox alertId={alertId} onAlertChange={(id) => show("outbox", id)} />
          </>
        ) : (
          <AlertsList onShowMessages={(id) => show("outbox", String(id))} />
        )}
      </div>
    </div>
  );
}

function AlertsList({ onShowMessages }) {
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
            <button
              type="button"
              onClick={() => onShowMessages(row.id)}
              className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-primary hover:bg-primary-light"
            >
              <Inbox size={14} /> {t("notification:viewMessages")}
            </button>
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

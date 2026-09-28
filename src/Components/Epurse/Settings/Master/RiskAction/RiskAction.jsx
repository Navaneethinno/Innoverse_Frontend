import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { riskActionApi } from "@/Services/Epurse/risk.api";
import { LifecycleList } from "../../../Onboarding/OnboardingConfiguration/LifecycleList";
import { ViewItem } from "../../../NotificationCenter/notificationShared";
import { RiskActionForm } from "./RiskActionForm";

// EPURSE > Settings > Master > Risk Action (menu 36, replaced Risk Category):
// the institution's own actions that each risk level points at (e.g.
// Onboard, Enhanced due diligence, Reject). An ordinary institution master.
export function RiskAction() {
  const { t } = useTranslation(["risk", "common"]);
  const [form, setForm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const openEdit = async (row) => setForm({ editing: row });

  const columns = [
    {
      key: "code",
      label: t("risk:code"),
      render: (row) => <span className="font-mono text-xs">{row.code ?? "-"}</span>,
    },
    {
      key: "name",
      label: t("risk:name"),
      align: "left",
      render: (row) => <span className="font-semibold">{row.name ?? "-"}</span>,
    },
    {
      key: "inst_profile_name",
      label: t("risk:institution"),
      render: (row) => row.inst_profile_name ?? "-",
    },
    {
      key: "description",
      label: t("common:description"),
      sortable: false,
      render: (row) => row.description || "-",
    },
  ];

  return (
    <>
      <LifecycleList
        title={t("risk:actionTitle")}
        subtitle={t("risk:actionSubtitle")}
        api={riskActionApi}
        menuName="Risk Action"
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => void openEdit(row)}
        auditFields={[
          ["code", t("risk:code")],
          ["name", t("risk:name")],
          ["description", t("common:description")],
        ]}
        emptyTitle={t("risk:noActionsFound")}
        addButton={
          <button
            type="button"
            onClick={() => setForm({ editing: null })}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            <Plus size={14} /> {t("risk:addAction")}
          </button>
        }
        renderView={(row) => (
          <dl className="grid gap-3">
            <ViewItem label={t("risk:code")}>{row.code}</ViewItem>
            <ViewItem label={t("risk:name")}>{row.name}</ViewItem>
            <ViewItem label={t("risk:institution")}>{row.inst_profile_name}</ViewItem>
            {row.description && (
              <ViewItem label={t("common:description")}>{row.description}</ViewItem>
            )}
            <ViewItem label={t("common:status")}>
              {row.process_status_name ?? row.status_name}
            </ViewItem>
          </dl>
        )}
      />
      {form && (
        <RiskActionForm
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

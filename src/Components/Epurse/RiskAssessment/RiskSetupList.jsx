import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { LifecycleList } from "../Onboarding/OnboardingConfiguration/LifecycleList";
import { ViewItem, draftAwareRow } from "../NotificationCenter/notificationShared";
import { LevelBar, LevelChip, RISK_KINDS, customerTypeLabel } from "./riskShared";
import { useRiskOptions } from "./useRiskOptions";
import { RiskSetupForm } from "./RiskSetupForm";
import { TestScorePanel } from "./TestScorePanel";

// EPURSE > Risk Assessment > Individual Risk (menu 97) / Corporate Risk (98):
// one risk setup per customer type of an institution.
export function RiskSetupList({ kind }) {
  const { t } = useTranslation(["risk", "common"]);
  const { api, menuName, titleKey, subtitleKey } = RISK_KINDS[kind];
  const [form, setForm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const openEdit = async (row) => setForm({ editing: await draftAwareRow(api, row) });

  const columns = [
    { key: "code", label: t("risk:code"), render: (row) => <span className="font-mono text-xs">{row.code ?? "-"}</span> },
    { key: "name", label: t("risk:name"), align: "left", render: (row) => <span className="font-semibold">{row.name ?? "-"}</span> },
    { key: "customer_type", label: t("risk:customerType"), sortable: false, render: (row) => customerTypeLabel(row) },
    { key: "inst_profile_name", label: t("risk:institution"), render: (row) => row.inst_profile_name ?? "-" },
    { key: "criteria", label: t("risk:criteria"), sortable: false, render: (row) => t("risk:criterionCount", { count: row.criteria?.length ?? 0 }) },
    {
      key: "levels",
      label: t("risk:levels"),
      sortable: false,
      render: (row) => (
        <span className="inline-flex flex-wrap gap-1">
          {(row.levels ?? []).map((l) => (
            <LevelChip key={l.code} level={l} />
          ))}
        </span>
      ),
    },
  ];

  return (
    <>
      <LifecycleList
        title={t(`risk:${titleKey}`)}
        subtitle={t(`risk:${subtitleKey}`)}
        api={api}
        menuName={menuName}
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => void openEdit(row)}
        auditFields={[["code", t("risk:code")], ["name", t("risk:name")], ["description", t("common:description")]]}
        emptyTitle={t("risk:noSetupsFound")}
        addButton={
          <button type="button" onClick={() => setForm({ editing: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus size={14} /> {t("risk:addSetup")}
          </button>
        }
        renderView={(row) => <SetupView kind={kind} row={row} />}
      />
      {form && (
        <RiskSetupForm
          kind={kind}
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

function SetupView({ kind, row }) {
  const { t } = useTranslation(["risk", "common"]);
  const { api } = RISK_KINDS[kind];
  const risk = useRiskOptions(api, row.inst_profile_id);

  return (
    <dl className="grid gap-3">
      <ViewItem label={t("risk:code")}>{row.code}</ViewItem>
      <ViewItem label={t("risk:name")}>{row.name}</ViewItem>
      <ViewItem label={t("risk:institution")}>{row.inst_profile_name}</ViewItem>
      <ViewItem label={t("risk:customerType")}>{customerTypeLabel(row)}</ViewItem>
      {row.description && <ViewItem label={t("common:description")}>{row.description}</ViewItem>}
      <ViewItem label={t("risk:criteria")}>
        <ul className="mt-1 space-y-0.5 font-normal">
          {(row.criteria ?? []).map((c) => (
            <li key={c.field_code} className="flex justify-between gap-2">
              <span>{risk.fieldName(c.field_code)}</span>
              <span className="tabular-nums text-muted-foreground">{c.weight}%</span>
            </li>
          ))}
        </ul>
      </ViewItem>
      <ViewItem label={t("risk:levels")}>
        <div className="mt-1">
          <LevelBar levels={row.levels} />
        </div>
        <ul className="mt-1 space-y-1 font-normal">
          {(row.levels ?? []).map((l) => (
            <li key={l.code} className="flex items-center justify-between gap-2">
              <LevelChip level={l} />
              <span className="tabular-nums text-muted-foreground">
                {l.min_score}–{l.max_score} · {risk.actionName(l.risk_action_id)}
              </span>
            </li>
          ))}
        </ul>
      </ViewItem>
      <ViewItem label={t("common:status")}>{row.process_status_name ?? row.status_name}</ViewItem>
      <TestScorePanel api={api} row={row} risk={risk} />
    </dl>
  );
}

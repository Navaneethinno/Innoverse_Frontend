import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { amlSetupApi } from "@/Services/InnoAML/aml.api";
import { LifecycleList } from "@/Components/Epurse/Onboarding/OnboardingConfiguration/LifecycleList";
import { ViewItem } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { LevelBar, LevelChip } from "@/Components/Epurse/RiskAssessment/riskShared";
import { AMLSetupForm } from "./AMLSetupForm";

// InnoAML > AML Configuration > AML Setup (menu 100): each institution's one
// setup — how a screening score reads (bands → risk actions), the minimum
// match score and ongoing re-screening. Institution users see their one
// row; Service Provider users one row per institution.
export function AMLSetup() {
  const { t } = useTranslation(["aml", "common"]);
  const [form, setForm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const openEdit = async (row) => setForm({ editing: row });
  const bands = (row) => (
    <span className="inline-flex flex-wrap gap-1">
      {(row.levels ?? []).map((l) => (
        <LevelChip key={l.code} level={l} />
      ))}
    </span>
  );

  const columns = [
    { key: "inst_profile_name", label: t("aml:institution"), align: "left", render: (row) => <span className="font-semibold">{row.inst_profile_name ?? "-"}</span> },
    { key: "levels", label: t("aml:bands"), sortable: false, render: bands },
    { key: "min_match_score", label: t("aml:minMatchScore"), render: (row) => row.min_match_score ?? "-" },
    { key: "ongoing_rescreen", label: t("aml:ongoingRescreen"), render: (row) => (row.ongoing_rescreen ? t("common:yes") : t("common:no")) },
  ];

  return (
    <>
      <LifecycleList
        title={t("aml:setupTitle")}
        subtitle={t("aml:setupSubtitle")}
        api={amlSetupApi}
        menuName="AML Setup"
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => void openEdit(row)}
        describeRow={(row) => row?.inst_profile_name ?? row?.description ?? String(row?.id)}
        auditFields={[
          ["description", t("common:description")],
          ["min_match_score", t("aml:minMatchScore")],
          ["ongoing_rescreen", t("aml:ongoingRescreen")],
        ]}
        emptyTitle={t("aml:noSetup")}
        addButton={
          <button type="button" onClick={() => setForm({ editing: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus size={14} /> {t("aml:addSetup")}
          </button>
        }
        renderView={(row) => (
          <dl className="grid gap-3">
            <ViewItem label={t("aml:institution")}>{row.inst_profile_name}</ViewItem>
            {row.description && <ViewItem label={t("common:description")}>{row.description}</ViewItem>}
            <ViewItem label={t("aml:minMatchScore")}>{row.min_match_score}</ViewItem>
            <ViewItem label={t("aml:ongoingRescreen")}>{row.ongoing_rescreen ? t("common:yes") : t("common:no")}</ViewItem>
            <ViewItem label={t("aml:bands")}>
              <div className="mt-1">
                <LevelBar levels={row.levels} />
              </div>
              <ul className="mt-1 space-y-1 font-normal">
                {(row.levels ?? []).map((l) => (
                  <li key={l.code} className="flex items-center justify-between gap-2">
                    <LevelChip level={l} />
                    <span className="tabular-nums text-muted-foreground">
                      {l.min_score}–{l.max_score} · {l.risk_action_name ?? (l.risk_action_id ? `#${l.risk_action_id}` : "-")}
                    </span>
                  </li>
                ))}
              </ul>
            </ViewItem>
            <ViewItem label={t("common:status")}>{row.process_status_name ?? row.status_name}</ViewItem>
          </dl>
        )}
      />
      {form && (
        <AMLSetupForm
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

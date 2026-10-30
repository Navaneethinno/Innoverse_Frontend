import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useTranslation } from "react-i18next";
import { Briefcase, Settings2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { RowActions } from "@/Components/Common/RowActions";
import { onboardingCasesApi } from "@/Services/CaseManagement/onboardingCases.api";
import { amlCasesApi } from "@/Services/CaseManagement/amlCases.api";
import { supportCasesApi } from "@/Services/CaseManagement/supportCases.api";
import { AmlPill, CaseStatus, OverdueFlag, PriorityFlag, ReasonChips, RiskPill, ageText, caseDate, subjectKind } from "./caseShared";
import { CaseView } from "./CaseView";
import { CaseSettings } from "./CaseSettings";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

// What differs between the case queues (Onboarding Cases, AML Cases).
// Optional: `columns(t)` added after the subject, `HeaderAction` beside the
// title, `TopPanel` above a case's tabs, `closeOutcomes` asked when closing.
export const ONBOARDING_QUEUE = {
  kind: "onboarding",
  api: onboardingCasesApi,
  outcomes: ["APPROVED", "REJECTED", "WITHDRAWN"],
  titleKey: "title",
  subtitleKey: "subtitle",
  settings: true,
};
// AML Cases: a customer's reply waits in its own tab, listed first.
export const AML_QUEUE = {
  kind: "aml",
  api: amlCasesApi,
  outcomes: ["CLEARED", "CONFIRMED", "NO_ACTION"],
  titleKey: "amlTitle",
  subtitleKey: "amlSubtitle",
  settings: false,
};
// Customer Cases: support cases the customer opened; a new one starts as
// CUSTOMER_REPLIED (their message comes first).
export const SUPPORT_QUEUE = {
  ...AML_QUEUE,
  kind: "support",
  api: supportCasesApi,
  categories: ["ACCOUNT", "TRANSACTION", "CARD", "COMPLAINT", "OTHER"],
  outcomes: ["RESOLVED", "WITHDRAWN"],
  titleKey: "supportTitle",
  subtitleKey: "supportSubtitle",
};

// CASE MANAGEMENT > Onboarding Cases (menu 179): the queue of new customers
// and merchants whose risk / AML result needs a person to decide. Open
// cases first, HIGH priority first, then newest (server order).
export function OnboardingCases() {
  return <CaseQueue config={ONBOARDING_QUEUE} />;
}

// A case queue (`config`: ONBOARDING_QUEUE or AML_QUEUE with its api). A
// page opened with { caseId } in its state starts on that case.
export function CaseQueue({ config }) {
  const { t } = useTranslation(["cases", "common"]);
  const { api } = config;
  // AML and support cases are conversations with an active customer.
  const conversational = config.kind !== "onboarding";
  const location = useLocation();
  const [openId, setOpenId] = useState(() => location.state?.caseId ?? null);
  const [openedFor, setOpenedFor] = useState(location.state?.menuClick);
  if (location.state?.caseId && location.state.menuClick !== openedFor) {
    setOpenedFor(location.state.menuClick);
    setOpenId(location.state.caseId);
  }
  const [settings, setSettings] = useState(false);

  const list = useServerList({ api: api.listPath, call: api.list });
  const load = list.reload;
  useLiveChannel(api.listPath, () => load());

  if (settings) {
    return (
      <CaseSettings
        onBack={() => {
          setSettings(false);
          load();
        }}
      />
    );
  }

  if (openId) {
    return (
      <CaseView
        id={openId}
        config={config}
        onBack={() => {
          setOpenId(null);
          load();
        }}
      />
    );
  }

  const columns = [
    {
      key: "case_number",
      label: t("caseNumber"),
      render: (c) => (
        <button type="button" onClick={() => setOpenId(c.id)} className="flex flex-col items-start gap-1 text-left">
          <span className="font-mono text-xs font-bold text-primary hover:underline">{c.case_number}</span>
          <span className="flex flex-wrap gap-1">
            <PriorityFlag priority={c.priority} />
            <OverdueFlag overdue={c.overdue} />
          </span>
        </button>
      ),
    },
    {
      key: "subject",
      label: t("subject"),
      align: "left",
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{c.subject?.name || t("noNameYet")}</p>
          <p className="text-[10px] text-muted-foreground">{subjectKind(t, c.subject)}{c.subject?.customer_type ? ` · ${c.subject.customer_type}` : ""}</p>
        </div>
      ),
    },
    ...(config.columns?.(t) ?? []),
    { key: "reasons", label: t("reasons"), sortable: false, render: (c) => <ReasonChips reasons={c.reasons} /> },
    ...(conversational
      ? [
          {
            key: "title",
            label: t("caseTitle"),
            align: "left",
            sortable: false,
            render: (c) => (
              <div className="min-w-0 max-w-64">
                {c.category && <span className="mb-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{t(`category_${c.category}`, { defaultValue: c.category })}</span>}
                <p dir="auto" className="line-clamp-2 text-xs">{c.title || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.last_customer_at ? t("customerLastAt", { date: caseDate(c.last_customer_at) }) : c.last_staff_at ? t("staffLastAt", { date: caseDate(c.last_staff_at) }) : ""}
                </p>
              </div>
            ),
          },
        ]
      : [
          { key: "risk", label: t("riskLevel"), sortable: false, render: (c) => <RiskPill risk={c.risk} /> },
          { key: "aml", label: t("amlBand"), sortable: false, render: (c) => <AmlPill aml={c.aml} /> },
        ]),
    { key: "status", label: t("status"), render: (c) => <CaseStatus status={c.status} outcome={c.outcome} /> },
    { key: "assigned_to", label: t("assignee"), render: (c) => <span className="text-xs">{c.assigned_to?.name ?? <span className="text-muted-foreground">{t("unassigned")}</span>}</span> },
    { key: "age_hours", label: t("age"), render: (c) => (
        <span className={c.overdue ? "whitespace-nowrap text-xs font-bold tabular-nums text-red-700" : "whitespace-nowrap text-xs tabular-nums"} title={c.due_at ? t("dueOn", { date: caseDate(c.due_at) }) : undefined}>
          {ageText(c.age_hours)}
        </span>
      ),
    },
    { key: "actions", label: t("common:actions"), sortable: false, render: (c) => <RowActions buttons={{ view: true }} onView={() => setOpenId(c.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Briefcase size={22} className="text-primary" /> {t(config.titleKey)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(config.subtitleKey)}</p>
        </div>
        <div className="flex gap-2">
          {config.HeaderAction && <config.HeaderAction onOpened={(id) => setOpenId(id)} />}
          {config.settings && (
            <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setSettings(true)}>
              {t("settings")}
            </Button>
          )}
        </div>
      </div>

      <ListTable list={list} columns={columns} rowKey={(c) => c.id} title={t(config.titleKey)} emptyTitle={t("noCases")} emptyDescription={t(config.emptyHintKey ?? "noCasesHint")} />
    </div>
  );
}

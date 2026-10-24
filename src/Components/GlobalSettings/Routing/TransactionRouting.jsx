import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Tabs, useInstitutionScope } from "@/Components/Finance/Loans/loanShared";
import { Decisions, HealthBoard, Simulator } from "./RoutingLive";
import { SetupEditor, SetupList, SetupView } from "./RoutingSetup";

// GLOBAL SETTINGS > Transaction Routing (menu 192): where a transaction goes.
// Services (airtime, electricity, bills, transfers) go to a ranked group of
// connections; other banks' cards at our terminals by their BIN's issuer.
// The setup is one record per institution under maker-checker, like External
// Providers; the health board, simulator and decisions read the live one.
const PAGE_TABS = ["setups", "health", "simulator", "decisions"];

export function TransactionRouting() {
  const { t } = useTranslation("routing");
  const { chooser, institution, scope } = useInstitutionScope();
  const [tab, setTab] = useState("setups");
  const [screen, setScreen] = useState(null);
  // Live views need an institution: a platform user picks one in the header.
  const needsInstitution = chooser && !institution;

  if (screen?.kind === "edit") {
    return (
      <SetupEditor
        setup={screen.setup}
        scope={scope}
        onClose={() => setScreen(screen.setup ? { kind: "view", id: screen.setup.id } : null)}
        onSaved={(id) => setScreen({ kind: "view", id })}
        onSimulate={() => {
          setScreen(null);
          setTab("simulator");
        }}
      />
    );
  }
  if (screen?.kind === "view") return <SetupView id={screen.id} onBack={() => setScreen(null)} onEdit={(setup) => setScreen({ kind: "edit", setup })} />;

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle>{t("title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs tabs={PAGE_TABS.map((key) => ({ key }))} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />
      {tab === "setups" && <SetupList scope={scope} chooser={chooser} institution={institution} onOpen={setScreen} />}
      {tab !== "setups" && needsInstitution && <p className="py-8 text-center text-sm text-muted-foreground">{t("pickInstitution")}</p>}
      {!needsInstitution && tab === "health" && <HealthBoard key={institution} scope={scope} />}
      {!needsInstitution && tab === "simulator" && <Simulator key={institution} scope={scope} instProfileId={scope().inst_profile_id} />}
      {!needsInstitution && tab === "decisions" && <Decisions key={institution} instProfileId={scope().inst_profile_id} />}
    </div>
  );
}

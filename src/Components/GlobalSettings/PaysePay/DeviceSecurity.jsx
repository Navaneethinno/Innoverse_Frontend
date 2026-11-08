import { useTranslation } from "react-i18next";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { deviceSecurityApi } from "@/Services/PaysePay/paysePay.api";
import { DocFields, asForm, rangeProblem, typed } from "./docShared";

const MODES = ["OFF", "MONITOR", "ENFORCE"];
const VERIFIERS = ["AUTO", "TEST"];
const GROUPS = ["binding", "integrity", "face"];

function groupsOf(t, data) {
  const modes = (Array.isArray(data?.modes) && data.modes.length ? data.modes : MODES).map((m) => ({ value: m, label: t(`ds_mode_${m}`, { defaultValue: m }) }));
  return {
    binding: [
      { key: "mode", label: t("ds_mode"), type: "select", options: modes, hint: t("ds_bindingModeHint") },
      { key: "max_devices", label: t("ds_maxDevices"), type: "int", min: 1, max: 5, hint: t("ds_range", { min: 1, max: 5 }) },
      { key: "secondary_allowed", label: t("ds_secondaryAllowed"), type: "bool" },
      { key: "cooling_mins", label: t("ds_coolingMins"), type: "int", min: 0, max: 43200, hint: t("ds_coolingMinsHint") },
      { key: "cooling_cap", label: t("ds_coolingCap"), type: "amount", hint: t("ds_coolingCapHint"), emptyText: t("noLimit") },
      { key: "alerts", label: t("ds_alerts"), type: "bool" },
    ],
    integrity: [
      { key: "mode", label: t("ds_mode"), type: "select", options: modes },
      { key: "verifier", label: t("ds_verifier"), type: "select", options: VERIFIERS.map((v) => ({ value: v, label: t(`ds_verifier_${v}`) })), hint: t("ds_verifierHint") },
      { key: "android_package", label: t("ds_androidPackage"), placeholder: "com.example.app" },
      { key: "ios_bundle_id", label: t("ds_iosBundle"), placeholder: "com.example.app" },
      { key: "ios_team_id", label: t("ds_iosTeam") },
      { key: "nonce_ttl_secs", label: t("ds_nonceTtl"), type: "int", min: 30, max: 3600, hint: t("ds_range", { min: 30, max: 3600 }) },
      { key: "require_strong", label: t("ds_requireStrong"), type: "bool" },
      { key: "allow_unverified", label: t("ds_allowUnverified"), type: "bool" },
    ],
    face: [
      { key: "on_bind", label: t("ds_faceOnBind"), type: "bool" },
      { key: "on_pin_reset", label: t("ds_faceOnPinReset"), type: "bool" },
      { key: "above_amount", label: t("ds_faceAboveAmount"), type: "amount", hint: t("ds_faceAboveAmountHint"), emptyText: t("noLimit") },
      { key: "blacklist_check", label: t("ds_faceBlacklist"), type: "bool" },
      { key: "max_failures", label: t("ds_faceMaxFailures"), type: "int", min: 1, max: 20, hint: t("ds_range", { min: 1, max: 20 }) },
      { key: "block_mins", label: t("ds_faceBlockMins"), type: "int", min: 1, max: 10080, hint: t("ds_range", { min: 1, max: 10080 }) },
    ],
  };
}

// GLOBAL SETTINGS > Device Security (menu 224): device binding, app
// integrity and face checks. One document under maker-checker.
export function DeviceSecurity() {
  const { t } = useTranslation("paysePay");
  const groups = groupsOf(t, null);
  const toForm = (setup) => Object.fromEntries(GROUPS.map((g) => [g, asForm(groups[g], setup?.[g] ?? {})]));
  return (
    <SectionScreen
      api={deviceSecurityApi}
      ns="paysePay"
      valueKey="setup"
      framed={false}
      fallbackTitle={t("ds_title")}
      subtitle={t("ds_subtitle")}
      toForm={toForm}
      bodyOf={(form) => Object.fromEntries(GROUPS.map((g) => [g, typed(groups[g], form[g])]))}
      problemOf={(_, form) => GROUPS.map((g) => rangeProblem(t, groups[g], form[g])).find(Boolean) ?? ""}
    >
      {({ data, shown, editing, setForm }) => {
        const fields = groupsOf(t, data);
        return GROUPS.map((g) => (
          <Section key={g} title={t(`ds_group_${g}`)}>
            <DocFields fields={fields[g]} value={shown?.[g]} editing={editing} onChange={(v) => setForm((f) => ({ ...f, [g]: v }))} />
          </Section>
        ));
      }}
    </SectionScreen>
  );
}

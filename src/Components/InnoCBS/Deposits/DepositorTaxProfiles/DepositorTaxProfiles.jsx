import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { PartyPick, cell, codes, splitParty, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { TaxCertificate, taxProfileApi, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function DepositorTaxProfiles() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={taxProfileApi}
      title={L("depositorTaxProfiles")}
      subtitle={L("TIN, residency and exemptions of depositors, and the yearly tax certificate.")}
      effectiveDated
      columns={[
        { key: "tax_identification_number", label: L("tax_identification_number"), render: (r) => cell(sv(r, "tax_identification_number")) },
        { key: "exemption_type", label: L("exemption_type"), render: (r) => cell(words(sv(r, "exemption_type"))) },
      ]}
      fields={[
        { key: "party", label: L("Depositor"), type: "custom", required: true, from: (s) => (s.entity_id ? `${s.entity_type}:${s.entity_id}` : ""), render: (v, set) => <PartyPick value={v} onChange={set} /> },
        f("tax_identification_number", "text", { required: true }),
        f("tax_residency", "text", { placeholder: "NG" }),
        f("exemption_type", "select", { options: codes("exemption_types") }),
        f("exemption_certificate"),
        f("withholding_rate", "rate", { hint: L("Leave empty for the standard rate.") }),
        f("treaty_country"),
        f("effective_from", "date", { required: true }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name"),
        f("remarks", "textarea"),
      ]}
      bodyOf={({ party, ...x }) => ({ ...x, ...splitParty(party) })}
      extraTabs={[{ key: "certificate", label: L("Tax certificate"), render: (r) => <TaxCertificate record={r} /> }]}
    />
  );
}

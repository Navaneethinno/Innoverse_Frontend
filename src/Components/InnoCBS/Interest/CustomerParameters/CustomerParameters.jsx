import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { ParameterValues, cell, codes, paramApi, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function CustomerParameters() {
  const L = useL();
  const fields = [
    { key: "code", label: L("code"), type: "code", required: true, fixedOnEdit: true, placeholder: "CREDIT_SCORE_BAND" },
    { key: "name", label: L("name"), required: true },
    { key: "kind", label: L("kind"), type: "select", required: true, options: codes("kinds") },
    { key: "source", label: L("source"), type: "select", options: codes("sources") },
    { key: "applies_to", label: L("applies_to"), type: "multi", options: codes("applies_to") },
    { key: "regulated", label: L("regulated"), type: "bool", hint: L("A regulated dimension (such as gender) must be justified under fair-lending rules.") },
    { key: "description", label: L("description"), type: "textarea" },
  ];
  return (
    <RecordScreen
      api={paramApi}
      title={L("customerParameters")}
      subtitle={L("Customer parameters a rate can depend on: segment, risk category, loan type, credit score bands.")}
      columns={[
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? r.setup?.kind)) },
        { key: "values", label: L("values"), sortable: false, render: (r) => cell((r.values ?? r.setup?.values ?? []).length) },
      ]}
      fields={[...fields, { key: "values", label: L("values"), type: "custom", wide: true, render: (v, set, form) => <ParameterValues value={v} onChange={set} band={form.kind === "BAND"} /> }]}
      factsOf={(s) => [...fields.map((f) => [f.label, Array.isArray(s[f.key]) ? s[f.key].map(words).join(", ") || "—" : typeof s[f.key] === "boolean" ? (s[f.key] ? "✓" : "—") : words(s[f.key]) || "—"]), [L("values"), (s.values ?? []).map((v) => `${v.name}${v.min !== undefined && v.min !== "" ? ` (${v.min}–${v.max || "∞"})` : ""}${v.active === false ? " ✕" : ""}`).join(", ") || "—"]]}
    />
  );
}

import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, coded, codes, mappingApi, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function ProductInterestMapping() {
  const L = useL();
  return (
    <RecordScreen
      api={mappingApi}
      title={L("productInterestMapping")}
      subtitle={L("Which scheme prices which product. A mapped product takes its rate from the scheme at booking.")}
      effectiveDated
      columns={[
        { key: "product_code", label: L("product"), render: (r) => cell(`${words(r.product_kind ?? r.setup?.product_kind)} · ${r.product_code ?? r.setup?.product_code ?? ""}`) },
        { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(r.scheme_code ?? r.setup?.scheme_code) },
      ]}
      fields={[
        { key: "product_kind", label: L("product_kind"), type: "select", required: true, options: codes("product_kinds"), fixedOnEdit: true },
        { key: "product_id", label: L("product"), type: "select", required: true, fixedOnEdit: true, options: () => [], dependsOn: "product_kind", optionsFor: (c, form) => (c.products?.[form.product_kind] ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` })) },
        { key: "scheme_code", label: L("scheme_code"), type: "select", required: true, options: coded("schemes") },
        { key: "penal_scheme_code", label: L("penal_scheme_code"), type: "select", options: coded("schemes") },
        { key: "rate_type", label: L("rate_type"), type: "select", options: codes("rate_types") },
        { key: "effective_from", label: L("effective_from"), type: "date" },
        { key: "mandatory", label: L("mandatory"), type: "bool" },
        { key: "override_allowed", label: L("override_allowed"), type: "bool" },
        { key: "code", label: L("code"), type: "code", fixedOnEdit: true, hint: L("Leave empty and the server gives one.") },
        { key: "name", label: L("name"), hint: L("Leave empty and the server names it.") },
      ]}
      bodyOf={(x) => ({ ...x, product_id: Number(x.product_id) })}
    />
  );
}

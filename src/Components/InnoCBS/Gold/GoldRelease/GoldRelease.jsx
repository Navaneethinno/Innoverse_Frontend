import { PackageCheck, Undo2, XCircle } from "lucide-react";
import { cell, pct, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, isPending } from "@/Components/InnoCBS/OpsList";
import { ReleaseOrnaments, gl, releaseApi, uploadField, useGoldOptions, useValuations } from "@/Components/InnoCBS/Gold/goldShared";

export function GoldRelease() {
  const L = useL();
  useGoldOptions();
  const valuations = useValuations({ open_packet: true });
  return (
    <OpsList
      api={releaseApi}
      title="goldRelease"
      sub="Full or partial release of the gold with handover evidence; a second user approves."
      columns={[
        { key: "valuation_number", label: L("valuation"), render: (r) => cell(r.valuation_number ?? r.valuation_id) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? (r.ornament_ids?.length ? "PARTIAL" : "FULL"))) },
        { key: "ornaments", label: L("Ornaments"), render: (r) => cell(Array.isArray(r.ornament_ids) ? r.ornament_ids.length : r.ornaments) },
        { key: "ltv_after", label: L("LTV after"), render: (r) => cell(r.ltv_after ? pct(r.ltv_after) : "—") },
        { key: "requested_by", label: L("requested_by"), render: (r) => cell(r.requested_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Request a release"),
          icon: Undo2,
          right: "Add",
          dialog: {
            title: L("Request a release"),
            hint: L("The LTV after a partial release is checked."),
            fields: [{ key: "valuation_id", label: L("valuation"), type: "select", required: true, options: valuations }],
            initial: { ornament_ids: [] },
            children: (form, setForm) => <ReleaseOrnaments valuationId={form.valuation_id} value={form.ornament_ids} onChange={(v) => setForm((x) => ({ ...x, ornament_ids: v }))} />,
            run: (x) => releaseApi.add({ valuation_id: Number(x.valuation_id), ...(x.ornament_ids?.length ? { ornament_ids: x.ornament_ids.map(Number) } : {}) }),
          },
        },
      ]}
      rowActions={(r) => [
        {
          key: "auth",
          label: L("Hand over"),
          icon: PackageCheck,
          right: "Authorize",
          show: isPending,
          dialog: {
            title: L("Hand over the gold"),
            hint: L("Record the handover evidence; this approves the release."),
            fields: [
              { key: "identity_verification", label: L("identity_verification"), required: true, placeholder: "NIN card" },
              { key: "packet_condition", label: L("packet_condition"), type: "select", required: true, options: gl("packet_conditions", ["INTACT", "DAMAGED", "BROKEN", "REPLACED"]) },
              uploadField(L, "customer_signature", "CUSTOMER_SIGNATURE"),
              { key: "new_seal", label: L("new_seal_number"), hint: L("When the packet is resealed (REPLACED)."), showIf: (x) => x.packet_condition === "REPLACED" },
            ],
            initial: { packet_condition: "INTACT" },
            run: (x) => releaseApi.auth({ id: Number(r.id), handover: x }),
          },
        },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: releaseApi.deauth, body: { id: Number(r.id) } },
      ]}
    />
  );
}

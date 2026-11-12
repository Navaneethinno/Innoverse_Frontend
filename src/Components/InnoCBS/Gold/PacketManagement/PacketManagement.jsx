import { Package, ShieldCheck } from "lucide-react";
import { cell, useL } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { gl, packetApi, uploadField, useGoldOptions, useValuations } from "@/Components/InnoCBS/Gold/goldShared";

export function PacketManagement() {
  const L = useL();
  useGoldOptions();
  const valuations = useValuations(null, (v) => v.actions?.pack);
  return (
    <OpsList
      api={packetApi}
      title="packetManagement"
      sub="Ornaments packed under a seal; a second employee verifies the seal."
      columns={[
        { key: "packet_number", label: L("packet"), render: (r) => <span className="font-mono text-xs font-bold">{r.packet_number}</span> },
        { key: "seal_number", label: L("seal_number"), render: (r) => cell(r.seal_number) },
        { key: "valuation_number", label: L("valuation"), render: (r) => cell(r.valuation_number) },
        { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number) },
        { key: "ornaments", label: L("Ornaments"), render: (r) => cell(r.ornaments) },
        { key: "locker_code", label: L("locker"), render: (r) => cell(r.locker_code) },
        { key: "packed_by", label: L("packed_by"), render: (r) => cell(r.packed_by) },
        { key: "verified_by", label: L("verified_by"), render: (r) => cell(r.verified_by ? `${r.verified_by} · ${r.last_verified}` : "—") },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Pack and seal"),
          icon: Package,
          right: "Add",
          dialog: {
            title: L("Pack and seal"),
            fields: [
              { key: "valuation_id", label: L("valuation"), type: "select", required: true, options: valuations },
              { key: "packet_number", label: L("packet_number"), required: true, placeholder: "AP-PKT-0003" },
              { key: "seal_number", label: L("seal_number"), required: true, placeholder: "AP-SEAL-10023" },
              uploadField(L, "photo", "PACKET_PHOTO"),
            ],
            run: (x) => packetApi.add({ ...x, valuation_id: Number(x.valuation_id) }),
          },
        },
      ]}
      rowActions={(r) => [
        {
          key: "verify",
          label: L("Verify seal"),
          icon: ShieldCheck,
          right: "Authorize",
          show: (x) => !x.verified_by,
          dialog: { title: `${L("Verify seal")} · ${r.packet_number}`, hint: L("Another employee checks the seal."), fields: [{ key: "seal_condition", label: L("seal_condition"), type: "select", required: true, options: gl("seal_conditions", ["INTACT", "DAMAGED", "BROKEN", "REPLACED"]) }], run: (x) => packetApi.verify({ id: Number(r.id), ...x }) },
        },
      ]}
    />
  );
}

import { useEffect, useState } from "react";
import { CheckCircle2, Truck, XCircle } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, isPending } from "@/Components/InnoCBS/OpsList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { gl, lockerApi, movementApi, packetApi, uploadField, useActive, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function PacketMovement() {
  const L = useL();
  useGoldOptions();
  const lockers = useActive(lockerApi);
  const [packets, setPackets] = useState([]);
  useEffect(() => {
    packetApi
      .list({ page: 1, page_size: 100 })
      .then((r) => setPackets(rowsOf(r).map((p) => ({ value: String(p.id), label: `${p.packet_number} · ${p.locker_code || words(p.status)}` }))))
      .catch(() => {});
  }, []);
  return (
    <OpsList
      api={movementApi}
      title="packetMovement"
      sub="Packets deposited, withdrawn or transferred between lockers; a second employee approves."
      columns={[
        { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
        { key: "packet_number", label: L("packet"), render: (r) => <span className="font-mono text-xs">{r.packet_number}</span> },
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind)) },
        { key: "route", label: L("From → to"), sortable: false, render: (r) => cell(`${r.from_location || "—"} → ${r.to_location || "—"}`) },
        { key: "reason", label: L("reason"), render: (r) => cell(r.reason) },
        { key: "seal_condition", label: L("seal_condition"), render: (r) => cell(words(r.seal_condition)) },
        { key: "initiated_by", label: L("initiated_by"), render: (r) => cell(r.initiated_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Move a packet"),
          icon: Truck,
          right: "Add",
          dialog: {
            title: L("Move a packet"),
            hint: L("Another employee approves the movement."),
            fields: [
              { key: "packet_id", label: L("packet"), type: "select", required: true, options: packets },
              { key: "kind", label: L("kind"), type: "select", required: true, options: gl("movement_kinds", ["DEPOSIT"]) },
              { key: "to_locker_code", label: L("To locker"), type: "select", options: lockers, showIf: (x) => ["DEPOSIT", "RETURN_TO_LOCKER", "TRANSFER_LOCKER", "TRANSFER_BRANCH", "RECEIVE_BRANCH"].includes(x.kind) },
              { key: "seal_condition", label: L("seal_condition"), type: "select", required: true, options: gl("seal_conditions", ["INTACT", "DAMAGED", "BROKEN", "REPLACED"]) },
              { key: "reason", label: L("reason"), required: true, wide: true },
              uploadField(L, "evidence", "MOVEMENT_EVIDENCE"),
            ],
            initial: { kind: "DEPOSIT", seal_condition: "INTACT" },
            run: (x) => movementApi.add({ ...x, packet_id: Number(x.packet_id) }),
          },
        },
      ]}
      rowActions={(r) => [
        { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, call: movementApi.auth, body: { id: Number(r.id) } },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: movementApi.deauth, body: { id: Number(r.id) } },
      ]}
    />
  );
}

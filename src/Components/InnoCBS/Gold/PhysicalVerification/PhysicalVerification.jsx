import { useState } from "react";
import { ClipboardCheck, Trash2 } from "lucide-react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsInput, cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { exceptionApi, lockerApi, useActive, useGoldOptions, verificationApi } from "@/Components/InnoCBS/Gold/goldShared";

// ---------- Physical verification ----------

export function PhysicalVerification() {
  const L = useL();
  useGoldOptions();
  const lockers = useActive(lockerApi);
  const [tab, setTab] = useState("verifications");
  return (
    <div className="pt-1">
      <h1 className="text-2xl font-black">{L("physicalVerification")}</h1>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">{L("Count the packets in a locker; missing, unexpected or broken packets become custody exceptions.")}</p>
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "verifications", label: L("Verifications") }, { value: "exceptions", label: L("Custody exceptions") }]} />
      {tab === "verifications" ? (
        <OpsList
          api={verificationApi}
          columns={[
            { key: "verified_at", label: L("when"), render: (r) => dateCell(r.verified_at) },
            { key: "locker_code", label: L("locker"), render: (r) => cell(r.locker_code) },
            { key: "expected", label: L("expected"), render: (r) => cell(r.expected) },
            { key: "found", label: L("found"), render: (r) => cell(r.found) },
            { key: "exceptions", label: L("exceptions"), render: (r) => <span className={`text-xs ${Number(r.exceptions) > 0 ? "font-bold text-red-700" : ""}`}>{r.exceptions}</span> },
            { key: "verified_by", label: L("verified_by"), render: (r) => cell(r.verified_by) },
            { key: "remarks", label: L("remarks"), render: (r) => cell(r.remarks) },
          ]}
          toolbar={[
            {
              key: "add",
              label: L("Record a count"),
              icon: ClipboardCheck,
              right: "Add",
              dialog: {
                size: "lg",
                title: L("Record a count"),
                fields: [{ key: "locker_code", label: L("locker"), type: "select", required: true, options: lockers }],
                initial: { found: [] },
                children: (form, setForm) => (
                  <div className={`${labelClass} mb-3`}>
                    {L("Packets found")}
                    <RowsInput value={form.found} onChange={(v) => setForm((x) => ({ ...x, found: v }))} blank={() => ({ packet_number: "", seal_number: "", seal_intact: true })} addLabel={L("Add packet")} columns={[{ key: "packet_number", label: L("packet_number") }, { key: "seal_number", label: L("seal_number") }, { key: "seal_intact", label: L("seal_intact"), type: "bool" }]} />
                  </div>
                ),
                run: (x) => verificationApi.add({ locker_code: x.locker_code, found: x.found }),
              },
            },
          ]}
        />
      ) : (
        <OpsList
          api={exceptionApi}
          prefix="ex_"
          columns={[
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time ?? r.raised_at) },
            { key: "locker_code", label: L("locker"), render: (r) => cell(r.locker_code) },
            { key: "packet_number", label: L("packet"), render: (r) => cell(r.packet_number) },
            { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? r.exception_type)) },
            { key: "detail", label: L("detail"), render: (r) => cell(r.detail) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          ]}
          rowActions={(r) => [{ key: "resolve", label: L("Resolve"), icon: Trash2, right: "Authorize", show: (x) => x.status !== "RESOLVED", dialog: { title: L("Resolve the exception"), fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => exceptionApi.resolve({ id: Number(r.id), remarks: x.remarks }) } }]}
        />
      )}
    </div>
  );
}

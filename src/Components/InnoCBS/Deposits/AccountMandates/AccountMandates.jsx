import { useState } from "react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useL } from "@/Components/InnoCBS/cbsOps";
import { MandateInstructions, MandateRecords } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function AccountMandates() {
  const [tab, setTab] = useState("mandates");
  const L0 = useL();
  const switcher = <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "mandates", label: L0("Mandates") }, { value: "instructions", label: L0("Debit instructions") }]} />;
  if (tab === "instructions")
    return (
      <div className="pt-1">
        {switcher}
        <MandateInstructions />
      </div>
    );
  return (
    <>
      <div className="pt-1">{switcher}</div>
      <MandateRecords />
    </>
  );
}

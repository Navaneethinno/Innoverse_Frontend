import { CheckCircle2, Gavel, HandCoins, Lock, Plus, XCircle } from "lucide-react";
import { cell, dateCell, useL } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, isPending } from "@/Components/InnoCBS/OpsList";
import { EligibilityCheck, auctionApi, facilityInput, gl, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function AuctionManagement() {
  const L = useL();
  useGoldOptions();
  const st = (r, ...s) => s.includes(r.status);
  return (
    <OpsList
      api={auctionApi}
      title="auctionManagement"
      sub="Eligibility, approval, schedule, bids, completion and surplus refund."
      above={() => (
        <div className="mb-3">
          <EligibilityCheck />
        </div>
      )}
      columns={[
        { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "auction_date", label: L("auction_date"), render: (r) => dateCell(r.auction_date) },
        { key: "reserve_price", label: L("reserve_price"), render: (r) => cell(r.reserve_price) },
        { key: "highest_bid", label: L("highest_bid"), render: (r) => cell(r.highest_bid ? `${r.highest_bid} · ${r.highest_bidder ?? ""}` : "—") },
        { key: "surplus", label: L("Surplus / shortfall"), render: (r) => cell(r.surplus || r.shortfall ? `${r.surplus ?? "0"} / ${r.shortfall ?? "0"}` : "—") },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[{ key: "add", label: L("Propose an auction"), icon: Gavel, right: "Add", dialog: { title: L("Propose an auction"), hint: L("A checker approves it with the legal reference."), fields: [], needs: (x) => Boolean(x.facility_id), children: facilityInput(L), run: (x) => auctionApi.add({ facility_id: Number(x.facility_id) }) } }]}
      rowActions={(r) => [
        { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, dialog: { title: L("Approve the auction"), fields: [{ key: "reference", label: L("reference"), required: true, placeholder: "LEGAL-2026-77" }], run: (x) => auctionApi.auth({ id: Number(r.id), ...x }) } },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: auctionApi.deauth, body: { id: Number(r.id) } },
        {
          key: "schedule",
          label: L("Schedule"),
          icon: Lock,
          right: "Edit",
          show: (x) => st(x, "APPROVED"),
          dialog: { title: L("Schedule the auction"), hint: L("Sets the reserve price from the latest value."), fields: [{ key: "auction_date", label: L("auction_date"), type: "date", required: true }, { key: "method", label: L("method"), type: "select", required: true, options: gl("auction_methods", ["PUBLIC", "SEALED_BID", "ONLINE"]) }], initial: { method: "PUBLIC" }, run: (x) => auctionApi.schedule({ id: Number(r.id), ...x }) },
        },
        { key: "bid", label: L("Record a bid"), icon: Plus, right: "Edit", show: (x) => st(x, "SCHEDULED", "OPEN"), dialog: { title: L("Record a bid"), fields: [{ key: "bidder", label: L("bidder"), required: true }, { key: "amount", label: L("amount"), type: "amount", required: true }], run: (x) => auctionApi.bid({ id: Number(r.id), ...x }) } },
        { key: "complete", label: L("Complete"), icon: CheckCircle2, right: "Authorize", show: (x) => st(x, "SCHEDULED", "OPEN"), dialog: { title: L("Complete the auction"), hint: L("The highest bid settles the loan; any surplus or shortfall is worked out."), fields: [{ key: "expenses", label: L("expenses"), type: "amount" }], run: (x) => auctionApi.complete({ id: Number(r.id), expenses: x.expenses || "0" }) } },
        { key: "refund", flag: "surplus_refund", label: L("Refund surplus"), icon: HandCoins, right: "Authorize", show: (x) => st(x, "COMPLETED") && Number(x.surplus) > 0 && !x.surplus_refunded, call: auctionApi.surplus_refund, body: { id: Number(r.id) } },
      ]}
    />
  );
}

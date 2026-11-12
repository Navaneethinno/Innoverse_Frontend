import { CatalogueReports, reportApi } from "@/Components/InnoCBS/Deposits/depositOpsShared";

// ---------- Reports ----------

export function DepositReports() {
  return <CatalogueReports api={reportApi} title="depositReports" sub="Pick a report from the catalogue and run it." />;
}

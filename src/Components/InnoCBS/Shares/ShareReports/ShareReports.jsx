import { CatalogueReports } from "@/Components/InnoCBS/Deposits/depositOpsShared";
import { shareReportApi } from "@/Components/InnoCBS/Shares/shareShared";

export function ShareReports() {
  return <CatalogueReports api={shareReportApi} title="shareReports" sub="Pick a share report from the catalogue and run it." />;
}

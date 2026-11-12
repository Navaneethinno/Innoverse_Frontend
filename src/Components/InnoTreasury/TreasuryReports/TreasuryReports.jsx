import { CatalogueReports } from "@/Components/InnoCBS/Deposits/depositOpsShared";
import { reportApi } from "@/Components/InnoTreasury/treasuryOpsShared";

export function TreasuryReports() {
  return <CatalogueReports api={reportApi} title="treasuryReports" sub="Pick a treasury report from the catalogue and run it." />;
}

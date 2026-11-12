import { CatalogueReports } from "@/Components/InnoCBS/Deposits/depositOpsShared";
import { goldReportApi } from "@/Components/InnoCBS/Gold/goldShared";

export function GoldLoanReports() {
  return <CatalogueReports api={goldReportApi} title="goldLoanReports" sub="Pick a gold loan report from the catalogue and run it." />;
}

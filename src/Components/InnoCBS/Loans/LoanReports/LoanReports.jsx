import { CatalogueReports } from "@/Components/InnoCBS/Deposits/depositOpsShared";
import { loanReportApi } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function LoanReports() {
  return <CatalogueReports api={loanReportApi} title="loanReports" sub="Pick a loan report from the catalogue and run it." />;
}

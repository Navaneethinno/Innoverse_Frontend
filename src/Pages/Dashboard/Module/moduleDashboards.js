// Each module's own dashboard: what it shows, with SAMPLE numbers until
// the backend sends real ones (one call per module, to come). Keys are the
// module name in kebab case (EPURSE -> "epurse", TERM DEPOSITS ->
// "term-deposits"); text comes from the dashboard namespace, under md.*.
//
//   stats      four tiles: label key, sample value, money?, trend %
//   trend      12 monthly points, two series (label keys)
//   breakdown  a split of one total (label key, sample value)
//   activity   recent events (text key, minutes ago)
//
// When the API lands, swap SAMPLE for the reply and drop the "Sample data"
// badge in ModuleDashboard.

const months = (a, b) => Array.from({ length: 12 }, (_, i) => ({ i, a: Math.round(a[0] + (a[1] - a[0]) * (i / 11) + Math.sin(i * 1.7) * a[2]), b: Math.round(b[0] + (b[1] - b[0]) * (i / 11) + Math.cos(i * 1.3) * b[2]) }));

export const SAMPLE = {
  institution: {
    stats: [["institutions", 4], ["activeInstitutions", 4, false, 0], ["pendingApprovals", 2, false, -50], ["channels", 6, false, 20]],
    trend: { a: "logins", b: "changes", rows: months([120, 180, 20], [8, 14, 4]) },
    breakdown: [["typeBank", 2], ["typeFintech", 1], ["typeProvider", 1]],
    activity: [["actInstEdited", 12], ["actChannelAdded", 95], ["actBrandingApproved", 260]],
  },
  "user-management": {
    stats: [["users", 38], ["activeToday", 17, false, 12], ["lockedAccounts", 1, false, -50], ["pendingApprovals", 3, false, 50]],
    trend: { a: "logins", b: "failedLogins", rows: months([300, 420, 40], [12, 6, 4]) },
    breakdown: [["profileMakers", 18], ["profileCheckers", 12], ["profileAdmins", 5], ["profileViewers", 3]],
    activity: [["actUserCreated", 8], ["actProfileApproved", 44], ["actPasswordReset", 130]],
  },
  epurse: {
    stats: [["customers", 1284], ["merchants", 96, false, 4], ["walletBalance", 18450320.5, true, 6.2], ["txnsToday", 742, false, 9]],
    trend: { a: "transfers", b: "payments", rows: months([5200, 8100, 600], [2100, 3900, 400]) },
    breakdown: [["txnP2P", 4200], ["txnMerchant", 2600], ["txnCashIn", 1500], ["txnCashOut", 980]],
    activity: [["actCustomerOnboarded", 3], ["actAdjustmentApproved", 27], ["actTxnReversed", 75]],
  },
  reports: {
    stats: [["reportsRun", 214], ["exports", 88, false, 15], ["scheduledReports", 6, false, 0], ["failedRuns", 2, false, -33]],
    trend: { a: "reportsRun", b: "exports", rows: months([12, 26, 4], [4, 11, 3]) },
    breakdown: [["rptTransactions", 92], ["rptFees", 41], ["rptCards", 33], ["rptAml", 48]],
    activity: [["actExportReady", 5], ["actReportRun", 32], ["actScheduleEdited", 400]],
  },
  "global-settings": {
    stats: [["feeSchedules", 14], ["limitGroups", 9, false, 0], ["scheduledJobs", 7, false, 0], ["failedJobs", 1, false, -50]],
    trend: { a: "jobRuns", b: "configChanges", rows: months([200, 240, 10], [6, 10, 3]) },
    breakdown: [["setFees", 14], ["setLimits", 9], ["setJobs", 7], ["setMasters", 22]],
    activity: [["actJobRan", 15], ["actFeeEdited", 180], ["actLimitApproved", 520]],
  },
  "case-management": {
    stats: [["openCases", 23], ["overdueCases", 4, false, -20], ["resolvedToday", 9, false, 28], ["avgResolutionHrs", 6.4, false, -11]],
    trend: { a: "opened", b: "resolved", rows: months([40, 62, 8], [36, 60, 7]) },
    breakdown: [["caseOnboarding", 12], ["caseKyc", 6], ["caseAml", 3], ["caseOther", 2]],
    activity: [["actCaseAssigned", 6], ["actCaseResolved", 21], ["actCaseEscalated", 90]],
  },
  "term-deposits": {
    stats: [["activeDeposits", 312], ["principal", 52800000, true, 3.8], ["maturing30", 27, false, 8], ["interestAccrued", 1240500, true, 4.1]],
    trend: { a: "opened", b: "matured", rows: months([18, 34, 4], [10, 22, 3]) },
    breakdown: [["tenor3m", 88], ["tenor6m", 120], ["tenor12m", 79], ["tenorLong", 25]],
    activity: [["actDepositOpened", 14], ["actDepositMatured", 60], ["actPrecloseApproved", 210]],
  },
  loans: {
    stats: [["applications", 64], ["activeFacilities", 188, false, 5], ["outstanding", 31200000, true, 2.6], ["overdueLoans", 7, false, -12]],
    trend: { a: "disbursed", b: "repaid", rows: months([22, 38, 5], [15, 33, 4]) },
    breakdown: [["loanPersonal", 92], ["loanBusiness", 54], ["loanSalary", 30], ["loanOther", 12]],
    activity: [["actLoanApproved", 9], ["actRepaymentPosted", 33], ["actLoanRestructured", 300]],
  },
  cards: {
    stats: [["activeCards", 1126], ["issuedMonth", 84, false, 18], ["pendingRequests", 12, false, -8], ["inStock", 240, false, -4]],
    trend: { a: "cardPayments", b: "cardLoads", rows: months([3100, 5200, 500], [900, 1700, 200]) },
    breakdown: [["cardVirtual", 702], ["cardPhysical", 424]],
    activity: [["actCardIssued", 4], ["actOrderEmbossed", 48], ["actCardBlocked", 150]],
  },
};

// A module without its own entry still gets a dashboard.
export const GENERIC = {
  stats: [["records", 120], ["activeRecords", 104, false, 3], ["pendingApprovals", 4, false, -20], ["changesWeek", 17, false, 13]],
  trend: { a: "created", b: "approved", rows: months([10, 22, 3], [8, 20, 3]) },
  breakdown: [["activeRecords", 104], ["pendingApprovals", 4], ["inactiveRecords", 12]],
  activity: [["actRecordApproved", 20], ["actRecordCreated", 70]],
};

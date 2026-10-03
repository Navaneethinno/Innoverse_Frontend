import { money } from "@/Components/Epurse/Accounts/accountShared";
import { atIst } from "@/Components/Reports/Shared/reportShared";

// What the printed slip says, from a receipt as the API returns it (rrn,
// org_rrn, txn_short_desc, txn_time, status, currency_code, txn_amount,
// fee_amount, fee_name, entry_amount, acct_mask, customer_name,
// counterparty_name, merchant_name, operator_name, print_count,
// receipt_payload { tax, total_debit, net_credit, from, to, reason }).
// The screen (PosReceipt) and the PDF (receiptPdf) both lay out this one
// model, so they always say the same thing.
//
// The slip's top and closing lines use the receipt's institution_name,
// institution_address, institution_phone and receipt_footer when it sends
// them, else the signed-in institution's name and standard closing lines.
//
//   { name, header[], heading, sections: [[{ label, value, sub, strong }]],
//     reference, duplicate, footer[] }
export function receiptSlip(r, t, brand) {
  const p = r.receipt_payload ?? {};
  const m = (v) => (v != null && v !== "" ? money(v, r.currency_code) : null);
  const name = r.institution_name || brand || "";
  const row = (label, value, extra) => (value != null && value !== "" ? { label, value: String(value), ...extra } : null);
  const fee = Number(r.fee_amount) > 0 ? r.fee_amount : null;
  const tax = Number(p.tax) > 0 ? p.tax : null;
  const sections = [
    [row(t("amount"), m(r.txn_amount)), row(r.fee_name || t("fee"), m(fee ?? 0)), row(t("tax"), m(tax))],
    [
      row(t("from"), p.from?.name, { sub: p.from?.acct && `${t("rcptAcc")} ${p.from.acct}` }),
      row(t("to"), p.to?.name, { sub: p.to?.acct && `${t("rcptAcc")} ${p.to.acct}` }),
      row(t("customer"), r.customer_name),
      row(t("account"), r.acct_mask),
      row(t("counterparty"), r.counterparty_name),
      row(t("merchant"), r.merchant_name),
      row(t("operator"), r.operator_name),
      row(t("reason"), p.reason),
    ],
    [row(t("rcptDate"), r.txn_time ? atIst(r.txn_time) : null), row(t("status"), r.status_name ?? r.status), row(t("rcptRef"), r.rrn), row(t("original"), r.org_rrn)],
    [row(t("rcptTotal"), m(p.total_debit ?? r.txn_amount), { strong: true }), row(t("netCredit"), m(p.net_credit)), row(t("balanceAfter"), m(r.entry_amount))],
  ]
    .map((section) => section.filter(Boolean))
    .filter((section) => section.length);
  const title = r.txn_short_desc || t("rcptHeading");
  return {
    name,
    header: [r.institution_address, r.institution_phone].filter(Boolean),
    heading: `*** ${title.toUpperCase()} ***`,
    sections,
    reference: r.rrn ?? null,
    duplicate: r.print_count > 0 ? [t("duplicate"), t("printedN", { count: r.print_count })] : null,
    footer: r.receipt_footer ? String(r.receipt_footer).split(/\r?\n/).filter(Boolean) : [t("rcptThanks", { name }), t("rcptKeep")],
  };
}

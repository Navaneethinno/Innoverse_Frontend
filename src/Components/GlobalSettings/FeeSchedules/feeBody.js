// What a fee schedule form sends: every value as the server takes it.
export const str = (v, d = "0") => String(v ?? "").trim() || d;
const idOrNull = (v) => (v === "" || v == null ? null : Number(v));

// The configuration as the server takes it; shares left empty give the
// whole fee to TXN_FEE_INCOME.
export const toBody = (c) => ({
  schedule_name: str(c.schedule_name, ""),
  description: str(c.description, ""),
  effective_from: c.effective_from ?? "",
  effective_to: c.effective_to ?? "",
  rules: (c.rules ?? []).map((r) => ({
    ...(r.id ? { id: r.id } : {}),
    rule_code: str(r.rule_code, "").toUpperCase(),
    fee_name: str(r.fee_name, ""),
    txn_type_id: Number(r.txn_type_id),
    channel_id: idOrNull(r.channel_id),
    digital_product_id: idOrNull(r.digital_product_id),
    // A provider or a group of providers (EXT_WALLET_*), never both.
    ext_provider_id: idOrNull(r.ext_provider_id),
    ext_provider_group_id: idOrNull(r.ext_provider_group_id),
    minimum_amount: str(r.minimum_amount),
    maximum_amount: str(r.maximum_amount),
    calculation_type: r.calculation_type,
    fixed_amount: str(r.fixed_amount),
    percent_value: str(r.percent_value),
    minimum_fee: str(r.minimum_fee),
    maximum_fee: str(r.maximum_fee),
    pay_from: r.pay_from,
    merchant_pay_from: str(r.merchant_pay_from, ""),
    segment_code: str(r.segment_code, ""),
    // Only a fee the sender pays can be included in the amount.
    amount_mode: r.pay_from === "SENDER" ? r.amount_mode || "EXCLUSIVE" : "EXCLUSIVE",
    tax_percent: str(r.tax_percent),
    shares: (r.shares ?? []).filter((s) => s.purpose).map((s) => ({ purpose: s.purpose, percent: str(s.percent) })),
  })),
});

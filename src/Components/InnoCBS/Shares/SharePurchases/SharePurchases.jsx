import { cell, useL } from "@/Components/InnoCBS/cbsOps";
import { CategoryShares, MemberField, ShareOpScreen, purchaseApi, useCategories } from "@/Components/InnoCBS/Shares/shareShared";

export function SharePurchases() {
  const L = useL();
  const categories = useCategories();
  return (
    <ShareOpScreen
      api={purchaseApi}
      title="sharePurchases"
      sub="Share purchases: request, then a checker approves and the certificate is issued."
      addLabel="Request a purchase"
      columns={[
        { key: "certificate_number", label: L("certificate"), render: (r) => cell(r.certificate_number) },
        { key: "rrn", label: "RRN", render: (r) => cell(r.rrn) },
      ]}
      needs={(x) => x.member_id && x.share_category_code && (x.shares || x.amount)}
      toBody={(x) => ({ member_id: Number(x.member_id), share_category_code: x.share_category_code, ...(x.shares ? { shares: Number(x.shares) } : { amount: x.amount }) })}
      renderForm={(form, setForm) => (
        <>
          <MemberField L={L} form={form} setForm={setForm} />
          <CategoryShares L={L} form={form} setForm={setForm} categories={categories} sharesOrAmount />
        </>
      )}
    />
  );
}

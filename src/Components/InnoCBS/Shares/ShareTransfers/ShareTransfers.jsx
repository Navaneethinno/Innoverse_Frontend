import { cell, useL } from "@/Components/InnoCBS/cbsOps";
import { CategoryShares, MemberField, ShareOpScreen, transferApi, useCategories } from "@/Components/InnoCBS/Shares/shareShared";

export function ShareTransfers() {
  const L = useL();
  const categories = useCategories();
  return (
    <ShareOpScreen
      api={transferApi}
      title="shareTransfers"
      sub="Share transfers between members."
      addLabel="Request a transfer"
      columns={[
        { key: "to_member_number", label: L("To member"), render: (r) => cell(r.to_member_number) },
        { key: "certificate_number", label: L("certificate"), render: (r) => cell(r.certificate_number) },
      ]}
      needs={(x) => x.member_id && x.to_member_id && x.share_category_code && x.shares}
      toBody={(x) => ({ member_id: Number(x.member_id), to_member_id: Number(x.to_member_id), share_category_code: x.share_category_code, shares: Number(x.shares), amount: x.amount })}
      renderForm={(form, setForm) => (
        <>
          <MemberField L={L} form={form} setForm={setForm} label="From member" />
          <MemberField L={L} form={form} setForm={setForm} k="to_member_id" label="To member" />
          <CategoryShares L={L} form={form} setForm={setForm} categories={categories} />
        </>
      )}
    />
  );
}

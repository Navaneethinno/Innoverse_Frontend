import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Facts, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { cell, first, useL, words } from "@/Components/InnoCBS/cbsOps";
import { notifications } from "@/Utils/Lib/notifications";
import { CategoryShares, MemberField, ShareOpScreen, redemptionApi, useCategories } from "@/Components/InnoCBS/Shares/shareShared";

export function ShareRedemptions() {
  const L = useL();
  const categories = useCategories();
  const [check, setCheck] = useState(null);
  const body = (x) => ({ member_id: Number(x.member_id), share_category_code: x.share_category_code, shares: Number(x.shares), trigger: x.trigger || "MANUAL" });
  return (
    <ShareOpScreen
      api={redemptionApi}
      title="shareRedemptions"
      sub="Redemptions: check eligibility, request, then a checker approves the payout."
      addLabel="Request a redemption"
      columns={[{ key: "rrn", label: "RRN", render: (r) => cell(r.rrn) }]}
      needs={(x) => x.member_id && x.share_category_code && x.shares}
      toBody={body}
      renderForm={(form, setForm) => (
        <>
          <MemberField L={L} form={form} setForm={setForm} />
          <CategoryShares L={L} form={form} setForm={setForm} categories={categories} amount={false} />
          <label className={`${labelClass} mt-3 block`}>
            {L("trigger")}
            <FilterSelect
              className="mt-1"
              value={form.trigger ?? "MANUAL"}
              onChange={(v) => setForm((x) => ({ ...x, trigger: v }))}
              options={(() => {
                const cat = categories.find((c) => c.value === form.share_category_code)?.row;
                const list = cat?.redemption_triggers?.length ? cat.redemption_triggers : ["MANUAL", "MEMBER_EXIT", "LOAN_CLOSURE", "ACCOUNT_CLOSURE"];
                return list.map((v) => ({ value: v, label: words(v) }));
              })()}
            />
          </label>
          <div className="mt-3">
            <Button
              size="sm"
              variant="secondary"
              icon={ShieldCheck}
              disabled={!(form.member_id && form.share_category_code && form.shares)}
              disabledReason={L("Pick the member, category and shares.")}
              onClick={() =>
                redemptionApi
                  .check(body(form))
                  .then((r) => setCheck(first(r)))
                  .catch((e) => notifications.error(e.message))
              }
            >
              {L("Check eligibility")}
            </Button>
            {check && (
              <div className="mt-3">
                <p className={`mb-2 rounded-xl border px-3 py-2 text-xs font-semibold ${check.allowed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {check.allowed ? L("Redemption allowed") : L("Redemption blocked")}
                  {(check.blocks ?? []).map((b) => (
                    <span key={String(b)} className="block font-normal">{typeof b === "string" ? b : (b.message ?? JSON.stringify(b))}</span>
                  ))}
                </p>
                <Facts rows={[[L("shares_held"), check.shares_held], [L("shares_under_lien"), check.shares_under_lien], [L("shares_required_by_relationships"), check.shares_required_by_relationships], [L("principal"), check.principal], [L("return_up_to_date"), check.return_up_to_date], [L("deduction"), check.deduction], [L("payout"), check.payout]]} />
              </div>
            )}
          </div>
        </>
      )}
    />
  );
}

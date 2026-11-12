import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { OpDialog, cell, coded, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { CategoryShares, LienFacility, MemberField, Status, act, header, holdingApi, lienApi, memberCell, useCategories, useShareOptions } from "@/Components/InnoCBS/Shares/shareShared";

// ---------- Holdings, liens, certificates ----------

export function Shareholdings() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const categories = useCategories();
  const shareOpts = useShareOptions();
  const [tab, setTab] = useState("holdings");
  const [adding, setAdding] = useState(false);
  const holdings = useServerList({ api: holdingApi.listPath, call: holdingApi.list, enabled: tab === "holdings" });
  const liens = useServerList({ api: lienApi.listPath, call: lienApi.list, prefix: "l_", enabled: tab === "liens" });
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "shareholdings", "Shareholdings across members, and the shares held under lien.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "holdings", label: L("Holdings") }, { value: "liens", label: L("Liens") }]} />
      {tab === "holdings" && (
        <ListTable
          list={holdings}
          rowKey={(r) => `${r.member_id}:${r.share_category_code}`}
          title={L("Holdings")}
          emptyTitle={L("No holdings yet")}
          columns={[
            { key: "member_number", label: L("member"), align: "left", render: memberCell },
            { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
            { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
            { key: "available_shares", label: L("available_shares"), render: (r) => cell(r.available_shares) },
            { key: "lien_shares", label: L("lien_shares"), render: (r) => cell(r.lien_shares) },
            { key: "paid_amount", label: L("paid_amount"), render: (r) => cell(r.paid_amount) },
            { key: "member_status", label: L("status"), render: (r) => <Status code={r.member_status} /> },
          ]}
        />
      )}
      {tab === "liens" && (
        <ListTable
          list={liens}
          rowKey={(r) => r.id}
          title={L("Liens")}
          emptyTitle={L("No liens")}
          actions={
            can("Edit") && (
              <Button size="sm" icon={Lock} onClick={() => setAdding(true)}>
                {L("Mark a lien")}
              </Button>
            )
          }
          columns={[
            { key: "member_number", label: L("member"), align: "left", render: memberCell },
            { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
            { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
            { key: "reason", label: L("reason"), render: (r) => cell(r.reason) },
            { key: "source", label: L("source"), sortable: false, render: (r) => cell(r.source_label ? `${words(r.source_module)} · ${r.source_label}` : words(r.source_module)) },
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
            {
              key: "actions",
              label: t("actions"),
              sortable: false,
              render: (r) =>
                r.actions?.release && (
                  <Button size="sm" variant="ghost" icon={Unlock} onClick={() => act(lienApi.release, { lien_id: Number(r.id) }, liens.reload)}>
                    {L("Release")}
                  </Button>
                ),
            },
          ]}
        />
      )}
      {adding && (
        <OpDialog
          title={L("Mark a lien")}
          fields={[
            { key: "reason", label: L("reason"), required: true, wide: true },
            { key: "source_module", label: L("Linked to"), type: "select", required: true, options: shareOpts.lien_sources?.length ? coded("lien_sources")(shareOpts) : [{ value: "LOAN", label: L("A loan of the member") }, { value: "OTHER", label: L("Other (say why above)") }] },
          ]}
          initial={{ source_module: "OTHER" }}
          needs={(x) => x.member_id && x.share_category_code && x.shares}
          run={(x) => lienApi.add({ member_id: Number(x.member_id), share_category_code: x.share_category_code, shares: Number(x.shares), reason: x.reason, source_module: x.source_module, ...(x.source_module === "LOAN" ? { source_id: Number(x.source_id) } : {}) })}
          onClose={() => setAdding(false)}
          onDone={() => (setAdding(false), liens.reload())}
        >
          {(form, setForm) => (
            <>
              <MemberField L={L} form={form} setForm={setForm} />
              <div className="mb-3">
                <CategoryShares L={L} form={form} setForm={setForm} categories={categories} amount={false} />
              </div>
              {form.source_module === "LOAN" && <LienFacility memberId={form.member_id} value={form.source_id} onChange={(v) => setForm((x) => ({ ...x, source_id: v }))} />}
            </>
          )}
        </OpDialog>
      )}
    </div>
  );
}

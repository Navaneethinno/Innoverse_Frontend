import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { TabButton } from "@/Components/Common/ListView";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { Facts, Section, inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { useClientPage } from "@/Hooks/useClientPage";
import { usePagedList } from "@/Hooks/usePagedList";
import { Pager } from "@/Components/Common/Pager";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { cardReportsApi, cardsApi } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { CardNumber, CardPill } from "./cardOpsShared";

const GROUPS = ["PENDING_AUTH", "CLOSED_STOLEN", "BLOCKED"];

// CARDS > Card Reports (menu 253): stock by holder, cards by status group,
// and active cards expiring soon.
export function CardReports() {
  const { t } = useTranslation(["cards", "common"]);
  const [tab, setTab] = useState("stock");
  const [products, setProducts] = useState([]);
  useEffect(() => {
    cardsApi
      .options({})
      .then((r) => setProducts(rowsOf(r)[0]?.card_products ?? []))
      .catch((e) => notifications.error(e.message));
  }, []);
  return (
    <div className="pt-1 pb-6">
      <div className="mb-4">
        <PageTitle>{t("rep_title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("rep_subtitle")}</p>
      </div>
      <SegmentedSwitch className="mb-3" options={[{ key: "stock" }, { key: "status" }, { key: "expiring" }].map(({ key }) => ({ value: key, label: ((k) => t(`rep_tab_${k}`))(key) }))} value={tab} onChange={setTab} />
      {tab === "stock" && <StockReport />}
      {tab === "status" && <StatusReport products={products} />}
      {tab === "expiring" && <ExpiringReport products={products} />}
    </div>
  );
}

function StockReport() {
  const { t } = useTranslation("cards");
  const { scope } = useInstitutionScope();
  const [report, setReport] = useState(null);
  const body = JSON.stringify(scope({}));
  useEffect(() => {
    setReport(null);
    cardReportsApi
      .stock(JSON.parse(body))
      .then((r) => setReport(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setReport({});
      });
  }, [body]);
  const { rows, pager } = useClientPage(report?.by_holder ?? [], 25);
  if (!report) return <PageSkeleton />;
  return (
    <div className="grid gap-4">
      <Facts
        className="lg:grid-cols-3"
        rows={[
          [t("rep_pendingPrefile"), report.pending_prefile ?? 0],
          [t("rep_prefiled"), report.prefiled ?? 0],
          [t("rep_batchReceived"), report.batch_received ?? 0],
        ]}
      />
      <Section title={t("rep_byHolder")}>
        {rows.length ? (
          <div className="overflow-x-auto">
            <SimpleTable columns={[t("product"), t("rep_holderType"), t("ret_holder"), t("status"), { label: t("ret_cards"), align: "right" }]}>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.product_code}:${r.holder_type}:${r.holder_id}:${r.inventory_status}`} className="border-b border-border/60">
                    <td className="px-3 py-2">{r.product_code}</td>
                    <td className="px-3 py-2">{r.holder_type === "VAULT" ? t("vault") : t(`ret_holder_${r.holder_type}`, { defaultValue: r.holder_type })}</td>
                    <td className="px-3 py-2 font-semibold">{r.holder_type === "VAULT" ? t("vault") : r.holder_name}</td>
                    <td className="px-3 py-2">
                      <CardPill prefix="inv" code={r.inventory_status} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.cards}</td>
                  </tr>
                ))}
              </tbody>
            </SimpleTable>
            {pager && <Pager {...pager} className="mt-2" />}
          </div>
        ) : (
          <EmptyNote>{t("rep_noStock")}</EmptyNote>
        )}
      </Section>
    </div>
  );
}

function useCardColumns() {
  const { t } = useTranslation(["cards", "common"]);
  return [
    { key: "pan_masked", label: t("card"), align: "left", render: (c) => <span><CardNumber card={c} /><span className="block text-[10px] text-muted-foreground">{c.name_on_card || "—"}</span></span> },
    { key: "product_code", label: t("product"), render: (c) => <span className="text-xs">{c.product_code}</span> },
    { key: "ops_status", label: t("opsStatus"), render: (c) => <CardPill prefix="ops" code={c.ops_status} /> },
    { key: "expiry", label: t("expiry"), render: (c) => <span className="text-xs tabular-nums">{c.expiry}</span> },
    { key: "entity", label: t("holder"), render: (c) => <span className="text-xs">{c.entity_type ? `${c.entity_type} #${c.entity_id}` : t("inStock")}</span> },
    { key: "issued_at", label: t("issuedAt"), render: (c) => <span className="whitespace-nowrap text-xs">{c.issued_at ? accountDate(c.issued_at) : "—"}</span> },
    { key: "updated_time", label: t("rep_updated"), render: (c) => <span className="whitespace-nowrap text-xs">{c.updated_time ? accountDate(c.updated_time) : "—"}</span> },
  ];
}

const productOptions = (t, products) => [{ value: "", label: t("rep_anyProduct") }, ...products.map((p) => ({ value: String(p.id), label: p.product_name ?? p.name ?? p.product_code }))];

function StatusReport({ products }) {
  const { t } = useTranslation(["cards", "common"]);
  const [group, setGroup] = useState(GROUPS[0]);
  const [product, setProduct] = useState("");
  const list = usePagedList(cardReportsApi.status, { group, ...(product ? { card_product_id: Number(product) } : {}) });
  const columns = useCardColumns();
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {GROUPS.map((g) => (
            <TabButton key={g} active={group === g} onClick={() => setGroup(g)}>
              {t(`rep_group_${g}`)}
            </TabButton>
          ))}
        </div>
        <FilterSelect className="w-56" value={product} onChange={setProduct} options={productOptions(t, products)} />
      </div>
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}>
        <DataTable bare rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} columns={columns} rowKey={(c) => c.id} title={t("rep_tab_status")} emptyTitle={t("rep_noCards")} emptyDescription={t("rep_noCardsHint")} />
      </div>
    </>
  );
}

function ExpiringReport({ products }) {
  const { t } = useTranslation(["cards", "common"]);
  const [days, setDays] = useState("30");
  const [applied, setApplied] = useState(30);
  const [product, setProduct] = useState("");
  const list = usePagedList(cardReportsApi.expiring, { days: applied, ...(product ? { card_product_id: Number(product) } : {}) });
  const columns = useCardColumns();
  const n = Number(days);
  const bad = !(n >= 1 && n <= 366);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold">
          {t("rep_days")}
          <input className={`${inputClass} mt-1 w-28`} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
        </label>
        <Button size="sm" disabled={bad} disabledReason={t("rep_daysRange")} onClick={() => setApplied(n)}>
          {t("rep_apply")}
        </Button>
        <FilterSelect className="w-56" value={product} onChange={setProduct} options={productOptions(t, products)} />
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{t("rep_expiringHint", { days: applied })}</p>
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}>
        <DataTable bare rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} columns={columns} rowKey={(c) => c.id} title={t("rep_tab_expiring")} emptyTitle={t("rep_noCards")} emptyDescription={t("rep_noExpiringHint")} />
      </div>
    </>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { money } from "@/Components/InnoCBS/Accounts/accountShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { catalogueApi } from "@/Services/Merchant/ops.api";
import { PagedTable, usePagedCall } from "./opsShared";

function problemOf(t, f) {
  const p = Number(f.max_products);
  const l = Number(f.max_lines);
  if (!(Number.isInteger(p) && p >= 1) || !(Number.isInteger(l) && l >= 1)) return t("catalogueLimits");
  return "";
}

// InnoMMS > Product Catalogue (264): whether merchants keep a product
// catalogue for their POS, its size, and their products (read-only).
export function Catalogue() {
  const { t } = useTranslation(["ops", "common"]);
  return (
    <SectionScreen
      api={catalogueApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("catalogueTitle")}
      subtitle={t("catalogueSubtitle")}
      toForm={(s) => ({ enabled: Boolean(s?.enabled), max_products: s?.max_products ?? 1000, max_lines: s?.max_lines ?? 50 })}
      bodyOf={(f) => ({ enabled: Boolean(f.enabled), max_products: Number(f.max_products), max_lines: Number(f.max_lines) })}
      problemOf={(_, f) => problemOf(t, f)}
      before={() => <CatalogueProducts />}
    >
      {({ shown, editing, setForm }) => {
        const s = shown ?? {};
        if (!editing)
          return (
            <Facts
              rows={[
                [t("catalogueEnabled"), s.enabled ? t("common:yes") : t("common:no")],
                [t("maxProducts"), s.max_products ?? 1000],
                [t("maxLines"), s.max_lines ?? 50],
              ]}
            />
          );
        const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={`${labelClass} flex items-center justify-between gap-2 self-end rounded-xl border border-border px-3 py-2`}>
              {t("catalogueEnabled")}
              <Field field={{ type: "bool" }} value={s.enabled} onChange={set("enabled")} />
            </label>
            <label className={labelClass}>
              {t("maxProducts")}
              <Field field={{ type: "int" }} value={s.max_products} onChange={set("max_products")} />
            </label>
            <label className={labelClass}>
              {t("maxLines")}
              <Field field={{ type: "int" }} value={s.max_lines} onChange={set("max_lines")} />
            </label>
          </div>
        );
      }}
    </SectionScreen>
  );
}

// catalogue/list: the merchants' products, read-only.
export function CatalogueProducts() {
  const { t } = useTranslation(["ops", "common"]);
  const [search, setSearch] = useState("");
  const paged = usePagedCall({ call: catalogueApi.list, body: search.trim() ? { search: search.trim() } : {} });
  return (
    <Section title={t("merchantProducts")}>
      <PagedTable
        paged={paged}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t("searchProduct")}
        empty={t("noProducts")}
        columns={[
          { label: t("merchant"), render: (r) => r.merchant_name ?? r.merchant?.name ?? "—" },
          { label: t("code"), render: (r) => <span className="font-mono">{r.code}</span> },
          { label: t("name"), render: (r) => r.name },
          { label: t("category"), render: (r) => r.category || "—" },
          { label: t("unit"), render: (r) => r.unit || "—" },
          { label: t("price"), render: (r) => (r.price != null ? money(r.price, r.currency_code) : r.currency_code ?? "—") },
          { label: t("common:status"), render: (r) => <StatusBadge status={r.active === false ? "INACTIVE" : "ACTIVE"} /> },
        ]}
      />
    </Section>
  );
}

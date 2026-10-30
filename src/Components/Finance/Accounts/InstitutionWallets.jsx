import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlusCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { usePagePermission } from "@/Hooks/usePermission";
import { request, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { useCoreBanking } from "../coreBankingShared";
import { useInstitutionScope } from "../Loans/loanShared";
import { money } from "./accountShared";

// Accounts › Institution wallets: the head office's and each branch's own
// wallet, one per currency. Staff transactions take money only from these.
// Opening one is immediate (no checker). branch_id 0 is the head office.
const walletsApi = {
  list: (body) => request("/config/account/institution_wallet/list", body),
  add: (body) => request("/config/account/institution_wallet/add", body),
  products: () => request("/config/acct/product/get_active", { view: "dropdown" }),
};

export function InstitutionWallets({ onOpenAccount }) {
  const { t } = useTranslation(["accounts", "common"]);
  const can = usePagePermission();
  const [rows, setRows] = useState(null);
  const [adding, setAdding] = useState(false);
  // A head office branch's wallet is labelled as such ("FE Test Branch 1 (Head office)").
  const setup = useCoreBanking(useInstitutionScope().scope);
  const headOffices = new Set((setup?.branches ?? []).filter((b) => b.head_office_type || b.head_office).map((b) => b.id));
  const load = useCallback(() => {
    walletsApi
      .list({})
      .then((r) => setRows(rowsOf(r)))
      .catch((e) => {
        notifications.error(e.message);
        setRows([]);
      });
  }, []);
  useEffect(() => load(), [load]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("instWalletsHint")}</p>
        {can("Add") && (
          <Button size="sm" icon={PlusCircle} onClick={() => setAdding(true)}>
            {t("openWallet")}
          </Button>
        )}
      </div>
      <DataTable
        columns={[
          { key: "branch_name", label: t("branch"), render: (w) => (
            <span className="text-xs font-semibold">
              {w.branch_name || t("headOffice")}
              {w.branch_id > 0 && headOffices.has(w.branch_id) && <span className="ml-1 font-normal text-muted-foreground">({t("headOffice")})</span>}
            </span>
          ),
        },
          {
            key: "acct_num",
            label: t("accountNumber"),
            render: (w) => (
              <button type="button" onClick={() => onOpenAccount?.(w)} className="font-mono text-xs font-bold text-primary hover:underline">
                {w.acct_num}
              </button>
            ),
          },
          { key: "acct_product_name", label: t("accountProduct"), render: (w) => <span className="text-xs">{w.acct_product_name}</span> },
          { key: "currency_code", label: t("currency"), render: (w) => <span className="text-xs">{w.currency_code}</span> },
          { key: "balance", label: t("balance"), render: (w) => <span className="whitespace-nowrap text-xs tabular-nums">{money(w.balance, w.currency_code)}</span> },
          { key: "available", label: t("availBal"), render: (w) => <span className="whitespace-nowrap text-xs font-semibold tabular-nums">{money(w.available, w.currency_code)}</span> },
        ]}
        rows={rows ?? []}
        rowKey={(w) => w.acct_id}
        isLoading={!rows}
        title={t("instWallets")}
        emptyTitle={t("noInstWallets")}
        emptyDescription={t("noInstWalletsHint")}
        serverSorted
      />
      {adding && (
        <OpenWallet
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function OpenWallet({ onClose, onDone }) {
  const { t } = useTranslation(["accounts", "common"]);
  const setup = useCoreBanking(useInstitutionScope().scope);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ branch_id: "0", acct_product_id: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    walletsApi
      .products()
      .then((r) => setProducts(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setProducts([]));
  }, []);
  // The administrative head office has no wallet; closed branches are left out.
  const branches = (setup?.branches ?? []).filter((b) => b.status !== "CLOSED" && b.head_office_type !== "ADMINISTRATIVE");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await walletsApi.add({ branch_id: Number(form.branch_id), acct_product_id: Number(form.acct_product_id) });
      notifications.success(r?.message ?? t("walletOpened"));
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t("openWallet")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy} disabled={!form.acct_product_id} onClick={save}>
            {t("openWallet")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="text-xs font-bold">
          {t("branch")}
          <FilterSelect
            className="mt-1.5"
            value={form.branch_id}
            onChange={(v) => setForm((f) => ({ ...f, branch_id: v }))}
            options={[{ value: "0", label: t("headOffice") }, ...branches.map((b) => ({ value: String(b.id), label: `${b.code} · ${b.name}` }))]}
          />
        </label>
        <label className="text-xs font-bold">
          {t("accountProduct")}
          <FilterSelect className="mt-1.5" value={form.acct_product_id} onChange={(v) => setForm((f) => ({ ...f, acct_product_id: v }))} options={[{ value: "", label: t("chooseProduct") }, ...products.map((p) => ({ value: String(p.id), label: p.name }))]} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("walletCurrencyHint")}</span>
        </label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "@/Components/InnoCBS/Loans/loanShared";
import { PickupLocations } from "./PickupLocations";
import { CardSetupPage } from "./CardSetup";
import { binKind, groupKind, layoutKind, productKind } from "./cardKinds";

// InnoCMS > Settings: BINs, Card Number Layout, Card Products, Issuance Groups.
export const CardBins = () => <CardSetupPage key="bins" kind={binKind} />;
export function CardProducts() {
  const { t } = useTranslation("ops");
  const [tab, setTab] = useState("products");
  return (
    <div>
      <div className="pt-4">
        <Tabs tabs={[{ key: "products" }, { key: "pickup" }]} value={tab} onChange={setTab} labelOf={(k) => t(`cardProductsTab_${k}`)} />
      </div>
      {tab === "products" ? <CardSetupPage key="products" kind={productKind} /> : <PickupLocations />}
    </div>
  );
}
export const IssuanceGroups = () => <CardSetupPage key="groups" kind={groupKind} />;
export const CardNumberLayouts = () => <CardSetupPage key="layouts" kind={layoutKind} />;

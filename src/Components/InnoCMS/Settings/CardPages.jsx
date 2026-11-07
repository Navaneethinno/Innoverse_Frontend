import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
        <SegmentedSwitch className="mb-3" options={[{ key: "products" }, { key: "pickup" }].map(({ key }) => ({ value: key, label: ((k) => t(`cardProductsTab_${k}`))(key) }))} value={tab} onChange={setTab} />
      </div>
      {tab === "products" ? <CardSetupPage key="products" kind={productKind} /> : <PickupLocations />}
    </div>
  );
}
export const IssuanceGroups = () => <CardSetupPage key="groups" kind={groupKind} />;
export const CardNumberLayouts = () => <CardSetupPage key="layouts" kind={layoutKind} />;

import { CardSetupPage } from "./CardSetup";
import { binKind, groupKind, layoutKind, productKind } from "./cardKinds";

// InnoCMS > Settings: BINs, Card Number Layout, Card Products, Issuance Groups.
export const CardBins = () => <CardSetupPage key="bins" kind={binKind} />;
export const CardProducts = () => <CardSetupPage key="products" kind={productKind} />;
export const IssuanceGroups = () => <CardSetupPage key="groups" kind={groupKind} />;
export const CardNumberLayouts = () => <CardSetupPage key="layouts" kind={layoutKind} />;

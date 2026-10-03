import { CardSetupPage } from "./CardSetup";
import { binKind, groupKind, productKind } from "./cardKinds";

// CARDS > Card BINs (195), Card Products (196), Issuance Groups (197).
export const CardBins = () => <CardSetupPage key="bins" kind={binKind} />;
export const CardProducts = () => <CardSetupPage key="products" kind={productKind} />;
export const IssuanceGroups = () => <CardSetupPage key="groups" kind={groupKind} />;

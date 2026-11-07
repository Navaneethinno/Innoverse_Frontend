import { lazy } from "react";
import { pageElement } from "../routeSupport";

// MMS › Agents (207), Stores (208) and Terminals (209).
const Agents = lazy(() => import("@/Components/InnoMMS/Agents/Agents.jsx").then((m) => ({ default: m.Agents })));
const Stores = lazy(() => import("@/Components/InnoMMS/Stores/Stores.jsx").then((m) => ({ default: m.Stores })));
const Terminals = lazy(() => import("@/Components/InnoMMS/Terminals/Terminals.jsx").then((m) => ({ default: m.Terminals })));

// MMS › Merchant Bulk Payouts (223): read only.
const MerchantBulkPayouts = lazy(() => import("@/Components/Finance/BulkPayouts/BulkPayouts.jsx").then((m) => ({ default: m.MerchantBulkPayouts })));

// MMS > Terminal Batches (230), Terminal Monitor (231); InnoMMS > Agent Float
// Limits (240), POS Profile Templates (263), Product Catalogue (264); ePurse >
// Customer Blocks (242); Case Management > Dispute Settings (243).
const opsPage = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const OPS_PAGES = {
  terminalbatches: opsPage(() => import("@/Components/InnoMMS/Ops/TerminalBatches.jsx"), "TerminalBatches"),
  terminalmonitor: opsPage(() => import("@/Components/InnoMMS/Ops/TerminalMonitor.jsx"), "TerminalMonitor"),
  agentfloatlimits: opsPage(() => import("@/Components/InnoMMS/Ops/FloatLimits.jsx"), "FloatLimits"),
  posprofiletemplates: opsPage(() => import("@/Components/InnoMMS/Ops/PosTemplates.jsx"), "PosTemplates"),
  productcatalogue: opsPage(() => import("@/Components/InnoMMS/Ops/Catalogue.jsx"), "Catalogue"),
  customerblocks: opsPage(() => import("@/Components/Epurse/CustomerBlocks/CustomerBlocks.jsx"), "CustomerBlocks"),
  disputesettings: opsPage(() => import("@/Components/CaseManagement/DisputeSettings/DisputeSettings.jsx"), "DisputeSettings"),
};

export const mmsRoutes = Object.entries({ ...OPS_PAGES, merchantbulkpayouts: MerchantBulkPayouts, agents: Agents, stores: Stores, terminals: Terminals }).flatMap(([path, Page]) => [
  { path, element: pageElement(Page) },
  { path: `${path}/:id`, element: pageElement(Page) },
]);

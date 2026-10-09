import { lazy } from "react";
import { pageElement } from "../routeSupport";

// MMS › Agents (207), Stores (208) and Terminals (209).
const Agents = lazy(() => import("@/Components/Merchant/Agents/Agents.jsx").then((m) => ({ default: m.Agents })));
const Stores = lazy(() => import("@/Components/Merchant/Stores/Stores.jsx").then((m) => ({ default: m.Stores })));
const Terminals = lazy(() => import("@/Components/Merchant/Terminals/Terminals.jsx").then((m) => ({ default: m.Terminals })));

export const mmsRoutes = Object.entries({ agents: Agents, stores: Stores, terminals: Terminals }).flatMap(([path, Page]) => [
  { path, element: pageElement(Page) },
  { path: `${path}/:id`, element: pageElement(Page) },
]);

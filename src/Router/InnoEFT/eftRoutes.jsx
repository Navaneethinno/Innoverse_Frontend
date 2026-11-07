import { lazy } from "react";
import { pageElement } from "../routeSupport";

// InnoEFT: ATM Profiles (214), ATM Ports (215), ATMs (187), ATM Bulk Downloads (216).
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const PAGES = {
  // SAF Queue (232): card network reversals owed or sent.
  safqueue: page(() => import("@/Components/InnoEFT/SafQueue.jsx"), "SafQueue"),
  atmprofiles: page(() => import("@/Components/InnoEFT/Settings/AtmProfiles.jsx"), "AtmProfiles"),
  atmports: page(() => import("@/Components/InnoEFT/Settings/AtmPorts.jsx"), "AtmPorts"),
  atms: page(() => import("@/Components/InnoEFT/Atms.jsx"), "Atms"),
  atmbulkdownloads: page(() => import("@/Components/InnoEFT/AtmBulkDownloads.jsx"), "AtmBulkDownloads"),
};

export const eftRoutes = Object.entries(PAGES).flatMap(([path, Page]) => [
  { path, element: pageElement(Page) },
  { path: `${path}/:id`, element: pageElement(Page) },
]);

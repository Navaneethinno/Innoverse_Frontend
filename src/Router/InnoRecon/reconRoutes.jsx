import { lazy } from "react";
import { pageElement } from "../routeSupport";

// InnoRecon: Recon Sources (188), Files (189), Layouts (190) and Sets (191).
const Sources = lazy(() => import("@/Components/InnoRecon/Settings/Sources.jsx").then((m) => ({ default: m.ReconSources })));
const Files = lazy(() => import("@/Components/InnoRecon/Files.jsx").then((m) => ({ default: m.ReconFiles })));
const Layouts = lazy(() => import("@/Components/InnoRecon/Settings/Layouts.jsx").then((m) => ({ default: m.ReconLayouts })));
const Sets = lazy(() => import("@/Components/InnoRecon/Sets.jsx").then((m) => ({ default: m.ReconSets })));

export const reconRoutes = Object.entries({ reconsources: Sources, reconfiles: Files, reconlayouts: Layouts, reconsets: Sets }).map(([path, Page]) => ({ path, element: pageElement(Page) }));

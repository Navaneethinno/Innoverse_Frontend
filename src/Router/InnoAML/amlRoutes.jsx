import { lazy } from "react";
import { pageElement } from "../routeSupport";

// InnoAML (module 4). Slugs are the menu names, as everywhere else.
const AMLSetup = lazy(() => import("@/Components/InnoAML/Settings/AMLSetup").then((m) => ({ default: m.AMLSetup })));
const InternalWatchlists = lazy(() => import("@/Components/InnoAML/Settings/InternalWatchlists").then((m) => ({ default: m.InternalWatchlists })));
const Screenings = lazy(() => import("@/Components/InnoAML/Screenings").then((m) => ({ default: m.Screenings })));
const NameLookup = lazy(() => import("@/Components/InnoAML/NameLookup").then((m) => ({ default: m.NameLookup })));
const Blacklist = lazy(() => import("@/Components/InnoAML/Blacklist").then((m) => ({ default: m.Blacklist })));
const Whitelist = lazy(() => import("@/Components/InnoAML/Whitelist").then((m) => ({ default: m.Whitelist })));
const MatchReview = lazy(() => import("@/Components/InnoAML/MatchReview").then((m) => ({ default: m.MatchReview })));

const pages = {
  amlsetup: AMLSetup, // AML Configuration > AML Setup (menu 100)
  internalwatchlists: InternalWatchlists, // AML Configuration > Internal Watchlists (105)
  screenings: Screenings, // AML Screening > Screenings (102), with the Changes tab
  namelookup: NameLookup, // AML Screening > Name Lookup (103)
  matchreview: MatchReview, // AML Screening > Match Review (104)
  blacklist: Blacklist, // Settings > Blacklist (182)
  whitelist: Whitelist, // Whitelist (183), after Match Review
};

export const amlRoutes = Object.entries(pages).flatMap(([path, page]) => [
  { path, element: pageElement(page) },
  { path: `${path}/:id`, element: pageElement(page) },
]);

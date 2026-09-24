import {
  ActiveCustomersWidget,
  ActiveInstitutionsWidget,
  MyRequestsWidget,
  OnboardingInProgressWidget,
  PendingRequestsWidget,
  TotalInstitutionsWidget,
} from "../widgets/StatWidgets";
import { CustomerSourcesWidget, KycLevelsWidget, OnboardingTrendWidget } from "../widgets/ChartWidgets";
import { PortalChannelsWidget, QuickActionsWidget, RecentOnboardingWidget, RequestBreakdownWidget } from "../widgets/ListWidgets";

/**
 * @typedef {1 | 2} WidgetSpan  Columns the widget covers on the 4-column grid.
 *
 * @typedef {object} WidgetDefinition
 * @property {import("react").ComponentType} component  Renders the widget body.
 * @property {string} titleKey   dashboard-namespace i18n key (drag-handle label).
 * @property {WidgetSpan} defaultSpan
 * @property {WidgetSpan} [minSpan]  Defaults to defaultSpan.
 * @property {WidgetSpan} [maxSpan]  Defaults to defaultSpan.
 */

/**
 * Every dashboard widget, by id. This is the ONLY place that knows which
 * widgets exist: the grid, the drag-and-drop and the saved layout all work
 * from ids, so a new chart or table is added by writing its component and
 * adding one entry here — nothing in layout/ changes.
 *
 * The object's key order is the default layout for a user with none saved.
 * @type {Record<string, WidgetDefinition>}
 */
export const WIDGET_REGISTRY = {
  totalInstitutions: { component: TotalInstitutionsWidget, titleKey: "totalInstitutions", defaultSpan: 1 },
  activeInstitutions: { component: ActiveInstitutionsWidget, titleKey: "activeInstitutions", defaultSpan: 1 },
  pendingRequests: { component: PendingRequestsWidget, titleKey: "pendingRequests", defaultSpan: 1 },
  myRequests: { component: MyRequestsWidget, titleKey: "myRequests", defaultSpan: 1 },
  onboardingTrend: { component: OnboardingTrendWidget, titleKey: "onboardingTrend", defaultSpan: 2, minSpan: 1, maxSpan: 2 },
  customerSources: { component: CustomerSourcesWidget, titleKey: "customerSources", defaultSpan: 1, maxSpan: 2 },
  requestBreakdown: { component: RequestBreakdownWidget, titleKey: "requestBreakdown", defaultSpan: 1, maxSpan: 2 },
  activeCustomers: { component: ActiveCustomersWidget, titleKey: "activeCustomers", defaultSpan: 1 },
  onboardingInProgress: { component: OnboardingInProgressWidget, titleKey: "onboardingInProgress", defaultSpan: 1 },
  recentOnboarding: { component: RecentOnboardingWidget, titleKey: "recentOnboarding", defaultSpan: 2, minSpan: 2, maxSpan: 2 },
  kycLevels: { component: KycLevelsWidget, titleKey: "kycLevels", defaultSpan: 1, maxSpan: 2 },
  portalChannels: { component: PortalChannelsWidget, titleKey: "portalChannels", defaultSpan: 1, maxSpan: 2 },
  quickActions: { component: QuickActionsWidget, titleKey: "quickActions", defaultSpan: 1 },
};

export const minSpanOf = (id) => WIDGET_REGISTRY[id]?.minSpan ?? WIDGET_REGISTRY[id]?.defaultSpan ?? 1;
export const maxSpanOf = (id) => WIDGET_REGISTRY[id]?.maxSpan ?? WIDGET_REGISTRY[id]?.defaultSpan ?? 1;
export const clampSpan = (id, span) => Math.min(maxSpanOf(id), Math.max(minSpanOf(id), Number(span) || 1));

/** @returns {{ id: string, span: WidgetSpan }[]} */
export const defaultLayout = () => Object.entries(WIDGET_REGISTRY).map(([id, w]) => ({ id, span: w.defaultSpan }));

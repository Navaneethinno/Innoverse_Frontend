import { flowLayout } from "./gridLayout";
import {
  ActiveCustomersWidget,
  ActiveInstitutionsWidget,
  MyRequestsWidget,
  OnboardingCasesWidget,
  OnboardingInProgressWidget,
  PendingRequestsWidget,
  TotalInstitutionsWidget,
} from "../widgets/StatWidgets";
import { CustomerSourcesWidget, KycLevelsWidget, OnboardingTrendWidget } from "../widgets/ChartWidgets";
import { PortalChannelsWidget, QuickActionsWidget, RecentOnboardingWidget, RequestBreakdownWidget } from "../widgets/ListWidgets";

/**
 * @typedef {object} WidgetDefinition
 * @property {import("react").ComponentType} component  Renders the widget body.
 * @property {string} titleKey   dashboard-namespace i18n key.
 * @property {number} w          Default width in grid columns (1..MAX_SPAN).
 * @property {number} h          Default height in grid rows.
 * @property {number} minH       Smallest height the card can be resized to.
 */

// The grid: GRID_COLS columns of ROW_HEIGHT px rows. The server accepts a
// width of 1 or 2 columns, so MAX_SPAN caps the horizontal resize.
export const GRID_COLS = 4;
export const MAX_SPAN = 2;
export const ROW_HEIGHT = 36;

const stat = (component, titleKey) => ({ component, titleKey, w: 1, h: 4, minH: 3 });

/**
 * Every dashboard widget, by id. This is the ONLY place that knows which
 * widgets exist: the grid and the saved layout work from ids, so a new
 * widget is added by writing its component and adding one entry here.
 *
 * The key order is the default layout (flowed left to right) for a user
 * with none saved.
 * @type {Record<string, WidgetDefinition>}
 */
export const WIDGET_REGISTRY = {
  totalInstitutions: stat(TotalInstitutionsWidget, "totalInstitutions"),
  activeInstitutions: stat(ActiveInstitutionsWidget, "activeInstitutions"),
  pendingRequests: stat(PendingRequestsWidget, "pendingRequests"),
  myRequests: stat(MyRequestsWidget, "myRequests"),
  onboardingTrend: { component: OnboardingTrendWidget, titleKey: "onboardingTrend", w: 2, h: 9, minH: 6 },
  customerSources: { component: CustomerSourcesWidget, titleKey: "customerSources", w: 1, h: 9, minH: 7 },
  requestBreakdown: { component: RequestBreakdownWidget, titleKey: "requestBreakdown", w: 1, h: 9, minH: 4 },
  activeCustomers: stat(ActiveCustomersWidget, "activeCustomers"),
  onboardingInProgress: stat(OnboardingInProgressWidget, "onboardingInProgress"),
  onboardingCases: { ...stat(OnboardingCasesWidget, "onboardingCases"), h: 5 },
  recentOnboarding: { component: RecentOnboardingWidget, titleKey: "recentOnboarding", w: 2, h: 9, minH: 5 },
  kycLevels: { component: KycLevelsWidget, titleKey: "kycLevels", w: 1, h: 8, minH: 6 },
  portalChannels: { component: PortalChannelsWidget, titleKey: "portalChannels", w: 1, h: 8, minH: 4 },
  quickActions: { component: QuickActionsWidget, titleKey: "quickActions", w: 1, h: 8, minH: 6 },
};

export const defaultLayout = () => flowLayout(WIDGET_REGISTRY, Object.keys(WIDGET_REGISTRY).map((id) => ({ id })), { cols: GRID_COLS, maxSpan: MAX_SPAN });

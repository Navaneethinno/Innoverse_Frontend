import { lazy } from "react";
import { pageElement } from "../routeSupport";

// EPURSE > Notification Center.
const NotificationGroup = lazy(() =>
  import("@/Components/Epurse/NotificationCenter/NotificationGroup").then((m) => ({ default: m.NotificationGroup })),
);
const NotificationAlerts = lazy(() =>
  import("@/Components/Epurse/NotificationCenter/NotificationAlerts").then((m) => ({ default: m.NotificationAlerts })),
);

export const notificationRoutes = [
  { path: "notificationgroup", element: pageElement(NotificationGroup) },
  { path: "notificationgroup/:id", element: pageElement(NotificationGroup) },
  { path: "notificationalerts", element: pageElement(NotificationAlerts) },
  { path: "notificationalerts/:id", element: pageElement(NotificationAlerts) },
];

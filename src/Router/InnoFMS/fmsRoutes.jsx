import { lazy } from "react";
import { pageElement } from "../routeSupport";

// InnoFMS (Admin_42): fuel management. Each menu's page under its slugged name.
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const records = () => import("@/Components/InnoFMS/FmsRecords.jsx");
const fleets = () => import("@/Components/InnoFMS/Fleets.jsx");
const PAGES = {
  fuelsettings: page(() => import("@/Components/InnoFMS/FuelSettings.jsx"), "FuelSettings"),
  fuelproducts: page(records, "FuelProducts"),
  fuelprices: page(records, "FuelPrices"),
  forecourt: page(records, "Forecourt"),
  zones: page(records, "Zones"),
  discounts: page(records, "Discounts"),
  vehicles: page(fleets, "Vehicles"),
  drivers: page(fleets, "Drivers"),
  cardbindings: page(fleets, "CardBindings"),
  costcentres: page(fleets, "CostCentres"),
  fuellimits: page(fleets, "FuelLimits"),
  fuelsales: page(() => import("@/Components/InnoFMS/FuelSales.jsx"), "FuelSales"),
  fuelreports: page(() => import("@/Components/InnoFMS/FuelReports.jsx"), "FuelReports"),
};

export const fmsRoutes = Object.entries(PAGES).map(([path, Page]) => ({ path, element: pageElement(Page) }));

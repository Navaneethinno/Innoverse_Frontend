import { lazy } from "react";
import { pageElement } from "./routeSupport";

const Resource = lazy(() => import("@/Components/Config/AcctConfigResource.jsx").then((module) => ({ default: module.AcctConfigResource })));
// Slugs confirmed against a real /user/login menu_array: "Account"
// (menu_id 48) is a non-clickable group header — its children are Account
// Product (the acct_product entity itself, menu_id 49 -> slug
// "accountproduct"), Product Ownership, Product Party Type, Product
// Transaction, Product Channel, Product Balance Configuration, Product
// Group Configuration, Interest Configuration, Joint Configuration,
// Lifecycle Configuration, Dormancy Configuration, Minor Configuration,
// Alert Configuration, Nominee Configuration, Numbering Configuration,
// Opening Configuration, Statement Configuration — each slugified per
// MenuItem.jsx's slugifyMenuName (strip whitespace, lowercase, no other
// transform), so every "* Configuration" item keeps "configuration" in
// full rather than being abbreviated to "config". (Earlier assumed this
// entity was named bare "Product", colliding with Digital Product's own
// child of the same name — it isn't: that one's real name is "Account
// Product", already unique.)
const paths = [
  "accountproduct",
  "productownership",
  "productpartytype",
  "producttransaction",
  "productchannel",
  "productbalanceconfiguration",
  "productgroupconfiguration",
  "interestconfiguration",
  "jointconfiguration",
  "lifecycleconfiguration",
  "dormancyconfiguration",
  "minorconfiguration",
  "alertconfiguration",
  "nomineeconfiguration",
  "numberingconfiguration",
  "openingconfiguration",
  "statementconfiguration",
];
const entities = [
  "acct_product",
  "acct_product_ownership",
  "acct_product_party_type",
  "acct_product_transaction",
  "acct_product_channel",
  "acct_product_balance_config",
  "acct_product_group_config",
  "acct_product_interest_config",
  "acct_product_joint_config",
  "acct_product_lifecycle_config",
  "acct_product_dormancy_config",
  "acct_product_minor_config",
  "acct_product_alert_config",
  "acct_product_nominee_config",
  "acct_product_numbering_config",
  "acct_product_opening_config",
  "acct_product_statement_config",
];
export const acctConfigRoutes = [
  ...paths.flatMap((path, index) => [
    { path, element: pageElement(Resource, { entity: entities[index] }) },
    { path: `${path}/:id`, element: pageElement(Resource, { entity: entities[index] }) },
  ]),
  // "Account" (menu_id 48) is documented above as a non-clickable group
  // header, but that only holds when its children are present in this
  // user's own menu_array — when permissions filter all of them out for a
  // given session, MenuItem.jsx sees zero children and treats it as an
  // ordinary leaf, navigating to slugifyMenuName("Account") = "/account"
  // (confirmed live: hit RouteError, no route ever existed for that slug).
  // Routing it to the same acct_product listing "Account Product" already
  // uses is the sane default landing spot rather than leaving it 404.
  { path: "account", element: pageElement(Resource, { entity: "acct_product" }) },
  { path: "account/:id", element: pageElement(Resource, { entity: "acct_product" }) },
];

// Single source of truth for "which existing route serves this entity" —
// consumed by acctConfigurations.js so the Account Product configuration
// card grid (AcctConfigResource.jsx) links to these exact routes instead of
// a second, drifting copy of the path/entity pairing above.
export const ACCT_CONFIG_ROUTE_BY_ENTITY = Object.fromEntries(
  entities.map((entity, index) => [entity, paths[index]]),
);

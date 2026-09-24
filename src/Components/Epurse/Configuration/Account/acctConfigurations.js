import {
  Banknote,
  Bell,
  Clock3,
  Coins,
  Hash,
  Landmark,
  Layers,
  Percent,
  Power,
  Radio,
  Repeat,
  ShieldOff,
  UserCheck,
  Users,
  UserSquare2,
  Wallet,
} from "lucide-react";
import { ACCT_CONFIG_ROUTE_BY_ENTITY } from "@/Router/Epurse/accountRoutes";

// Drives the Account Product "Configure" card grid (see
// AccountConfigurationCards.jsx) — every entry here is a THIN pointer to an
// already-existing config page, never a new form. `route` is sourced from
// accountRoutes.jsx (the single place that pairing is defined) rather
// than duplicated here. `label` is copied verbatim from AcctConfigResource
// .jsx's own CONFIGS[entity].title — kept as a plain string instead of
// importing CONFIGS to avoid a circular import (AcctConfigResource.jsx is
// this file's own consumer, for the card grid itself).
//
// `enabledField` matches the boolean flag on the acct_product record
// exactly (see CONFIGS.acct_product.fields in AcctConfigResource.jsx).
// Three acct_product flags — currency_config_enabled,
// eligibility_config_enabled, accting_config_enabled — have no
// corresponding existing config page/route, so they're deliberately left
// out here rather than inventing one.
export const ACCOUNT_CONFIGURATIONS = [
  {
    entity: "acct_product_ownership",
    enabledField: "ownership_config_enabled",
    label: "Product Ownership",
    description: "Who may hold this product and how many holders are allowed.",
    icon: Users,
  },
  {
    entity: "acct_product_party_type",
    enabledField: "party_type_config_enabled",
    label: "Product Party Type",
    description: "Which party types (customer, merchant, agent...) can use it.",
    icon: UserSquare2,
  },
  {
    entity: "acct_product_transaction",
    enabledField: "transaction_config_enabled",
    label: "Product Transaction",
    description: "Allowed transaction types and their authentication rules.",
    icon: Repeat,
  },
  {
    entity: "acct_product_channel",
    enabledField: "channel_config_enabled",
    label: "Product Channel",
    description: "Which channels (app, web, POS...) this product is available on.",
    icon: Radio,
  },
  {
    entity: "acct_product_balance_config",
    enabledField: "balance_config_enabled",
    label: "Product Balance Configuration",
    description: "Minimum/maximum balance and overdraft rules.",
    icon: Wallet,
  },
  {
    entity: "acct_product_group_config",
    enabledField: "group_config_enabled",
    label: "Product Group Configuration",
    description: "Group account membership and shared-ownership rules.",
    icon: Layers,
  },
  {
    entity: "acct_product_interest_config",
    enabledField: "interest_config_enabled",
    label: "Interest Configuration",
    description: "Interest rate, accrual, and posting configuration.",
    icon: Percent,
  },
  {
    entity: "acct_product_joint_config",
    enabledField: "joint_config_enabled",
    label: "Joint Configuration",
    description: "Joint-holder limits and operation mode.",
    icon: UserCheck,
  },
  {
    entity: "acct_product_lifecycle_config",
    enabledField: "lifecycle_config_enabled",
    label: "Lifecycle Configuration",
    description: "Opening, freezing, closure, and reactivation rules.",
    icon: Power,
  },
  {
    entity: "acct_product_dormancy_config",
    enabledField: "dormancy_config_enabled",
    label: "Dormancy Configuration",
    description: "Inactivity threshold and the action taken once reached.",
    icon: Clock3,
  },
  {
    entity: "acct_product_minor_config",
    enabledField: "minor_config_enabled",
    label: "Minor Configuration",
    description: "Age limits and guardian requirements for minor accounts.",
    icon: ShieldOff,
  },
  {
    entity: "acct_product_alert_config",
    enabledField: "alert_config_enabled",
    label: "Alert Configuration",
    description: "Balance and activity alert thresholds.",
    icon: Bell,
  },
  {
    entity: "acct_product_nominee_config",
    enabledField: "nominee_config_enabled",
    label: "Nominee Configuration",
    description: "Nominee requirements and holder limits.",
    icon: Landmark,
  },
  {
    entity: "acct_product_numbering_config",
    enabledField: "numbering_config_enabled",
    label: "Numbering Configuration",
    description: "Account number generation method and sequencing.",
    icon: Hash,
  },
  {
    entity: "acct_product_opening_config",
    enabledField: "opening_config_enabled",
    label: "Opening Configuration",
    description: "Eligibility and initial deposit rules at account opening.",
    icon: Banknote,
  },
  {
    entity: "acct_product_statement_config",
    enabledField: "statement_config_enabled",
    label: "Statement Configuration",
    description: "Statement frequency and delivery preferences.",
    icon: Coins,
  },
].map((item) => ({ ...item, route: ACCT_CONFIG_ROUTE_BY_ENTITY[item.entity] }));

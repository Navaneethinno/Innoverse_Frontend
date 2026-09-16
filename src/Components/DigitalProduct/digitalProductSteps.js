// Static step config for the Digital Product Add/Edit wizards — kept
// separate from AddDigitalProductWizard.jsx/EditDigitalProductWizard.jsx/
// HorizontalStepper.jsx so a future backend-driven step list (once the
// unified workflow API exists) can replace or enrich this array without
// touching any of those components. `entity` matches
// digitalProductFields.jsx's exported CONFIGS keys exactly — both wizards
// reuse those same field definitions per step, neither defines its own.
//
// `parentIdField`/`parentEntity` mirror CONFIGS[entity].readOnlyOnEdit[0]
// for every entity here (product_map, security_config, kyc_config,
// channel_config, eligibility_config are all keyed off the Digital
// Product's own id; kyc_level off kyc_config's id; channel_transaction off
// channel_config's id; residency off eligibility_config's id) — not a new
// relationship invented for the wizards, just the same parent-child shape
// DigitalProductResource.jsx already enforces. EditDigitalProductWizard.jsx
// uses this to know which already-loaded step's record id to filter a
// later step's list by when locating that step's existing record for the
// product being edited.
import {
  BadgeCheck,
  Fingerprint,
  Gauge,
  Layers,
  Lock,
  MapPinned,
  Radio,
  Repeat,
  Waypoints,
} from "lucide-react";

// One explicit, distinct icon per step instead of deriving it from the
// generic sidebar icon picker (getMenuIcon) — that picker matches on
// regex'd label text meant for arbitrary backend menu names, so "KYC
// Config"/"KYC Level" both hit its one /kyc/i rule and "Channel
// Config"/"Channel Transaction" both hit its one /channel/i rule, leaving
// every step in each pair with the identical icon in the stepper.
export const DIGITAL_PRODUCT_STEPS = [
  { id: "digital-product", label: "Digital Product", entity: "product", order: 1, parentIdField: null, parentEntity: null, icon: Layers },
  { id: "product-map", label: "Product Map", entity: "product_map", order: 2, parentIdField: "product_id", parentEntity: "product", icon: Waypoints },
  { id: "security-config", label: "Security Config", entity: "security_config", order: 3, parentIdField: "product_id", parentEntity: "product", icon: Lock },
  { id: "kyc-config", label: "KYC Config", entity: "kyc_config", order: 4, parentIdField: "product_id", parentEntity: "product", icon: Fingerprint },
  { id: "kyc-level", label: "KYC Level", entity: "kyc_level", order: 5, parentIdField: "kyc_config_id", parentEntity: "kyc_config", icon: Gauge },
  { id: "channel-config", label: "Channel Config", entity: "channel_config", order: 6, parentIdField: "product_id", parentEntity: "product", icon: Radio },
  { id: "channel-transaction", label: "Channel Transaction", entity: "channel_transaction", order: 7, parentIdField: "channel_config_id", parentEntity: "channel_config", icon: Repeat },
  { id: "eligibility-config", label: "Eligibility Config", entity: "eligibility_config", order: 8, parentIdField: "product_id", parentEntity: "product", icon: BadgeCheck },
  { id: "residency", label: "Residency", entity: "residency", order: 9, parentIdField: "eligibility_config_id", parentEntity: "eligibility_config", icon: MapPinned },
];

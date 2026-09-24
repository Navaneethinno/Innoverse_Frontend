// Static step config for the Digital Product Add/Edit wizards — kept
// separate from AddDigitalProductWizard.jsx/EditDigitalProductWizard.jsx/
// HorizontalStepper.jsx so it can be reordered/relabeled without touching
// any of those components. `entity` matches digitalProductFields.jsx's
// exported CONFIGS keys exactly — both wizards reuse those same field
// definitions per step, neither defines its own.
//
// `parentEntity` records which step's saved record a given step nests
// under in the real `/digital_product/product/*` API's `sections` payload
// (kyc_level nests inside kyc_config's own section entry, channel_transaction
// inside channel_config's, residency inside eligibility_config's — see
// digitalProductWizardShared.jsx's buildSectionEditPayload, which is the
// only place this relationship is actually used).
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
  { id: "digital-product", label: "Digital Product", entity: "product", order: 1, parentEntity: null, icon: Layers },
  { id: "product-map", label: "Product Map", entity: "product_map", order: 2, parentEntity: "product", icon: Waypoints },
  { id: "security-config", label: "Security Config", entity: "security_config", order: 3, parentEntity: "product", icon: Lock },
  { id: "kyc-config", label: "KYC Config", entity: "kyc_config", order: 4, parentEntity: "product", icon: Fingerprint },
  { id: "kyc-level", label: "KYC Level", entity: "kyc_level", order: 5, parentEntity: "kyc_config", icon: Gauge },
  { id: "channel-config", label: "Channel Config", entity: "channel_config", order: 6, parentEntity: "product", icon: Radio },
  { id: "channel-transaction", label: "Channel Transaction", entity: "channel_transaction", order: 7, parentEntity: "channel_config", icon: Repeat },
  { id: "eligibility-config", label: "Eligibility Config", entity: "eligibility_config", order: 8, parentEntity: "product", icon: BadgeCheck },
  { id: "residency", label: "Residency", entity: "residency", order: 9, parentEntity: "eligibility_config", icon: MapPinned },
];

// Static step config for the Add Digital Product wizard — kept separate
// from AddDigitalProductWizard.jsx/HorizontalStepper.jsx so a future
// backend-driven step list (once the unified workflow API exists) can
// replace or enrich this array without touching either component. `entity`
// matches DigitalProductResource.jsx's exported CONFIGS keys exactly — the
// wizard reuses those same field definitions per step, it doesn't define
// its own.
export const DIGITAL_PRODUCT_STEPS = [
  { id: "digital-product", label: "Digital Product", entity: "product", order: 1 },
  { id: "product-map", label: "Product Map", entity: "product_map", order: 2 },
  { id: "security-config", label: "Security Config", entity: "security_config", order: 3 },
  { id: "kyc-config", label: "KYC Config", entity: "kyc_config", order: 4 },
  { id: "kyc-level", label: "KYC Level", entity: "kyc_level", order: 5 },
  { id: "channel-config", label: "Channel Config", entity: "channel_config", order: 6 },
  { id: "channel-transaction", label: "Channel Transaction", entity: "channel_transaction", order: 7 },
  { id: "eligibility-config", label: "Eligibility Config", entity: "eligibility_config", order: 8 },
  { id: "residency", label: "Residency", entity: "residency", order: 9 },
];

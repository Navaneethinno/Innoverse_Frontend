// Static step config for the Digital Product horizontal workflow — kept
// separate from DigitalProductWorkflow.jsx/HorizontalStepper.jsx so a future
// backend-driven step list (the workflow API the backend team is still
// building) can replace or enrich this array without touching either
// component. `entity` matches DigitalProductResource.jsx's CONFIGS keys and
// `path` matches digitalProductRoutes.jsx's route slugs exactly — both are
// existing, already-live values, not new ones invented for this workflow.
export const DIGITAL_PRODUCT_STEPS = [
  { id: "digital-product", label: "Digital Product", path: "digitalproduct", entity: "product", order: 1 },
  { id: "product-map", label: "Product Map", path: "productmap", entity: "product_map", order: 2 },
  { id: "security-config", label: "Security Config", path: "securityconfig", entity: "security_config", order: 3 },
  { id: "kyc-config", label: "KYC Config", path: "kycconfig", entity: "kyc_config", order: 4 },
  { id: "kyc-level", label: "KYC Level", path: "kyclevel", entity: "kyc_level", order: 5 },
  { id: "channel-config", label: "Channel Config", path: "channelconfig", entity: "channel_config", order: 6 },
  { id: "channel-transaction", label: "Channel Transaction", path: "channeltransaction", entity: "channel_transaction", order: 7 },
  { id: "eligibility-config", label: "Eligibility Config", path: "eligibilityconfig", entity: "eligibility_config", order: 8 },
  { id: "residency", label: "Residency", path: "residency", entity: "residency", order: 9 },
];

// Isolated so the actual property names/shape can change freely once the
// backend team publishes the unified workflow API's real contract — this
// mapping (entity key -> step data) is a reasonable guess, not a confirmed
// contract, and nothing outside submitDigitalProductWorkflow's caller in
// AddDigitalProductWizard.jsx needs to change when the real shape differs.
export function buildDigitalProductWorkflowPayload(stepValues) {
  return {
    digital_product: stepValues.product,
    product_map: stepValues.product_map,
    security_config: stepValues.security_config,
    kyc_config: stepValues.kyc_config,
    kyc_level: stepValues.kyc_level,
    channel_config: stepValues.channel_config,
    channel_transaction: stepValues.channel_transaction,
    eligibility_config: stepValues.eligibility_config,
    residency: stepValues.residency,
  };
}

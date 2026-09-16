// The backend team is building ONE unified Digital Product workflow API
// that will eventually replace calling each of the 9 existing per-entity
// Add endpoints separately during a guided creation flow. That endpoint
// does not exist yet, so this file does NOT call any of the existing
// digitalProductApi(entity).add(...) endpoints as a stand-in for it either
// — AddDigitalProductWizard.jsx only ever collects data locally across its
// 9 steps and calls this one function once, on final Submit.
//
// This is the single, isolated integration point for that future API:
// wiring up the real endpoint later means implementing the body of this
// one function (following the same request()/API_ENDPOINTS/service-file
// convention every other Services/* module in this project already uses —
// see digitalProduct.api.js) — nothing in the wizard needs to change.
export async function submitDigitalProductWorkflow(_payload) {
  throw new Error(
    "The unified Digital Product workflow API isn't available yet. This submission will be wired up once the backend team ships it.",
  );
}

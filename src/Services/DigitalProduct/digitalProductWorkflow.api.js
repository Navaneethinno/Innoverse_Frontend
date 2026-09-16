import { digitalProductApi } from "./digitalProduct.api";

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

// EditDigitalProductWizard.jsx's equivalent isolated integration point —
// saving ONE step of an existing Digital Product's configuration, not the
// whole 9-step set (the unified workflow API being built covers guided
// creation; editing an already-existing, possibly-approved record per
// backend maker-checker rules is a different operation the backend hasn't
// said will move to that same endpoint). Unlike submitDigitalProductWorkflow
// above, this already has a real backend today: each entity's own existing
// edit (when a record already exists for this step) or add (when it
// doesn't yet) endpoint, exactly what DigitalProductResource.jsx's own
// Editor already calls. If the backend later exposes a unified per-step
// Edit endpoint, only this function's body needs to change.
export async function saveDigitalProductWorkflowStep(entity, payload, recordId, isDraft = false) {
  const api = digitalProductApi(entity);
  return recordId != null
    ? api.edit({ ...payload, id: recordId, is_draft: isDraft })
    : api.add({ ...payload, is_draft: isDraft });
}

// Static step config for the Customer Add/Edit wizard — same role as
// digitalProductSteps.js. Reordered per the self-onboarding redesign
// handoff: Contact is now step 1 (it's what kicks off
// /customer/indv_onboarding/start), Personal Details (the profile's own
// fields, entity "profile") is step 2 and creates the Draft profile,
// followed by the wizard_config-driven Identification/Address steps, then
// the remaining CONFIGS-driven sections that are wired so far (Tax,
// Employment). The other sections the backend already accepts
// (business, financial_profile, source_of_fund, relationship, pep,
// document, communication, service_request) have no step here yet — add an
// entry here + a matching CONFIGS entry (or a dynamic step like
// identification/address) once a section's fields are known. KYC/
// verification/screening/risk are intentionally skipped forever — they're
// back-office/system-populated, never customer-entered.
import { BadgeCheck, Briefcase, Contact as ContactIcon, MapPin, Percent, UserRound } from "lucide-react";

export const CUSTOMER_STEPS = [
  { id: "contact", label: "Contact", entity: "contact", order: 1, icon: ContactIcon },
  { id: "customer", label: "Personal Details", entity: "profile", order: 2, icon: UserRound },
  { id: "identification", label: "Identification", entity: "identification", order: 3, icon: BadgeCheck, dynamic: true },
  { id: "address", label: "Address", entity: "address", order: 4, icon: MapPin, dynamic: true },
  { id: "tax", label: "Tax Details", entity: "tax", order: 5, icon: Percent },
  { id: "employment", label: "Employment", entity: "employment", order: 6, icon: Briefcase },
];

// Steps that need at least the profile's Draft id to exist before they can
// be visited (everything after Personal Details — they all save via
// `/customer/indv_profile/edit`, which requires `id`).
export const STEPS_REQUIRING_PROFILE = new Set(["identification", "address", "tax", "employment"]);

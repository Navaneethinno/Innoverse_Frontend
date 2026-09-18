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
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Contact as ContactIcon,
  FileText,
  Landmark,
  MapPin,
  MessageCircle,
  Percent,
  ShieldAlert,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export const CUSTOMER_STEPS = [
  { id: "contact", label: "Contact", entity: "contact", order: 1, icon: ContactIcon },
  { id: "customer", label: "Personal Details", entity: "profile", order: 2, icon: UserRound },
  { id: "identification", label: "Identification", entity: "identification", order: 3, icon: BadgeCheck, dynamic: true },
  { id: "address", label: "Address", entity: "address", order: 4, icon: MapPin, dynamic: true },
  { id: "tax", label: "Tax Details", entity: "tax", order: 5, icon: Percent },
  { id: "employment", label: "Employment", entity: "employment", order: 6, icon: Briefcase },
  { id: "business", label: "Business Details", entity: "business", order: 7, icon: Building2 },
  { id: "financial_profile", label: "Financial Profile", entity: "financial_profile", order: 8, icon: Wallet },
  { id: "source_of_fund", label: "Source of Funds", entity: "source_of_fund", order: 9, icon: Landmark },
  { id: "relationship", label: "Relationships", entity: "relationship", order: 10, icon: Users, dynamic: true },
  { id: "pep", label: "PEP Details", entity: "pep", order: 11, icon: ShieldAlert },
  { id: "document", label: "Documents", entity: "document", order: 12, icon: FileText, dynamic: true },
  { id: "communication", label: "Communication", entity: "communication", order: 13, icon: MessageCircle },
];

// Steps that need at least the profile's Draft id to exist before they can
// be visited (everything after Personal Details — they all save via
// `/customer/indv_profile/edit`, which requires `id`).
export const STEPS_REQUIRING_PROFILE = new Set([
  "identification",
  "address",
  "tax",
  "employment",
  "business",
  "financial_profile",
  "source_of_fund",
  "relationship",
  "pep",
  "document",
  "communication",
]);

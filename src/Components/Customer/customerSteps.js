// Static step config for the Customer Add/Edit wizard — same role as
// digitalProductSteps.js. Only 3 steps exist right now (Customer's own
// basic fields, Contact, Address) because those are the only sections the
// API reference documents field-by-field; the other 14 `sections` keys the
// backend already accepts have no step here yet (see customerFields.jsx's
// top comment) — add an entry here + a matching CONFIGS entry once a
// section's fields are known.
import { Contact as ContactIcon, MapPin, UserRound } from "lucide-react";

export const CUSTOMER_STEPS = [
  { id: "customer", label: "Customer", entity: "profile", order: 1, icon: UserRound },
  { id: "contact", label: "Contact", entity: "contact", order: 2, icon: ContactIcon },
  { id: "address", label: "Address", entity: "address", order: 3, icon: MapPin },
];

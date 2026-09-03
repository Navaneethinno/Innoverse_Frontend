import {
  AlertTriangle,
  Bot,
  ClipboardList,
  CreditCard,
  Fingerprint,
  Landmark,
  Layers,
  Link2,
  Lock,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

const MODULE_ICON_RULES = [
  [/purse|wallet/i, Wallet],
  [/risk/i, ShieldAlert],
  [/cms|content/i, ClipboardList],
  [/mms|merchant|store/i, Store],
  [/pay/i, CreditCard],
  [/secure|security/i, Lock],
  [/aml/i, ShieldCheck],
  [/chatbot|bot/i, Bot],
  [/fraud/i, AlertTriangle],
  [/lrms|loan|recovery/i, Landmark],
  [/recon/i, RefreshCcw],
  [/bridge/i, Link2],
  [/fleet/i, Truck],
  [/kyc|identity/i, Fingerprint],
];

export function getModuleIcon(moduleName = "") {
  const match = MODULE_ICON_RULES.find(([pattern]) => pattern.test(moduleName));
  return match ? match[1] : Layers;
}

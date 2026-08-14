/** Domain types matching Part 2 and Part 5 of the specification. */

export type ActionType =
  | "tree_planting"
  | "solar_install"
  | "ev_purchase"
  | "energy_reduction"
  | "water_reduction"
  | "commute"
  | "fail_test";

export type VerificationMethod = "satellite" | "ocr" | "gps";

export type CreditCategory = "land" | "energy" | "water" | "transport";

export type ClaimStatus =
  | "submitted"
  | "verifying"
  | "verified"
  | "rejected"
  | "minting"
  | "minted"
  | "mint_failed";

export type SwapStatus = "pending" | "accepted" | "rejected" | "failed";

export const CLAIM_STATUSES: ClaimStatus[] = [
  "submitted",
  "verifying",
  "verified",
  "rejected",
  "minting",
  "minted",
  "mint_failed",
];

export const TERMINAL_STATUSES: ClaimStatus[] = ["rejected", "minted", "mint_failed"];

export function isTerminal(status: ClaimStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** User-facing labels for action types (Part 2.1). */
export const ACTION_LABELS: Record<Exclude<ActionType, "fail_test">, string> = {
  tree_planting: "Planted trees",
  solar_install: "Installed solar",
  ev_purchase: "Bought an EV",
  energy_reduction: "Reduced electricity use",
  water_reduction: "Reduced water use",
  commute: "Low-carbon commuting",
};

export function actionLabel(action: ActionType): string {
  if (action === "fail_test") return "Test claim";
  return ACTION_LABELS[action] ?? action;
}

export const ACTION_METHODS: Record<Exclude<ActionType, "fail_test">, VerificationMethod> = {
  tree_planting: "satellite",
  solar_install: "ocr",
  ev_purchase: "ocr",
  energy_reduction: "ocr",
  water_reduction: "ocr",
  commute: "gps",
};

export const CATEGORIES: CreditCategory[] = ["land", "energy", "water", "transport"];

export const METHODS: VerificationMethod[] = ["satellite", "ocr", "gps"];

// ----- API response shapes (Part 5) -----

export interface ClaimCreated {
  claim_id: string;
  status: ClaimStatus;
}

export interface ClaimSummary {
  claim_id: string;
  action_type: ActionType;
  status: ClaimStatus;
  submitted_at: string;
  credits_awarded: number | null;
  category: CreditCategory | null;
}

export interface ClaimList {
  claims: ClaimSummary[];
  total: number;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number | null;
  credits: number | null;
  category: CreditCategory | null;
  /** No fixed schema — render generically, never hardcode keys. */
  evidence: Record<string, unknown>;
}

export interface ClaimDetail {
  claim_id: string;
  action_type: ActionType;
  method: VerificationMethod;
  status: ClaimStatus;
  submitted_at: string;
  verified_at: string | null;
  location: { lat: number | null; lng: number | null; radius_m: number | null } | null;
  dates: { before: string | null; after: string | null } | null;
  file_name: string | null;
  verification: VerificationResult | null;
  tx_hash: string | null;
  error: string | null;
}

export interface Balance {
  balances: Record<CreditCategory, number>;
  total: number;
}

export interface UserInfo {
  id: string;
  name: string;
  wallet_address: string;
}

export interface UserList {
  users: UserInfo[];
}

export interface SwapSide {
  category: CreditCategory;
  amount: number;
}

export interface SwapItem {
  swap_id: string;
  counterparty: { id: string; name: string };
  they_offer: SwapSide;
  they_want: SwapSide;
  status: SwapStatus;
  created_at: string;
}

export interface SwapList {
  incoming: SwapItem[];
  outgoing: SwapItem[];
}

export interface SwapCreateBody {
  counterparty_id: string;
  offer_category: CreditCategory;
  offer_amount: number;
  want_category: CreditCategory;
  want_amount: number;
}

/** Typed fetch wrapper for the backend (Part 5). */

import type {
  Balance,
  ClaimCreated,
  ClaimDetail,
  ClaimList,
  SwapCreateBody,
  SwapList,
  UserList,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USER_KEY = "carbon-credit:user-id";

/** Error carrying the backend's human-readable detail message. */
export class ApiError extends Error {
  status: number;
  /** Machine-readable code from the error envelope, e.g. INSUFFICIENT_BALANCE. */
  code: string;
  /** The offending field, when the backend can name one. */
  field: string | null;
  constructor(status: number, detail: string, code = "ERROR", field: string | null = null) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

/** The backend's message when we have one; a calm fallback when we don't. */
export function messageFrom(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function setStoredUserId(id: string): void {
  window.localStorage.setItem(USER_KEY, id);
}

export function clearStoredUserId(): void {
  window.localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const userId = getStoredUserId();
  if (userId) headers.set("X-User-Id", userId);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "The server is not responding. Check that the backend is running.");
  }

  if (!response.ok) {
    let message = "Something went wrong";
    let code = "ERROR";
    let field: string | null = null;
    try {
      const body = await response.json();
      // Spec §6 envelope, with the legacy `detail` shape as a fallback.
      if (body?.error && typeof body.error.message === "string") {
        message = body.error.message;
        code = body.error.code ?? code;
        field = body.error.field ?? null;
      } else if (typeof body?.detail === "string") {
        message = body.detail;
      }
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(response.status, message, code, field);
  }

  return (await response.json()) as T;
}

// ----- claims -----

export function createClaimJson(body: Record<string, unknown>): Promise<ClaimCreated> {
  return request("/api/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createClaimFile(
  actionType: string,
  method: string,
  file: File,
): Promise<ClaimCreated> {
  const form = new FormData();
  form.set("action_type", actionType);
  form.set("method", method);
  form.set("file", file);
  return request("/api/claims", { method: "POST", body: form });
}

export function listClaims(params?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<ClaimList> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.category) q.set("category", params.category);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const query = q.toString();
  return request(`/api/claims${query ? `?${query}` : ""}`);
}

export function getClaim(id: string): Promise<ClaimDetail> {
  return request(`/api/claims/${id}`);
}

export function retryMint(id: string): Promise<ClaimCreated> {
  return request(`/api/claims/${id}/retry-mint`, { method: "POST" });
}

// ----- balance and users -----

export function getBalance(): Promise<Balance> {
  return request("/api/balance");
}

export function listUsers(): Promise<UserList> {
  return request("/api/users");
}

export function listAllUsers(): Promise<UserList> {
  return request("/api/users/all");
}

// ----- swaps -----

export function listSwaps(): Promise<SwapList> {
  return request("/api/swaps");
}

export function createSwap(body: SwapCreateBody): Promise<{ swap_id: string; status: string }> {
  return request("/api/swaps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function acceptSwap(id: string): Promise<{ swap_id: string; status: string }> {
  return request(`/api/swaps/${id}/accept`, { method: "POST" });
}

export function rejectSwap(id: string): Promise<{ swap_id: string; status: string }> {
  return request(`/api/swaps/${id}/reject`, { method: "POST" });
}

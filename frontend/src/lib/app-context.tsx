"use client";

/**
 * Session-wide state: the demo user and the persistent balance readout.
 * The user switcher sets X-User-Id (via localStorage) — a demo device,
 * not authentication.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  clearStoredUserId,
  getBalance,
  getStoredUserId,
  listAllUsers,
  setStoredUserId,
} from "./api";
import type { Balance, UserInfo } from "./types";

interface AppState {
  users: UserInfo[];
  currentUserId: string | null;
  currentUser: UserInfo | null;
  switchUser: (id: string) => void;
  logOut: () => void;
  balance: Balance | null;
  balanceError: boolean;
  refreshBalance: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [balanceError, setBalanceError] = useState(false);

  // Monotonic token so a slow response for the previous user can never
  // overwrite the balance shown for the current one.
  const balanceSeq = useRef(0);

  const refreshBalance = useCallback(async () => {
    const seq = ++balanceSeq.current;
    try {
      const next = await getBalance();
      if (seq !== balanceSeq.current) return; // stale response — drop it
      setBalance(next);
      setBalanceError(false);
    } catch {
      if (seq !== balanceSeq.current) return;
      setBalanceError(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCurrentUserId(getStoredUserId());
    listAllUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list.users);
      })
      .catch(() => {
        /* the bar shows a degraded state; pages surface their own errors */
      });
    // No session, no balance to fetch — the login gate handles it.
    if (getStoredUserId()) refreshBalance();
    return () => {
      cancelled = true;
    };
  }, [refreshBalance]);

  const switchUser = useCallback(
    (id: string) => {
      setStoredUserId(id);
      setCurrentUserId(id);
      balanceSeq.current++; // invalidate any in-flight fetch for the old user
      setBalance(null);
      refreshBalance();
    },
    [refreshBalance],
  );

  const logOut = useCallback(() => {
    clearStoredUserId();
    balanceSeq.current++; // drop any in-flight balance for the old session
    setCurrentUserId(null);
    setBalance(null);
    setBalanceError(false);
  }, []);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? null,
    [users, currentUserId],
  );

  const value = useMemo(
    () => ({
      users,
      currentUserId,
      currentUser,
      switchUser,
      logOut,
      balance,
      balanceError,
      refreshBalance,
    }),
    [
      users,
      currentUserId,
      currentUser,
      switchUser,
      logOut,
      balance,
      balanceError,
      refreshBalance,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

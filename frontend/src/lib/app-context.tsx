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
  useState,
  type ReactNode,
} from "react";

import { getBalance, getStoredUserId, listAllUsers, setStoredUserId } from "./api";
import type { Balance, UserInfo } from "./types";

interface AppState {
  users: UserInfo[];
  currentUserId: string | null;
  currentUser: UserInfo | null;
  switchUser: (id: string) => void;
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

  const refreshBalance = useCallback(async () => {
    try {
      setBalance(await getBalance());
      setBalanceError(false);
    } catch {
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
        // Adopt the backend default (first seeded user) if nothing stored.
        if (!getStoredUserId() && list.users.length > 0) {
          setStoredUserId(list.users[0].id);
          setCurrentUserId(list.users[0].id);
        }
      })
      .catch(() => {
        /* the rail shows a degraded state; pages surface their own errors */
      });
    refreshBalance();
    return () => {
      cancelled = true;
    };
  }, [refreshBalance]);

  const switchUser = useCallback(
    (id: string) => {
      setStoredUserId(id);
      setCurrentUserId(id);
      setBalance(null);
      refreshBalance();
    },
    [refreshBalance],
  );

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
      balance,
      balanceError,
      refreshBalance,
    }),
    [users, currentUserId, currentUser, switchUser, balance, balanceError, refreshBalance],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getStoredUserId } from "./api";

/**
 * Sends anyone without a chosen profile back to the login gate.
 * Returns false until the check has run, so pages can hold their render
 * rather than flashing content that is about to be replaced.
 */
export function useSessionGuard(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getStoredUserId()) {
      setReady(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  return ready;
}

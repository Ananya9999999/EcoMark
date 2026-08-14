"use client";

/**
 * Session gate. This is a demo device, not authentication — no passwords are
 * collected and nothing is secured. Choosing a profile sets the X-User-Id
 * header used by every request; Log out clears it.
 */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { listAllUsers, messageFrom } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import type { UserInfo } from "@/lib/types";
import { StaticField } from "@/components/three/AtmosphericField";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";

export default function LoginPage() {
  const router = useRouter();
  const { switchUser } = useApp();
  const [users, setUsers] = useState<UserInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    listAllUsers()
      .then((l) => setUsers(l.users))
      .catch((e) => setError(messageFrom(e, "The profile list could not be loaded")));
  };

  useEffect(load, []);

  const choose = (id: string) => {
    switchUser(id);
    router.push("/dashboard");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <StaticField className="pointer-events-none absolute inset-0 opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="panel relative z-10 w-full max-w-md p-8"
      >
        <div className="mb-1 flex items-center gap-3">
          <Image src="/mark.png" alt="" width={44} height={44} priority className="h-11 w-11" />
          <div>
            <span
              className="font-display block text-primary"
              style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              EcoMark
            </span>
            <span className="t-label" style={{ fontSize: 12 }}>
              Verify · Credit · Impact
            </span>
          </div>
        </div>

        <h1 className="t-28 mt-5 text-primary">Choose a profile</h1>
        <p className="t-14 mt-2 text-secondary">
          This demo runs without passwords. Pick whose ledger to open — you can
          log out and switch at any time.
        </p>

        <div className="mt-7">
          {error ? (
            <ErrorPanel message={error} onRetry={load} />
          ) : users == null ? (
            <ul className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="skeleton h-14 w-full" aria-hidden />
              ))}
            </ul>
          ) : users.length === 0 ? (
            <p className="t-14 text-secondary">
              No profiles exist yet. Run the seed script, then reload.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {users.map((u, i) => (
                <motion.li
                  key={u.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.28 }}
                >
                  <button
                    onClick={() => choose(u.id)}
                    className="field flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:border-signal"
                    style={{ borderRadius: "var(--r-row)" }}
                  >
                    <span
                      aria-hidden
                      className="mono-14 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-elevated text-signal"
                    >
                      {u.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-14 block text-primary">{u.name}</span>
                      <span className="mono-12 block truncate text-muted">
                        {u.wallet_address.slice(0, 14)}…{u.wallet_address.slice(-4)}
                      </span>
                    </span>
                    <span aria-hidden className="mono-12 text-muted">
                      →
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </main>
  );
}

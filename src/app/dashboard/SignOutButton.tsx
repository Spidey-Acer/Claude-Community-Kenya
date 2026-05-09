"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useTransition } from "react";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut({ redirect: false });
      window.location.href = "/";
    });
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-secondary px-4 py-2 text-xs font-mono text-text-secondary hover:border-red/40 hover:text-red transition-colors disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}

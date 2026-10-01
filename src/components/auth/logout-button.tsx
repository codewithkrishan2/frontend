"use client";

import { useTransition } from "react";

import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui";

/**
 * Sign-out control.
 *
 * `useTransition` gives a pending state while the Server Action revokes the
 * refresh token, so the button cannot be double-submitted into two logout calls.
 */
export function LogoutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      className={className}
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
        });
      }}
    >
      {pending ? "Signing out" : "Sign out"}
    </Button>
  );
}

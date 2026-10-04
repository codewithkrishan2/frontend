"use client";

import { useActionState, useState } from "react";

import { Alert, Button, Dialog } from "@/components/ui";
import { idleState } from "@/lib/auth/action-state";
import { disconnectScmConnectionAction } from "@/lib/scm/actions";

type DisconnectConnectionProps = {
  connectionId: number;
  /** Shown in the confirmation copy so the user knows which account goes. */
  accountLabel: string;
  providerName: string;
};

/**
 * Disconnect, behind a confirmation.
 *
 * Confirmed rather than immediate because it destroys the stored credentials:
 * reversing it means going through provider consent again, which is more than a
 * misclick deserves.
 *
 * Driven by a real `<form>` posting to a Server Action, so the id travels in
 * `FormData` and the control degrades to a normal submit. The dialog closes
 * itself once the action reports success — the connection's status flipping to
 * "Disconnected" in the refreshed list is the confirmation, so there is no
 * message to leave behind.
 */
export function DisconnectConnection({
  connectionId,
  accountLabel,
  providerName,
}: DisconnectConnectionProps) {
  const [requested, setRequested] = useState(false);
  const [state, formAction, pending] = useActionState(
    disconnectScmConnectionAction,
    idleState,
  );

  /**
   * The confirmation is up while the user has asked for it and the request has
   * not succeeded. Derived rather than synchronised through an effect: "stop
   * asking once it is done" is a rule about the current state, not a reaction to
   * a change, and an effect calling `setState` here would be a render cascade
   * for something already knowable.
   */
  const open = requested && state.status !== "success";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setRequested(true)}
        aria-haspopup="dialog"
      >
        Disconnect
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          // Ignore the backdrop and Escape while the action is in flight, so the
          // user is not left wondering whether it went through.
          if (!pending) setRequested(false);
        }}
        title={`Disconnect ${providerName}?`}
        description={`CodeRev will destroy the stored credentials for ${accountLabel} and stop reading its pull requests. Nothing in your repositories changes, and you can reconnect at any time.`}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="connectionId" value={connectionId} />

          {state.status === "error" ? (
            <Alert tone="fail" title="Could not disconnect">
              {state.message}
            </Alert>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequested(false)}
              disabled={pending}
            >
              Cancel
            </Button>

            <Button type="submit" variant="danger" loading={pending}>
              {pending ? "Disconnecting" : "Disconnect"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export type { DisconnectConnectionProps };

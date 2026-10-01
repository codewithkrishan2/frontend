"use client";

import { useActionState } from "react";

import { updateProfileAction } from "@/lib/auth/actions";
import { idleState } from "@/lib/auth/action-state";
import { MAX_FULL_NAME_LENGTH } from "@/lib/api/types";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * Edits the one profile field the backend accepts.
 *
 * `UpdateProfileRequest` carries only `fullName`, so there is nothing else to
 * offer here. Email, avatar and status are all read-only server-side.
 *
 * `useActionState` keeps the Server Action's result — including per-field
 * validation messages parsed out of the backend's `errors` map — without any
 * client-side fetch or state library.
 */
export function ProfileForm({
  currentFullName,
}: {
  currentFullName: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    idleState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="Full name"
        error={
          state.status === "error" ? state.fieldErrors?.fullName : undefined
        }
        hint={`Up to ${MAX_FULL_NAME_LENGTH} characters.`}
      >
        {(props) => (
          <Input
            {...props}
            name="fullName"
            defaultValue={currentFullName ?? ""}
            maxLength={MAX_FULL_NAME_LENGTH}
            placeholder="Your name"
            autoComplete="name"
            disabled={pending}
          />
        )}
      </Field>

      {/* Only surface the top-level message when it is not already shown
          against the field, to avoid saying the same thing twice. */}
      {state.status === "error" && !state.fieldErrors?.fullName ? (
        <Alert tone="fail">{state.message}</Alert>
      ) : null}

      {state.status === "success" ? (
        <Alert tone="pass">{state.message}</Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {pending ? "Saving" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Shared result shape for the identity Server Actions.
 *
 * Kept in its own module because a `"use server"` file may only export async
 * functions — exporting the `idleState` constant from `actions.ts` fails the
 * build with "A \"use server\" file can only export async functions, found
 * object."
 */

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      /** Field name -> message, mirroring the backend's validation `errors` map. */
      fieldErrors?: Record<string, string>;
    };

export const idleState: ActionState = { status: "idle" };

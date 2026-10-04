"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ActionState } from "@/lib/auth/action-state";
import { clearSession, getFreshAccessToken } from "@/lib/auth/session";
import { disconnectScmConnection } from "@/lib/scm/service";

/**
 * Server Actions for the SCM module.
 *
 * Only disconnect lives here. Connecting cannot be an action: it has to end in a
 * cross-origin browser navigation to a consent screen, and an action can only
 * redirect within this app — hence the Route Handler at
 * `/api/scm/connect/[providerCode]`.
 */

/**
 * `DELETE /api/v1/scm/connections/{connectionId}`
 *
 * Destroys the stored credentials and marks the row `DISCONNECTED`. The row is
 * kept, so the connection stays visible under history rather than vanishing.
 *
 * Reads the id from `FormData` so the caller can be a plain `<form action={…}>`
 * and keep working without JavaScript.
 */
export async function disconnectScmConnectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = formData.get("connectionId");
  const connectionId = Number(typeof raw === "string" ? raw : Number.NaN);

  if (!Number.isInteger(connectionId) || connectionId <= 0) {
    // Only reachable if the form was tampered with — the backend would answer
    // 400 anyway, but there is no reason to make the round trip.
    return {
      status: "error",
      message: "That connection could not be identified.",
    };
  }

  const accessToken = await getFreshAccessToken();

  if (!accessToken) {
    // getFreshAccessToken already cleared the session when refresh was rejected.
    redirect(appRoutes.login);
  }

  try {
    await disconnectScmConnection(accessToken, connectionId);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isUnauthorized) {
        // A Server Action may write cookies, so clearing here is safe and avoids
        // the redirect loop a lingering dead session would cause.
        await clearSession();
        redirect(appRoutes.login);
      }

      if (error.isNotFound) {
        // Already gone, or never belonged to this user — the backend cannot tell
        // the two apart without leaking the difference. Either way the user's
        // intent is satisfied, so report success and let the list refresh.
        revalidatePath(appRoutes.integrations);
        return {
          status: "success",
          message: "That connection is already disconnected.",
        };
      }

      return { status: "error", message: error.message };
    }

    throw error;
  }

  // The hub is a Server Component reading the connection list, so it has to be
  // re-rendered for the status change to appear.
  revalidatePath(appRoutes.integrations);

  return { status: "success", message: "Connection disconnected." };
}

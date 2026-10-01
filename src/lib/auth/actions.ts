"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { MAX_FULL_NAME_LENGTH } from "@/lib/api/types";
import type { ActionState } from "@/lib/auth/action-state";
import {
  clearSession,
  getFreshAccessToken,
  getSession,
  revokeRefreshToken,
  updateCurrentUser,
} from "@/lib/auth/session";

/**
 * Server Actions for the identity module.
 *
 * Mutations live here rather than in a client-side fetch layer because Server
 * Actions are one of the few places Next.js permits cookie writes — which is
 * exactly what token refresh needs, since the backend rotates and revokes the
 * refresh token on every use.
 */

/**
 * `PATCH /api/v1/users/me`
 *
 * Only `fullName` is editable; the backend rejects nothing else because it
 * accepts nothing else.
 */
export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = formData.get("fullName");
  const fullName = typeof raw === "string" ? raw.trim() : "";

  // Mirror @Size(max = 100) client-side so the round trip is skipped for an
  // obviously invalid value. The backend still enforces it.
  if (fullName.length > MAX_FULL_NAME_LENGTH) {
    return {
      status: "error",
      message: "Please shorten your name.",
      fieldErrors: {
        fullName: `Name must not exceed ${MAX_FULL_NAME_LENGTH} characters`,
      },
    };
  }

  if (!fullName) {
    // `UpdateProfileRequest.fullName` has no @NotBlank, so an empty string is
    // accepted and would wipe the stored name. Refuse instead of silently
    // clearing it.
    return {
      status: "error",
      message: "Name cannot be empty.",
      fieldErrors: { fullName: "Enter your name" },
    };
  }

  const accessToken = await getFreshAccessToken();

  if (!accessToken) {
    // getFreshAccessToken already cleared the session when refresh was rejected.
    redirect(appRoutes.login);
  }

  try {
    await updateCurrentUser(accessToken, { fullName });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isUnauthorized) {
        // A Server Action *can* write cookies, so clearing here is safe and
        // avoids the redirect loop a lingering dead session would cause.
        await clearSession();
        redirect(appRoutes.login);
      }

      return {
        status: "error",
        message: error.message,
        ...(error.isValidationError ? { fieldErrors: error.fieldErrors } : {}),
      };
    }

    throw error;
  }

  // The dashboard is a Server Component reading the profile, so it has to be
  // re-rendered for the new name to appear.
  revalidatePath(appRoutes.dashboard);

  return { status: "success", message: "Profile updated." };
}

/**
 * `POST /api/v1/auth/logout`
 *
 * Revokes the refresh token server-side, then clears the cookies.
 *
 * The backend does not blacklist access tokens, so the current one stays
 * technically valid until it expires (up to 15 minutes). Dropping the cookie is
 * what ends the session here, which is why the cookie clear happens
 * unconditionally — even if the backend call fails.
 */
export async function logoutAction(): Promise<void> {
  const session = await getSession();

  if (session) {
    try {
      await revokeRefreshToken(session.refreshToken);
    } catch {
      // Logout is idempotent on the backend and an unknown token still returns
      // 200, so a failure here means the network or the service is down. Either
      // way the local session must still go.
    }
  }

  await clearSession();
  redirect(appRoutes.login);
}

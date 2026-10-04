import "server-only";

import { endpoints } from "@/lib/api/endpoints";
import { apiRequest, apiRequestData } from "@/lib/api/server";
import type {
  CreateScmConnectionRequest,
  ScmAuthorizationUrlResponse,
  ScmConnectionResponse,
  ScmProviderDetailResponse,
  ScmProviderResponse,
} from "@/lib/api/types";

/**
 * Typed access to the SCM module's REST endpoints.
 *
 * Mirrors `lib/auth/session.ts`: thin wrappers that take an access token rather
 * than reading cookies themselves, so the caller decides whether a refresh is
 * possible. Read wrappers are safe from a Server Component — middleware has
 * already ensured the token is fresh before a protected page renders. Writes
 * belong in a Server Action or Route Handler, where a rotated token can be
 * persisted.
 *
 * Every call throws `ApiError` on a non-2xx, carrying the backend's
 * `ScmErrorCode` on `.code`.
 */

/**
 * `GET /api/v1/scm/providers`
 *
 * Active providers only, ordered by `displayOrder` then `providerName`. Returns
 * a bare array — there is no pagination envelope.
 */
export async function fetchScmProviders(
  accessToken: string,
): Promise<ScmProviderResponse[]> {
  return apiRequestData<ScmProviderResponse[]>(endpoints.scm.providers, {
    accessToken,
  });
}

/**
 * `GET /api/v1/scm/providers/{providerId}`
 *
 * Takes the numeric id, not the provider code. Resolves regardless of the
 * `active` flag, so a provider switched off after a user connected still renders
 * its detail page.
 */
export async function fetchScmProviderDetail(
  accessToken: string,
  providerId: number,
): Promise<ScmProviderDetailResponse> {
  return apiRequestData<ScmProviderDetailResponse>(
    endpoints.scm.provider(providerId),
    { accessToken },
  );
}

/**
 * `GET /api/v1/scm/connections`
 *
 * Every connection belonging to the caller, newest first, **including
 * `DISCONNECTED` ones** — the backing query has no status filter. Use
 * `isLiveConnection` to split live from historical.
 */
export async function fetchScmConnections(
  accessToken: string,
): Promise<ScmConnectionResponse[]> {
  return apiRequestData<ScmConnectionResponse[]>(endpoints.scm.connections, {
    accessToken,
  });
}

/**
 * `GET /api/v1/scm/connections/{connectionId}`
 *
 * A connection id belonging to someone else answers 404
 * `SCM_CONNECTION_NOT_FOUND`, not 403 — ownership is checked by the service
 * layer's `requireOwned`, which cannot distinguish "not yours" from "not there"
 * without leaking the difference.
 */
export async function fetchScmConnection(
  accessToken: string,
  connectionId: number,
): Promise<ScmConnectionResponse> {
  return apiRequestData<ScmConnectionResponse>(
    endpoints.scm.connection(connectionId),
    { accessToken },
  );
}

/**
 * `GET /api/v1/scm/connections/authorize?providerCode=...`
 *
 * Asks the backend to build a provider consent URL. The response is JSON rather
 * than a redirect, so the caller has to navigate the browser to
 * `authorizationUrl` itself.
 *
 * The embedded `state` is valid for 10 minutes, which bounds how long the
 * returned URL stays usable.
 */
export async function requestScmAuthorizationUrl(
  accessToken: string,
  providerCode: string,
): Promise<ScmAuthorizationUrlResponse> {
  return apiRequestData<ScmAuthorizationUrlResponse>(
    endpoints.scm.authorize(providerCode),
    { accessToken },
  );
}

/**
 * `DELETE /api/v1/scm/connections/{connectionId}`
 *
 * Destroys the stored credentials and marks the row `DISCONNECTED`; the row
 * itself is kept for history. Idempotent, so disconnecting twice is not an
 * error.
 *
 * Uses `apiRequest` rather than `apiRequestData` because the envelope carries a
 * message and no `data` (`ApiResponse.success("SCM connection disconnected",
 * null)` with `NON_NULL` serialisation).
 */
export async function disconnectScmConnection(
  accessToken: string,
  connectionId: number,
): Promise<void> {
  await apiRequest<void>(endpoints.scm.connection(connectionId), {
    method: "DELETE",
    accessToken,
  });
}

/**
 * `POST /api/v1/scm/connections`
 *
 * The frontend-captured-code path: exchanges a provider authorization code for a
 * connection without any `state` verification, because identity comes from the
 * verified bearer token instead.
 *
 * Unused today. The configured provider redirect URIs point at the backend's own
 * callback, so codes never reach this app. Kept so the contract is complete if a
 * provider is ever registered against a frontend redirect URI.
 */
export async function createScmConnection(
  accessToken: string,
  request: CreateScmConnectionRequest,
): Promise<ScmConnectionResponse> {
  return apiRequestData<ScmConnectionResponse>(endpoints.scm.connections, {
    method: "POST",
    body: request,
    accessToken,
  });
}

/**
 * Finds a provider by its code, case-insensitively.
 *
 * Needed because the app routes provider pages by code (`/integrations/GITHUB`)
 * while `GET /scm/providers/{providerId}` is keyed by the numeric id. Returns
 * `undefined` rather than throwing so the caller can render a 404.
 */
export function findProviderByCode(
  providers: readonly ScmProviderResponse[],
  providerCode: string,
): ScmProviderResponse | undefined {
  const wanted = providerCode.trim().toUpperCase();
  return providers.find(
    (provider) => provider.providerCode.toUpperCase() === wanted,
  );
}

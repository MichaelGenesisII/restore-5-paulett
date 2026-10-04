/** @deprecated Prefer `@/lib/auth/require-host`. */
export {
  type HostSession as CreatorSession,
  type HostSession,
  bearerToken,
  requireHost as requireCreator,
  requireHost,
  isAuthFailure,
  requireOwnedPot,
} from "@/lib/auth/require-host";

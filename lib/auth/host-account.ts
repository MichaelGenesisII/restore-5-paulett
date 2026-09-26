/**
 * Host account helpers — same Auth/Fundraiser plumbing as the former creator-account module.
 */
export {
  type EnsureCreatorResult as EnsureHostResult,
  isExistingCreatorEmail as isExistingHostEmail,
  ensureCreatorAuthAccount as ensureHostAuthAccount,
  resetCreatorTemporaryPassword as resetHostTemporaryPassword,
  isExistingCreatorEmail,
  ensureCreatorAuthAccount,
  resetCreatorTemporaryPassword,
} from "@/lib/auth/creator-account";

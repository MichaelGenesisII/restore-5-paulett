import { generateTemporaryPassword } from "@/lib/auth/temp-password";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { VisitorError } from "@/lib/visitor-safe";

export type EnsureAdminResult = {
  authUserId: string;
  email: string;
  temporaryPassword: string | null;
  isNewAccount: boolean;
};

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const normalized = email.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.error("Auth listUsers failed (admin invite)", error);
      throw new VisitorError(
        "We could not set up that admin login. Please try again.",
      );
    }
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized,
    );
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Ensures a Supabase email/password login for an invited admin.
 * Returns a temporary password only when the Auth user is newly created.
 */
export async function ensureAdminAuthAccount(input: {
  email: string;
  invitedBy: string;
}): Promise<EnsureAdminResult> {
  const email = input.email.trim().toLowerCase();
  const admin = getSupabaseAdmin();

  try {
    const already = await findAuthUserIdByEmail(email);
    if (already) {
      return {
        authUserId: already,
        email,
        temporaryPassword: null,
        isNewAccount: false,
      };
    }

    const temporaryPassword = generateTemporaryPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        invited_by: input.invitedBy.trim().toLowerCase(),
      },
    });

    if (error || !data.user) {
      const raced = await findAuthUserIdByEmail(email);
      if (raced) {
        return {
          authUserId: raced,
          email,
          temporaryPassword: null,
          isNewAccount: false,
        };
      }
      console.error("Auth createUser failed (admin invite)", error);
      throw new VisitorError(
        "We could not set up that admin login. Please try again.",
      );
    }

    return {
      authUserId: data.user.id,
      email,
      temporaryPassword,
      isNewAccount: true,
    };
  } catch (error) {
    if (error instanceof VisitorError) throw error;
    console.error("ensureAdminAuthAccount failed", error);
    throw new VisitorError(
      "We could not set up that admin login. Please try again.",
    );
  }
}

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateTemporaryPassword } from "@/lib/auth/temp-password";
import { prisma } from "@/lib/prisma";
import { VisitorError } from "@/lib/visitor-safe";

export type EnsureCreatorResult = {
  authUserId: string;
  email: string;
  /** Only set when a brand-new Auth user was created. */
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
      console.error("Auth listUsers failed", error);
      throw new VisitorError(
        "We could not set up your creator login. Please try again.",
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
 * True when this email already has a Fundraiser row or a Supabase Auth login.
 * Used to tailor create-flow copy before the pot is opened.
 */
export async function isExistingCreatorEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;

  const fundraiser = await prisma.fundraiser.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (fundraiser) return true;

  const authUserId = await findAuthUserIdByEmail(normalized);
  return Boolean(authUserId);
}

/**
 * Ensures an email/password login exists for this creator.
 * No verification email — `email_confirm: true`. Returns a temporary
 * password only when the Auth user is newly created.
 */
export async function ensureCreatorAuthAccount(input: {
  email: string;
  name: string;
  existingAuthUserId?: string | null;
}): Promise<EnsureCreatorResult> {
  const email = input.email.trim().toLowerCase();
  const admin = getSupabaseAdmin();

  if (input.existingAuthUserId) {
    return {
      authUserId: input.existingAuthUserId,
      email,
      temporaryPassword: null,
      isNewAccount: false,
    };
  }

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
        name: input.name.trim(),
        role: "pot_creator",
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
      console.error("Auth createUser failed", error);
      throw new VisitorError(
        "We could not set up your creator login. Please try again.",
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
    console.error("ensureCreatorAuthAccount failed", error);
    throw new VisitorError(
      "We could not set up your creator login. Please try again.",
    );
  }
}

export async function resetCreatorTemporaryPassword(
  email: string,
): Promise<{ authUserId: string; temporaryPassword: string } | null> {
  const normalized = email.trim().toLowerCase();
  let authUserId: string | null;
  try {
    authUserId = await findAuthUserIdByEmail(normalized);
  } catch (error) {
    if (error instanceof VisitorError) throw error;
    console.error("resetCreatorTemporaryPassword lookup failed", error);
    throw new VisitorError(
      "We could not reset that password right now. Please try again.",
    );
  }
  if (!authUserId) return null;

  const temporaryPassword = generateTemporaryPassword();
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    password: temporaryPassword,
  });
  if (error) {
    console.error("Auth updateUserById failed", error);
    throw new VisitorError(
      "We could not reset that password right now. Please try again.",
    );
  }

  return { authUserId, temporaryPassword };
}

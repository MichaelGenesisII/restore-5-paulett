"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

type HostLoginFormProps = {
  /** Called after Supabase session is ready. Keep this fast — navigation belongs here. */
  onSignedIn?: () => void | Promise<void>;
  submitLabel?: string;
  /** Extra actions under the submit row (e.g. Cancel). */
  footer?: ReactNode;
  /** Visual: cream panel (modal) vs transparent on navy gate. */
  tone?: "cream" | "onNavy";
  className?: string;
  /** Overrides the busy overlay label after credentials are accepted. */
  workingLabel?: string;
  /** When navigating away, skip the success toast on this page. */
  skipSuccessToast?: boolean;
  /**
   * Which reset email to prefer. Admin gate should pass "admin" so staff
   * get the Operations Desk template instead of Host copy.
   */
  passwordResetAudience?: "admin" | "host";
};

/**
 * Shared email/password form for creator sign-in (gate + modal).
 */
export function HostLoginForm({
  onSignedIn,
  submitLabel = "Sign in",
  footer,
  tone = "cream",
  className = "",
  workingLabel,
  skipSuccessToast = false,
  passwordResetAudience = "host",
}: HostLoginFormProps) {
  const toast = useToast();
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "auth" | "next">("idle");

  const busy = pending || resetting;
  const onDark = tone === "onNavy";
  const busyCopy = resetting
    ? "Sending a new password…"
    : phase === "next"
      ? (workingLabel ?? "Opening…")
      : "Signing you in…";

  async function onLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setPhase("auth");

    try {
      const supabase = getSupabaseBrowser();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signError) {
        const code = signError.message.toLowerCase();
        if (
          code.includes("invalid login") ||
          code.includes("invalid credentials")
        ) {
          throw new Error("That email or password is not right.");
        }
        if (code.includes("email not confirmed")) {
          throw new Error(
            "This login is not ready yet. Try again in a moment, or reset your password.",
          );
        }
        console.error("Host sign-in failed", signError);
        throw new Error("We could not sign you in. Please try again.");
      }

      setPhase("next");
      await onSignedIn?.();
      if (!skipSuccessToast) {
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(
        "Could not sign you in",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setPending(false);
      setPhase("idle");
    }
  }

  async function onForgotPassword() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(
        "Email needed first",
        passwordResetAudience === "admin"
          ? "Enter your admin email, then tap Forgot password."
          : "Enter your host email, then tap Forgot password.",
      );
      return;
    }

    setResetting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          audience: passwordResetAudience,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            data.error,
            "Could not reset the password. Please try again.",
          ),
        );
      }
      toast.success(
        "Check your inbox",
        data.message ??
          "If that email has an account, a new temporary password is on its way.",
      );
    } catch (err) {
      toast.error(
        "Could not reset the password",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <form
      onSubmit={onLoginSubmit}
      className={`relative flex flex-col gap-3.5 ${className}`}
    >
      {busy ? (
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-sm backdrop-blur-[1px] ${
            onDark ? "bg-pvn-navy/85" : "bg-pvn-cream/90"
          }`}
          role="status"
          aria-live="polite"
        >
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
            aria-hidden
          />
          <p
            className={`font-nav text-xs font-bold tracking-[0.16em] uppercase ${
              onDark ? "text-pvn-cream" : "text-pvn-navy"
            }`}
          >
            {busyCopy}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label
          htmlFor={`${uid}-email`}
          className={onDark ? `${labelClass} text-pvn-cream/70` : labelClass}
        >
          Email
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          autoComplete="email"
          required
          className={
            onDark
              ? `${fieldClass} border-pvn-cream/20 bg-pvn-cream/95`
              : fieldClass
          }
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={busy}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={`${uid}-password`}
          className={onDark ? `${labelClass} text-pvn-cream/70` : labelClass}
        >
          Password
        </label>
        <input
          id={`${uid}-password`}
          type="password"
          autoComplete="current-password"
          required
          className={
            onDark
              ? `${fieldClass} border-pvn-cream/20 bg-pvn-cream/95`
              : fieldClass
          }
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          disabled={busy}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => void onForgotPassword()}
          disabled={busy}
          className={`font-nav font-bold tracking-[0.06em] underline decoration-pvn-gold/40 underline-offset-4 transition disabled:opacity-50 ${
            onDark
              ? "text-pvn-cream/65 hover:text-pvn-gold"
              : "text-pvn-navy/55 hover:text-pvn-navy"
          }`}
        >
          Forgot password?
        </button>
        <Link
          href="/contact"
          className={`font-nav font-bold tracking-[0.06em] underline decoration-pvn-gold/40 underline-offset-4 transition ${
            onDark
              ? "text-pvn-cream/65 hover:text-pvn-gold"
              : "text-pvn-navy/55 hover:text-pvn-navy"
          }`}
        >
          Forgot email?
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
        <button
          type="submit"
          disabled={busy}
          className="font-nav inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}

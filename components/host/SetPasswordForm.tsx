"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

export function SetPasswordForm({ token }: { token: string }) {
  const uid = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the one-time link out of history and screenshots once loaded.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (!token) {
    return (
      <div className="mt-8 rounded-sm border border-pvn-navy/10 bg-white/70 px-4 py-4 text-sm leading-relaxed text-pvn-navy/75">
        This link is incomplete. Open the button in your email again, or use
        “Forgot password?” on the{" "}
        <Link href="/host" className="font-semibold text-pvn-navy underline">
          Host sign-in
        </Link>{" "}
        screen.
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await response.json()) as {
        error?: string;
        email?: string;
        session?: { access_token: string; refresh_token: string } | null;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not save that password. Please try again.",
          ),
        );
      }

      const supabase = getSupabaseBrowser();
      if (json.session) {
        await supabase.auth.setSession(json.session);
      } else if (json.email) {
        await supabase.auth.signInWithPassword({ email: json.email, password });
      }
      window.location.replace("/host");
    } catch (err) {
      setError(
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-password`} className={labelClass}>
          Password
        </label>
        <input
          id={`${uid}-password`}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
          disabled={pending}
        />
        <span className="text-xs text-pvn-navy/50">At least 8 characters.</span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-confirm`} className={labelClass}>
          Confirm password
        </label>
        <input
          id={`${uid}-confirm`}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={fieldClass}
          disabled={pending}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm leading-relaxed text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="font-nav mt-1 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set password and sign in"}
      </button>
    </form>
  );
}

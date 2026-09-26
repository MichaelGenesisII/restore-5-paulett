"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type InboxMessage = {
  id: string;
  topic: string;
  topicLabel: string;
  name: string;
  email: string;
  message: string;
  handled: boolean;
  createdAt: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ageDays(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function replyMailto(m: InboxMessage) {
  const subject = `Re: ${m.topicLabel} — 5 Paulett`;
  const body = `\n\n---\nOn ${formatWhen(m.createdAt)}, ${m.name} wrote:\n\n${m.message}`;
  return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function AdminInboxDetail({ id }: { id: string }) {
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<InboxMessage | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await adminFetch(
      `/api/admin/inbox/${encodeURIComponent(id)}`,
    );
    const json = (await response.json()) as {
      message?: InboxMessage;
      error?: string;
    };
    if (response.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "We could not load this message.",
        ),
      );
    }
    setMessage(json.message ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    void load().catch((err) => {
      if (cancelled) return;
      toast.error(
        "Message unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, toast]);

  async function setHandled(handled: boolean) {
    if (!message) return;
    setBusy(true);
    try {
      const response = await adminFetch(
        `/api/admin/inbox/${encodeURIComponent(message.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ handled }),
        },
      );
      const json = (await response.json()) as {
        message?: InboxMessage;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not update that message.",
          ),
        );
      }
      toast.success(handled ? "Marked done" : "Reopened");
      if (json.message) {
        setMessage(json.message);
      } else {
        setMessage({ ...message, handled });
      }
      if (handled) {
        router.push("/admin/inbox");
      }
    } catch (err) {
      toast.error(
        "Update failed",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied");
    } catch {
      toast.error("Could not copy", "Select and copy the address instead.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
        <span
          className="h-7 w-7 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
          aria-hidden
        />
        <p className="font-nav text-xs font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
          Loading message…
        </p>
      </div>
    );
  }

  if (notFound || !message) {
    return (
      <div className="w-full">
        <Link
          href="/admin/inbox"
          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
        >
          ← Inbox
        </Link>
        <div className="mx-auto mt-6 flex min-h-[42vh] max-w-lg flex-col items-center justify-center rounded-sm border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center sm:mt-8 sm:min-h-[38vh] sm:px-10 sm:py-14">
          <h1 className="font-display text-2xl font-semibold text-pvn-navy sm:text-[1.75rem]">
            Message not found
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
            This message may have been removed, or the link is incorrect.
          </p>
          <Link
            href="/admin/inbox"
            className="font-nav mt-6 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 sm:w-auto"
          >
            View inbox
          </Link>
        </div>
      </div>
    );
  }

  const stale = !message.handled && ageDays(message.createdAt) >= 3;

  return (
    <div className="w-full">
      <Link
        href="/admin/inbox"
        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
      >
        ← Inbox
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-gold uppercase">
            {message.topicLabel}
            {message.handled ? (
              <span className="ml-2 text-pvn-navy/40">Done</span>
            ) : stale ? (
              <span className="ml-2 text-amber-800/70">Waiting</span>
            ) : (
              <span className="ml-2 text-pvn-navy/40">Open</span>
            )}
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-pvn-navy">
            {message.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pvn-navy/60">
            <button
              type="button"
              onClick={() => void copyEmail(message.email)}
              className="break-all text-left underline decoration-pvn-gold/30 underline-offset-2 hover:decoration-pvn-gold"
              title="Copy email"
            >
              {message.email}
            </button>
            <span className="text-pvn-navy/30">·</span>
            <time dateTime={message.createdAt}>
              {formatWhen(message.createdAt)}
            </time>
          </p>
          {stale ? (
            <p className="mt-2 text-[0.75rem] text-amber-900/75">
              Open for {Math.floor(ageDays(message.createdAt))} days — worth a
              reply soon.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={replyMailto(message)}
            className="font-nav inline-flex min-h-10 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90"
          >
            Reply by email
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => void setHandled(!message.handled)}
            className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold disabled:opacity-50"
          >
            {busy ? "…" : message.handled ? "Reopen" : "Mark done"}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-sm border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
        <p className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
          Message
        </p>
        <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-pvn-navy/85">
          {message.message}
        </p>
      </div>
    </div>
  );
}

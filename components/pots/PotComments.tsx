"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { hostAccessToken, hostFetch } from "@/lib/host-client";
import { formatWholeGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

export type PotComment = {
  id: string;
  donorName: string | null;
  amount: number;
  message: string | null;
  /** At most one — from the pot creator. */
  creatorReply: string | null;
};

const REPLY_MAX = 1000;

/**
 * Gift comments with optional creator replies. Replies stay collapsed until
 * opened (YouTube-style). Signed-in owners can reply, edit, delete, hide.
 */
export function PotComments({
  comments: initialComments,
  creatorName,
  totalCount,
  potSlug,
}: {
  comments: PotComment[];
  creatorName: string;
  totalCount: number;
  potSlug: string;
}) {
  const toast = useToast();
  const [comments, setComments] = useState(initialComments);
  const [canManage, setCanManage] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [composeId, setComposeId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "delete-reply"; id: string }
    | { kind: "delete-comment"; id: string }
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const creatorInitial = creatorName.charAt(0).toUpperCase() || "C";

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const checkManage = useCallback(async () => {
    try {
      const token = await hostAccessToken();
      if (!token) {
        setCanManage(false);
        return;
      }
      const response = await hostFetch("/api/host/me");
      if (!response.ok) {
        setCanManage(false);
        return;
      }
      const json = (await response.json()) as {
        pots?: Array<{ slug: string }>;
      };
      setCanManage(
        Boolean(json.pots?.some((pot) => pot.slug === potSlug)),
      );
    } catch {
      setCanManage(false);
    }
  }, [potSlug]);

  useEffect(() => {
    void checkManage();
  }, [checkManage]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCompose(id: string) {
    setComposeId((current) => (current === id ? null : id));
    setEditingId(null);
  }

  async function saveReply(id: string) {
    const reply = (drafts[id] ?? "").trim();
    if (!reply) {
      toast.error("Empty reply", "Write a short reply before posting.");
      return;
    }
    if (reply.length > REPLY_MAX) {
      toast.error("Reply too long", `Keep replies under ${REPLY_MAX} characters.`);
      return;
    }

    setBusyId(id);
    try {
      const response = await hostFetch(
        `/api/host/pots/${potSlug}/comments/${id}/reply`,
        {
          method: "PUT",
          body: JSON.stringify({ reply }),
        },
      );
      const json = (await response.json()) as {
        comment?: { creatorReply: string | null };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(response.status, json.error, "Could not save reply."),
        );
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, creatorReply: json.comment?.creatorReply ?? reply }
            : c,
        ),
      );
      setComposeId(null);
      setEditingId(null);
      setExpandedIds((prev) => new Set(prev).add(id));
      toast.success("Reply saved", "One reply per gift message.");
    } catch (err) {
      toast.error(
        "Reply not saved",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  function onReplySubmit(event: FormEvent, id: string) {
    event.preventDefault();
    void saveReply(id);
  }

  async function hideComment(id: string) {
    setBusyId(id);
    try {
      const response = await hostFetch(
        `/api/host/pots/${potSlug}/comments/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ hidden: true }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(response.status, json.error, "Could not hide comment."),
        );
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success("Comment hidden", "Visitors will not see it on this page.");
    } catch (err) {
      toast.error(
        "Not hidden",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm.kind === "delete-comment") {
        const response = await hostFetch(
          `/api/host/pots/${potSlug}/comments/${confirm.id}`,
          { method: "DELETE" },
        );
        const json = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            visitorSafeApiError(response.status, json.error, "Could not delete."),
          );
        }
        setComments((prev) => prev.filter((c) => c.id !== confirm.id));
        toast.success("Comment deleted", "The gift amount remains.");
      } else {
        const response = await hostFetch(
          `/api/host/pots/${potSlug}/comments/${confirm.id}/reply`,
          { method: "DELETE" },
        );
        const json = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            visitorSafeApiError(response.status, json.error, "Could not delete reply."),
          );
        }
        setComments((prev) =>
          prev.map((c) =>
            c.id === confirm.id ? { ...c, creatorReply: null } : c,
          ),
        );
        toast.success("Reply deleted", "You can post a new one later.");
      }
      setConfirm(null);
    } catch (err) {
      toast.error(
        "Action failed",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setConfirmBusy(false);
    }
  }

  const displayCount = canManage ? comments.length : totalCount;

  return (
    <div className="max-w-2xl lg:max-w-3xl">
      <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
        Comments
      </p>
      <h2 className="font-display mt-2 text-[1.75rem] font-semibold text-pvn-navy sm:text-4xl">
        {displayCount} {displayCount === 1 ? "message" : "messages"} with the gifts
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-pvn-navy/60">
        Givers leave a word. The host may answer once.
      </p>

      <ul className="mt-6 divide-y divide-pvn-navy/10 border-t border-pvn-navy/10 sm:mt-8">
        {comments.map((comment) => {
          const name = comment.donorName?.trim() || "Anonymous";
          const initial =
            name === "Anonymous" ? "?" : name.charAt(0).toUpperCase();
          const replyText = comment.creatorReply?.trim() ?? "";
          const hasReply = Boolean(replyText);
          const expanded = expandedIds.has(comment.id);
          const composing = composeId === comment.id || editingId === comment.id;
          const draft = drafts[comment.id] ?? (editingId === comment.id ? replyText : "");
          const busy = busyId === comment.id;

          return (
            <li key={comment.id} className="py-4 sm:py-5">
              <div className="flex gap-3 sm:gap-4">
                <div
                  className="font-nav flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pvn-navy text-sm font-bold text-pvn-gold sm:h-10 sm:w-10"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-sm font-semibold text-pvn-navy">{name}</p>
                    <p className="text-xs text-pvn-navy/45">
                      gave {formatWholeGbp(comment.amount)}
                    </p>
                  </div>
                  {comment.message ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-pvn-navy/75 text-pretty whitespace-pre-wrap">
                      {comment.message}
                    </p>
                  ) : null}

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {hasReply && !editingId ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(comment.id)}
                        aria-expanded={expanded}
                        className="font-nav inline-flex items-center gap-1 text-[0.7rem] font-bold tracking-[0.08em] text-pvn-navy/55 transition hover:text-pvn-gold"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            expanded ? "rotate-180" : ""
                          }`}
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M7 10l5 5 5-5H7z" />
                        </svg>
                        {expanded ? "Hide reply" : "View reply"}
                      </button>
                    ) : null}

                    {canManage && !hasReply ? (
                      <button
                        type="button"
                        onClick={() => toggleCompose(comment.id)}
                        aria-expanded={composing}
                        className="font-nav inline-flex items-center gap-1.5 text-[0.7rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase transition hover:text-pvn-gold"
                      >
                        {composing ? "Cancel" : "Reply"}
                      </button>
                    ) : null}

                    {canManage && hasReply && !editingId ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(comment.id);
                            setComposeId(null);
                            setDrafts((prev) => ({
                              ...prev,
                              [comment.id]: replyText,
                            }));
                            setExpandedIds((prev) => new Set(prev).add(comment.id));
                          }}
                          className="font-nav text-[0.7rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase transition hover:text-pvn-gold"
                        >
                          Edit reply
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ kind: "delete-reply", id: comment.id })
                          }
                          className="font-nav text-[0.7rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase transition hover:text-red-700"
                        >
                          Delete reply
                        </button>
                      </>
                    ) : null}

                    {canManage ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void hideComment(comment.id)}
                          className="font-nav text-[0.7rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase transition hover:text-pvn-gold"
                        >
                          Hide
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ kind: "delete-comment", id: comment.id })
                          }
                          className="font-nav text-[0.7rem] font-bold tracking-[0.12em] text-red-800/65 uppercase transition hover:text-red-700"
                        >
                          Delete
                        </button>
                      </>
                    ) : null}
                  </div>

                  {hasReply && expanded && !editingId ? (
                    <div className="mt-3 flex gap-3 border-l-2 border-pvn-gold/70 pl-3 sm:pl-4">
                      <div
                        className="font-nav flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pvn-gold text-xs font-bold text-pvn-navy"
                        aria-hidden
                      >
                        {creatorInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="text-sm font-semibold text-pvn-navy">
                            {creatorName}
                          </p>
                          <span className="font-nav rounded-sm bg-pvn-gold/20 px-1.5 py-0.5 text-[0.55rem] font-bold tracking-[0.12em] text-pvn-navy/70 uppercase">
                            Host
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-pvn-navy/70 text-pretty whitespace-pre-wrap">
                          {replyText}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {canManage && composing ? (
                    <form
                      onSubmit={(event) => onReplySubmit(event, comment.id)}
                      className="mt-3 overflow-hidden rounded-sm border border-pvn-navy/12 bg-white/80 shadow-[0_12px_28px_-22px_rgba(12,27,51,0.5)]"
                    >
                      <div className="flex items-center gap-2 border-b border-pvn-navy/8 bg-pvn-navy/[0.03] px-3 py-2">
                        <span
                          className="font-nav flex h-6 w-6 items-center justify-center rounded-full bg-pvn-gold text-[0.6rem] font-bold text-pvn-navy"
                          aria-hidden
                        >
                          {creatorInitial}
                        </span>
                        <p className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase">
                          One reply · as {creatorName}
                        </p>
                      </div>
                      <label htmlFor={`reply-${comment.id}`} className="sr-only">
                        Your reply
                      </label>
                      <textarea
                        id={`reply-${comment.id}`}
                        rows={3}
                        maxLength={REPLY_MAX}
                        disabled={busy}
                        className="w-full resize-y bg-transparent px-3 py-3 text-sm text-pvn-navy placeholder:text-pvn-navy/40 focus:outline-none"
                        placeholder="Thank them. One reply per gift message."
                        value={draft}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [comment.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-pvn-navy/8 px-3 py-2.5">
                        {editingId === comment.id ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditingId(null)}
                            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase"
                          >
                            Cancel
                          </button>
                        ) : null}
                        <button
                          type="submit"
                          disabled={busy || !draft.trim()}
                          className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-40"
                        >
                          {busy ? "Saving…" : hasReply ? "Save reply" : "Post reply"}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ResultModal
        open={confirm !== null}
        variant="confirm"
        title={
          confirm?.kind === "delete-reply"
            ? "Delete this reply?"
            : "Delete this comment?"
        }
        body={
          confirm?.kind === "delete-reply"
            ? "The gift message stays. Your reply will be removed."
            : "This removes the giver’s words and any reply. The gift amount stays."
        }
        confirmLabel="Delete"
        onConfirm={() => void runConfirm()}
        onClose={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        busy={confirmBusy}
      />
    </div>
  );
}

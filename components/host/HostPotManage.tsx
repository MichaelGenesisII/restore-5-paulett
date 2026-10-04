"use client";

import {
  formatWholeGbp,
  formatTidyGbp,
  MAX_DONATION_PENCE,
  MIN_DONATION_PENCE,
  MIN_POT_SEED_PENCE,
  poundsToPence,
} from "@/lib/money";
import {
  canTransitionPotStatus,
  statusChangeCopy,
  type PotLifecycleStatus,
} from "@/lib/pot-lifecycle";
import {
  MIN_FOUNDER_STORY_WORDS,
  MIN_POT_DESCRIPTION_WORDS,
  optionalCopyProblem,
  potTypes,
  wordCount,
} from "@/lib/pots";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";
import { useHostDashboard } from "@/components/host/HostDashboardShell";
import { useToast } from "@/components/toast/ToastProvider";
import { hostFetch } from "@/lib/host-client";
import {
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { PotType } from "@prisma/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ResultModal } from "@/components/ResultModal";
import { HostShareKit } from "@/components/host/HostShareKit";
import { HostEmptyState } from "@/components/host/HostEmptyState";
import { HostPotAnalytics } from "@/components/host/HostPotAnalytics";
import { HostPotCoverPlaceholder } from "@/components/host/HostPotCoverPlaceholder";
import { HostPotStatusChip } from "@/components/host/HostPotStatusChip";
import { normalizeSlug } from "@/lib/slug";

type ManageComment = {
  id: string;
  donorName: string | null;
  amount: number;
  message: string | null;
  messageOriginal: string | null;
  commentHidden: boolean;
  creatorReply: string | null;
  creatorReplyAt: string | null;
  isAnonymous: boolean;
  createdAt: string;
};

type SilentGift = {
  id: string;
  donorName: string | null;
  amount: number;
  isAnonymous: boolean;
  createdAt: string;
};

type ManagePot = {
  slug: string;
  title: string;
  story: string | null;
  founderStory: string | null;
  photoUrl: string | null;
  type: PotType;
  status: string;
  targetAmount: number;
  totalRaised: number;
  donorCount: number;
  donations: ManageComment[];
  silentGifts: SilentGift[];
};

type MessageFilter = "all" | "needs-reply" | "hidden";
type ManageTab = "details" | "visibility" | "messages" | "analytics";

const MESSAGES_PER_PAGE = 10;
const MANAGE_CACHE_TTL_MS = 60_000;

function manageCacheKey(slug: string) {
  return `pot-manage:${slug}`;
}

function applyManagePot(
  next: ManagePot,
  setters: {
    setPot: (p: ManagePot) => void;
    setTitle: (v: string) => void;
    setSlugDraft: (v: string) => void;
    setStory: (v: string) => void;
    setFounderStory: (v: string) => void;
    setType: (v: PotType) => void;
    setTargetPounds: (v: string) => void;
    setPhotoUrl: (v: string | null) => void;
    setDetailsDirty: (v: boolean) => void;
    setReplyDrafts: (v: Record<string, string>) => void;
    setMessageDrafts: (v: Record<string, string>) => void;
    setEditingMessageId: (v: string | null) => void;
  },
) {
  setters.setPot({
    ...next,
    silentGifts: next.silentGifts ?? [],
    donations: (next.donations ?? []).map((d) => ({
      ...d,
      messageOriginal: d.messageOriginal ?? null,
    })),
  });
  setters.setTitle(next.title);
  setters.setSlugDraft(next.slug);
  setters.setStory(next.story ?? "");
  setters.setFounderStory(next.founderStory ?? "");
  setters.setType(next.type);
  setters.setTargetPounds(String(next.targetAmount / 100));
  setters.setPhotoUrl(next.photoUrl);
  setters.setDetailsDirty(false);
  setters.setReplyDrafts(
    Object.fromEntries(
      next.donations.map((d) => [d.id, d.creatorReply ?? ""]),
    ),
  );
  setters.setMessageDrafts(
    Object.fromEntries(next.donations.map((d) => [d.id, d.message ?? ""])),
  );
  setters.setEditingMessageId(null);
}

function HostPotManageSkeleton({ title }: { title?: string | null }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading pot…</span>
      <div>
        <div className="h-3 w-24 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div
          className={`mt-3 h-8 animate-pulse rounded-sm bg-pvn-navy/10 ${title ? "w-0 opacity-0" : "w-56"}`}
        />
        {title ? (
          <h1 className="font-display mt-2 text-3xl font-semibold text-pvn-navy sm:text-4xl">
            {title}
          </h1>
        ) : null}
        <div className="mt-3 h-4 w-64 animate-pulse rounded-sm bg-pvn-navy/8" />
        <div className="mt-4 flex gap-2">
          <div className="h-10 w-28 animate-pulse rounded-md bg-pvn-navy/8" />
          <div className="h-10 w-36 animate-pulse rounded-md bg-pvn-navy/8" />
        </div>
      </div>
      <div className="flex gap-3 border-b border-pvn-navy/10 pb-3">
        <div className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
      </div>
      <div className="space-y-3 border border-pvn-navy/10 bg-white/55 p-5">
        <div className="h-4 w-24 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-10 w-full animate-pulse rounded-sm bg-pvn-navy/8" />
        <div className="h-4 w-24 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-24 w-full animate-pulse rounded-sm bg-pvn-navy/8" />
      </div>
    </div>
  );
}

function tabFromHash(hash: string): ManageTab {
  const h = hash.replace(/^#/, "").toLowerCase();
  if (h === "messages" || h === "silent-gifts") return "messages";
  if (h === "analytics") return "analytics";
  if (h === "visibility") return "visibility";
  return "details";
}

const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COVER_MAX = 5 * 1024 * 1024;
const REPLY_MAX = 1000;
const MESSAGE_MAX = 2000;

const fieldClass =
  "mt-1.5 w-full rounded-sm border border-pvn-navy/15 bg-white/80 px-3 py-2.5 text-sm text-pvn-navy transition focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/25 focus:outline-none";

const labelClass =
  "font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase";

const sectionLead =
  "mt-1 max-w-xl text-sm leading-relaxed text-pvn-navy/55";

export function HostPotManage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { refresh, applyMe, data: dashboard, setFormDirty } = useHostDashboard();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [pot, setPot] = useState<ManagePot | null>(null);
  const [title, setTitle] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [story, setStory] = useState("");
  const [founderStory, setFounderStory] = useState("");
  const [type, setType] = useState<PotType>("INDIVIDUAL");
  const [targetPounds, setTargetPounds] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seedPreset, setSeedPreset] = useState<number | null>(MIN_POT_SEED_PENCE);
  const [seedCustom, setSeedCustom] = useState("");
  const [seeding, setSeeding] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [messagesPage, setMessagesPage] = useState(1);
  const [silentGiftsPage, setSilentGiftsPage] = useState(1);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});

  const [confirm, setConfirm] = useState<
    | null
    | { kind: "delete-comment"; id: string }
    | { kind: "delete-reply"; id: string }
    | { kind: "remove-cover" }
    | { kind: "redact-comment"; id: string; message: string }
    | { kind: "status"; to: PotLifecycleStatus }
    | { kind: "change-slug"; nextSlug: string }
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [tab, setTab] = useState<ManageTab>("details");

  useEffect(() => {
    function syncTab() {
      setTab(tabFromHash(window.location.hash));
    }
    syncTab();
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);

  function selectTab(next: ManageTab) {
    setTab(next);
    const hash =
      next === "details"
        ? "details"
        : next === "visibility"
          ? "visibility"
          : next === "messages"
            ? "messages"
            : "analytics";
    if (window.location.hash.replace(/^#/, "") !== hash) {
      window.history.replaceState(null, "", `#${hash}`);
    }
  }

  const seedPence = useMemo(
    () => (seedCustom.trim() ? poundsToPence(seedCustom) : seedPreset),
    [seedCustom, seedPreset],
  );

  const load = useCallback(async () => {
    const setters = {
      setPot,
      setTitle,
      setSlugDraft,
      setStory,
      setFounderStory,
      setType,
      setTargetPounds,
      setPhotoUrl,
      setDetailsDirty,
      setReplyDrafts,
      setMessageDrafts,
      setEditingMessageId,
    };

    const cached = readHostClientCache<ManagePot>(
      manageCacheKey(slug),
      MANAGE_CACHE_TTL_MS,
    );
    if (cached) {
      applyManagePot(cached, setters);
      setLoading(false);
    } else {
      setPot((current) => (current?.slug === slug ? current : null));
      setLoading(true);
    }

    const response = await hostFetch(`/api/host/pots/${slug}`);
    const json = (await response.json()) as { pot?: ManagePot; error?: string };
    if (!response.ok || !json.pot) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "We could not load this pot.",
        ),
      );
    }
    const next = json.pot;
    applyManagePot(
      {
        ...next,
        silentGifts: next.silentGifts ?? [],
        donations: next.donations ?? [],
      },
      setters,
    );
    writeHostClientCache(manageCacheKey(slug), next);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    setFormDirty(detailsDirty);
    return () => setFormDirty(false);
  }, [detailsDirty, setFormDirty]);

  useEffect(() => {
    let cancelled = false;
    // load() paints the sessionStorage cache before revalidating; that first
    // render from an external store is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((err) => {
      if (cancelled) return;
      toast.error(
        "Could not load pot",
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

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    const storyProblem = optionalCopyProblem(
      story,
      MIN_POT_DESCRIPTION_WORDS,
      "The description",
    );
    if (storyProblem) {
      toast.error("Description too short", storyProblem);
      return;
    }
    const founderProblem = optionalCopyProblem(
      founderStory,
      MIN_FOUNDER_STORY_WORDS,
      "Your story",
    );
    if (founderProblem) {
      toast.error("Story too short", founderProblem);
      return;
    }

    const targetAmountPence = poundsToPence(targetPounds);
    if (
      targetAmountPence === null ||
      targetAmountPence < MIN_DONATION_PENCE ||
      targetAmountPence > MAX_DONATION_PENCE
    ) {
      toast.error(
        "Target amount",
        `Choose a target between ${formatWholeGbp(MIN_DONATION_PENCE)} and ${formatWholeGbp(MAX_DONATION_PENCE)}.`,
      );
      return;
    }

    setSaving(true);
    try {
      const response = await hostFetch(`/api/host/pots/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          story: story.trim() || null,
          founderStory: founderStory.trim() || null,
          type,
          targetAmountPence,
          photoUrl,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not save those changes.",
          ),
        );
      }
      await load();
      await refresh();
      setDetailsDirty(false);
      toast.success("Pot updated", "Your public page shows the new details.");
    } catch (err) {
      toast.error(
        "Not saved",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCoverChange(file: File | null) {
    if (!file) return;
    if (!COVER_TYPES.has(file.type)) {
      toast.error("Cover image", "Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > COVER_MAX) {
      toast.error("Cover image", "Keep the cover under 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("potSlug", slug);
      const response = await hostFetch("/api/uploads/pot-cover", {
        method: "POST",
        body: form,
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not upload that image.",
          ),
        );
      }

      const patch = await hostFetch(`/api/host/pots/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({ photoUrl: json.url }),
      });
      const patchJson = (await patch.json()) as {
        pot?: ManagePot;
        error?: string;
      };
      if (!patch.ok) {
        throw new Error(
          visitorSafeApiError(
            patch.status,
            patchJson.error,
            "Image uploaded, but we could not attach it to the pot.",
          ),
        );
      }

      const nextUrl = patchJson.pot?.photoUrl ?? json.url;
      setPhotoUrl(nextUrl);
      setPot((current) => {
        if (!current) return current;
        const next = { ...current, photoUrl: nextUrl };
        writeHostClientCache(manageCacheKey(slug), next);
        return next;
      });
      applyMe((prev) => ({
        ...prev,
        pots: prev.pots.map((p) =>
          p.slug === slug ? { ...p, photoUrl: nextUrl } : p,
        ),
      }));
      await refresh({ bypassClientCache: true });
      toast.success("Cover replaced", "The old image was removed from storage.");
    } catch (err) {
      toast.error(
        "Cover not updated",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setUploading(false);
    }
  }

  async function seedPot() {
    if (!dashboard?.user.email) {
      toast.error("Sign in again", "We need your account email for the seed gift.");
      return;
    }
    if (
      seedPence === null ||
      seedPence < MIN_POT_SEED_PENCE ||
      seedPence > MAX_DONATION_PENCE
    ) {
      toast.error(
        "Seed amount too low",
        `The first stone must be at least ${formatWholeGbp(MIN_POT_SEED_PENCE)}.`,
      );
      return;
    }

    setSeeding(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence: seedPence,
          potSlug: slug,
          giftMode: "card_once",
          donorName: dashboard.user.name ?? dashboard.user.email,
          donorEmail: dashboard.user.email,
        }),
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not start the seed gift.",
          ),
        );
      }
      window.location.href = json.url;
    } catch (err) {
      setSeeding(false);
      toast.error(
        "The seed gift did not start",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    }
  }

  async function toggleHidden(comment: ManageComment) {
    setReplyBusyId(comment.id);
    try {
      const response = await hostFetch(
        `/api/host/pots/${slug}/comments/${comment.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ hidden: !comment.commentHidden }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(response.status, json.error, "Could not update visibility."),
        );
      }
      await load();
      toast.success(
        comment.commentHidden ? "Comment visible" : "Comment hidden",
        comment.commentHidden
          ? "It shows on the public pot page again."
          : "Visitors will not see this gift message.",
      );
    } catch (err) {
      toast.error(
        "Visibility not changed",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setReplyBusyId(null);
    }
  }

  async function saveReply(commentId: string) {
    const reply = (replyDrafts[commentId] ?? "").trim();
    if (!reply) {
      toast.error("Empty reply", "Write a short reply before posting.");
      return;
    }
    if (reply.length > REPLY_MAX) {
      toast.error("Reply too long", `Keep replies under ${REPLY_MAX} characters.`);
      return;
    }

    setReplyBusyId(commentId);
    try {
      const response = await hostFetch(
        `/api/host/pots/${slug}/comments/${commentId}/reply`,
        {
          method: "PUT",
          body: JSON.stringify({ reply }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(response.status, json.error, "Could not save reply."),
        );
      }
      setEditingReplyId(null);
      await load();
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
      setReplyBusyId(null);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm.kind === "change-slug") {
        const response = await hostFetch(`/api/host/pots/${slug}`, {
          method: "PATCH",
          body: JSON.stringify({ slug: confirm.nextSlug }),
        });
        const json = (await response.json()) as {
          pot?: { slug: string };
          error?: string;
        };
        if (!response.ok || !json.pot?.slug) {
          throw new Error(
            visitorSafeApiError(
              response.status,
              json.error,
              "Could not change the pot link.",
            ),
          );
        }
        toast.success(
          "Link updated",
          "Old shared links will redirect to the new address.",
        );
        setConfirm(null);
        setDetailsDirty(false);
        await refresh();
        router.replace(`/host/pots/${json.pot.slug}`);
        return;
      }

      if (confirm.kind === "status") {
        const response = await hostFetch(`/api/host/pots/${slug}`, {
          method: "PATCH",
          body: JSON.stringify({ status: confirm.to }),
        });
        const json = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            visitorSafeApiError(
              response.status,
              json.error,
              "Could not update pot status.",
            ),
          );
        }
        toast.success("Status updated");
        setConfirm(null);
        await load();
        await refresh();
        return;
      }

      if (confirm.kind === "remove-cover") {
        const response = await hostFetch(`/api/host/pots/${slug}`, {
          method: "PATCH",
          body: JSON.stringify({ photoUrl: null }),
        });
        const json = (await response.json()) as {
          pot?: ManagePot;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            visitorSafeApiError(
              response.status,
              json.error,
              "Could not remove the cover.",
            ),
          );
        }
        setPhotoUrl(null);
        setPot((current) => {
          if (!current) return current;
          const next = { ...current, photoUrl: null };
          writeHostClientCache(manageCacheKey(slug), next);
          return next;
        });
        applyMe((prev) => ({
          ...prev,
          pots: prev.pots.map((p) =>
            p.slug === slug ? { ...p, photoUrl: null } : p,
          ),
        }));
        toast.success("Cover removed", "The public page no longer shows an image.");
        setConfirm(null);
        await refresh({ bypassClientCache: true });
        return;
      }

      if (confirm.kind === "redact-comment") {
        const response = await hostFetch(
          `/api/host/pots/${slug}/comments/${confirm.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ message: confirm.message }),
          },
        );
        const json = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            visitorSafeApiError(
              response.status,
              json.error,
              "Could not update the message.",
            ),
          );
        }
        setEditingMessageId(null);
        toast.success(
          "Message updated",
          "The public page shows your redacted text. The original is kept for your records.",
        );
        setConfirm(null);
        await load();
        return;
      }

      if (confirm.kind === "delete-comment") {
        const response = await hostFetch(
          `/api/host/pots/${slug}/comments/${confirm.id}`,
          { method: "DELETE" },
        );
        const json = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            visitorSafeApiError(response.status, json.error, "Could not delete comment."),
          );
        }
        toast.success("Comment deleted", "The gift amount remains; the words are gone.");
      } else {
        const response = await hostFetch(
          `/api/host/pots/${slug}/comments/${confirm.id}/reply`,
          { method: "DELETE" },
        );
        const json = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            visitorSafeApiError(response.status, json.error, "Could not delete reply."),
          );
        }
        toast.success("Reply deleted", "You can post a new one later if you wish.");
      }
      setConfirm(null);
      await load();
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

  if (loading && !pot) {
    const summaryTitle = dashboard?.pots.find((p) => p.slug === slug)?.title;
    return <HostPotManageSkeleton title={summaryTitle} />;
  }

  if (!pot) {
    return (
      <div>
        <p className="text-sm text-pvn-navy/65">Pot not found on this account.</p>
        <Link
          href="/host/pots"
          className="font-nav mt-4 inline-flex text-xs font-bold tracking-[0.12em] text-pvn-gold uppercase"
        >
          Back to pots
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/host/pots"
          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase transition hover:text-pvn-gold"
        >
          ← Your pots
        </Link>

        <div className="relative mt-3 overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 text-pvn-cream sm:px-6 sm:py-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            aria-hidden
            style={{
              backgroundImage: `
                linear-gradient(335deg, #c9a84c 16px, transparent 16px),
                linear-gradient(155deg, #c9a84c 16px, transparent 16px)
              `,
              backgroundSize: "44px 44px",
              backgroundPosition: "0 0, 22px 0",
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/70 to-transparent"
            aria-hidden
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm ring-1 ring-pvn-gold/45 sm:h-16 sm:w-20">
                {photoUrl || pot.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photoUrl || pot.photoUrl || "cover"}
                    src={(photoUrl || pot.photoUrl)!}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <HostPotCoverPlaceholder tone="dark" label={false} />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                  Manage pot
                </p>
                <h1 className="font-display mt-0.5 truncate text-xl font-semibold text-balance sm:text-2xl">
                  {pot.title}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <HostPotStatusChip status={pot.status} onDark />
                  <p className="text-sm text-pvn-cream/60">
                    {formatWholeGbp(pot.totalRaised)} of{" "}
                    {formatWholeGbp(pot.targetAmount)}
                    <span className="text-pvn-cream/30"> · </span>
                    {pot.donorCount}{" "}
                    {pot.donorCount === 1 ? "gift" : "gifts"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <HostShareKit slug={pot.slug} title={pot.title} onDark />
              <Link
                href={`/pots/${pot.slug}`}
                className="font-nav inline-flex min-h-8 items-center rounded-md border border-pvn-cream/30 bg-pvn-cream/[0.08] px-2.5 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
              >
                View public page
              </Link>
            </div>
          </div>
        </div>
      </div>

      {pot.status === "PENDING" ? (
        <section className="border border-amber-600/25 bg-amber-500/[0.08] px-4 py-5 sm:px-5">
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-amber-900 uppercase">
            Needs seed
          </p>
          <h2 className="font-display mt-1 text-xl font-semibold text-pvn-navy">
            Lay the first stone to go live
          </h2>
          <p className="mt-2 max-w-lg text-sm text-pvn-navy/65">
            A first gift of {formatWholeGbp(MIN_POT_SEED_PENCE)} or more opens
            this pot on browse and unlocks pause / close controls.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[MIN_POT_SEED_PENCE, 5_000, 10_000].map((value) => {
              const active = !seedCustom.trim() && seedPreset === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={seeding}
                  onClick={() => {
                    setSeedPreset(value);
                    setSeedCustom("");
                  }}
                  className={`font-nav min-h-9 rounded-md px-3 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition ${
                    active
                      ? "bg-pvn-navy text-pvn-cream"
                      : "border border-pvn-navy/15 text-pvn-navy/70 hover:border-pvn-gold"
                  }`}
                >
                  {formatWholeGbp(value)}
                </button>
              );
            })}
          </div>
          <label className="mt-3 block max-w-xs">
            <span className={labelClass}>Or custom £</span>
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder="e.g. 40"
              value={seedCustom}
              disabled={seeding}
              onChange={(e) => {
                setSeedCustom(e.target.value);
                setSeedPreset(null);
              }}
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={seeding}
              onClick={() => void seedPot()}
              className="font-nav inline-flex min-h-11 items-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
            >
              {seeding
                ? "Starting checkout…"
                : seedPence !== null
                  ? `Seed with ${formatTidyGbp(seedPence)}`
                  : "Seed pot"}
            </button>
            <Link
              href={`/pots/${pot.slug}`}
              className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase hover:text-pvn-navy"
            >
              Open public seed page
            </Link>
          </div>
        </section>
      ) : null}

      {(() => {
        const unreplied = pot.donations.filter((d) => !d.creatorReply).length;
        const manageTabs: Array<{
          id: ManageTab;
          label: string;
          badge?: number;
        }> = [
          { id: "details", label: "Details" },
          { id: "visibility", label: "Visibility" },
          {
            id: "messages",
            label: "Messages",
            badge: unreplied > 0 ? unreplied : undefined,
          },
          { id: "analytics", label: "Analytics" },
        ];
        return (
          <nav
            className="flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Manage pot sections"
          >
            {manageTabs.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={`font-nav relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition sm:px-4 ${
                    active
                      ? "border-pvn-gold text-pvn-navy"
                      : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
                  }`}
                >
                  {item.label}
                  {item.id === "details" && detailsDirty ? (
                    <span
                      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pvn-gold"
                      aria-label="Unsaved changes"
                    />
                  ) : null}
                  {item.badge ? (
                    <span
                      className={`ml-1.5 ${active ? "text-pvn-gold" : "text-pvn-navy/35"}`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        );
      })()}

      {tab === "details" ? (
      <form onSubmit={saveDetails} className="space-y-8 pt-2">
        <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          {/* Cover column */}
          <div className="space-y-3">
            <p className={labelClass}>Cover image (landscape)</p>
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm ring-1 ring-pvn-navy/10">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <HostPotCoverPlaceholder />
              )}
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-pvn-navy/45">
                  <span
                    className="h-7 w-7 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
                    aria-hidden
                  />
                </div>
              ) : null}
            </div>
            <label className="font-nav inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-md border border-pvn-navy/20 bg-white/80 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold">
              {uploading
                ? "Uploading…"
                : photoUrl
                  ? "Replace cover"
                  : "Add cover"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading || saving}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void onCoverChange(file);
                }}
              />
            </label>
            {photoUrl ? (
              <button
                type="button"
                disabled={uploading || saving}
                onClick={() => setConfirm({ kind: "remove-cover" })}
                className="font-nav w-full text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase transition hover:text-pvn-navy disabled:opacity-50"
              >
                Remove cover
              </button>
            ) : null}
            <p className="text-xs text-pvn-navy/45">
              Landscape · 16:9 recommended · JPEG, PNG or WebP · under 5 MB.
              Replacing removes the old file from storage.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-pvn-navy">
                Identity & story
              </h2>
              <p className={sectionLead}>
                Title, type, link, and the words visitors read on the public page.
              </p>
            </div>

          <label className="block">
            <span className={labelClass}>Title</span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDetailsDirty(true);
              }}
              required
              maxLength={80}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Type</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as PotType);
                setDetailsDirty(true);
              }}
              className={fieldClass}
            >
              {potTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3 rounded-sm border border-pvn-navy/10 bg-pvn-navy/[0.03] px-3.5 py-3">
            <label className="block">
              <span className={labelClass}>Public link</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-pvn-navy/50">/pots/</span>
                <input
                  value={slugDraft}
                  onChange={(e) => {
                    setSlugDraft(e.target.value);
                    setDetailsDirty(true);
                  }}
                  maxLength={64}
                  spellCheck={false}
                  className={`${fieldClass} mt-0 max-w-md font-mono text-sm`}
                  aria-describedby="slug-hint"
                />
              </div>
            </label>
            <p id="slug-hint" className="text-xs text-pvn-navy/45">
              Preview: /pots/{normalizeSlug(slugDraft) || "…"}
              {pot && normalizeSlug(slugDraft) !== pot.slug
                ? " — old links will keep working via redirect."
                : null}
            </p>
            {pot && normalizeSlug(slugDraft) !== pot.slug ? (
              <button
                type="button"
                onClick={() => {
                  const next = normalizeSlug(slugDraft);
                  if (next.length < 3) {
                    toast.error(
                      "Link too short",
                      "Use at least 3 letters or numbers.",
                    );
                    return;
                  }
                  setConfirm({ kind: "change-slug", nextSlug: next });
                }}
                className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-navy/20 bg-white/80 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
              >
                Save new link
              </button>
            ) : null}
          </div>

          <label className="block max-w-xs">
            <span className={labelClass}>Target (£)</span>
            <input
              inputMode="decimal"
              value={targetPounds}
              onChange={(e) => {
                setTargetPounds(e.target.value);
                setDetailsDirty(true);
              }}
              className={fieldClass}
            />
            <p className="mt-1.5 text-xs text-pvn-navy/45">
              Raised totals stay as they are when you change this.
            </p>
          </label>

          <label className="block">
            <span className={labelClass}>
              Description{" "}
              <span className="normal-case tracking-normal text-pvn-navy/40">
                ({wordCount(story)} words
                {story.trim()
                  ? ` · ${MIN_POT_DESCRIPTION_WORDS}+ if written`
                  : ""})
              </span>
            </span>
            <textarea
              rows={4}
              value={story}
              onChange={(e) => {
                setStory(e.target.value);
                setDetailsDirty(true);
              }}
              placeholder="What is this pot raising toward?"
              className={`${fieldClass} resize-y`}
            />
            {!story.trim() ? (
              <p className="mt-2 text-xs text-pvn-navy/50">
                Tip: add 25+ words so visitors understand why this stone in the
                wall matters.
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className={labelClass}>
              Your story{" "}
              <span className="normal-case tracking-normal text-pvn-navy/40">
                ({wordCount(founderStory)} words
                {founderStory.trim()
                  ? ` · ${MIN_FOUNDER_STORY_WORDS}+ if written`
                  : ""})
              </span>
            </span>
            <textarea
              rows={4}
              value={founderStory}
              onChange={(e) => {
                setFounderStory(e.target.value);
                setDetailsDirty(true);
              }}
              placeholder="Why this wall matters to you."
              className={`${fieldClass} resize-y`}
            />
          </label>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 border-t border-pvn-navy/10 bg-pvn-cream/95 px-1 py-4 backdrop-blur-sm">
          <button
            type="submit"
            disabled={saving || uploading || !detailsDirty}
            className="font-nav inline-flex min-h-11 items-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </div>
      </form>
      ) : null}

      {tab === "visibility" ? (
        <section className="space-y-5 pt-2">
          <div>
            <h2 className="font-display text-xl font-semibold text-pvn-navy">
              Visibility
            </h2>
            <p className={sectionLead}>
              Pause soft-stops gifts (story stays). Close marks the pot finished.
              Hide removes the public page (404). Browse only lists live pots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HostPotStatusChip status={pot.status} />
            <span className="text-sm text-pvn-navy/50">
              Current status on the public site
            </span>
          </div>

          {pot.status === "PENDING" ? (
            <p className="rounded-sm border border-amber-600/20 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-950/80">
              Seed this pot first (panel above). After it goes live you can
              pause, close, or hide it.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { to: "ACTIVE" as const, label: "Go live" },
                  { to: "PAUSED" as const, label: "Pause" },
                  { to: "CLOSED" as const, label: "Close" },
                  { to: "DISABLED" as const, label: "Hide" },
                ] as const
              )
                .filter(({ to }) => canTransitionPotStatus(pot.status, to))
                .map(({ to, label }) => (
                  <button
                    key={to}
                    type="button"
                    disabled={saving || uploading || confirmBusy}
                    onClick={() => setConfirm({ kind: "status", to })}
                    className={`font-nav inline-flex min-h-10 items-center rounded-md border px-3.5 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition disabled:opacity-50 ${
                      to === "ACTIVE"
                        ? "border-emerald-700/25 bg-emerald-600/10 text-emerald-950 hover:border-emerald-700/40"
                        : to === "PAUSED"
                          ? "border-sky-700/25 bg-sky-600/10 text-sky-950 hover:border-sky-700/40"
                          : to === "CLOSED"
                            ? "border-pvn-navy/20 bg-white/80 text-pvn-navy/70 hover:border-pvn-navy/35"
                            : "border-red-800/20 bg-red-50 text-red-900/80 hover:border-red-800/35"
                    }`}
                  >
                    {label}
                  </button>
                ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "analytics" ? (
        <div className="pt-2">
          <HostPotAnalytics slug={pot.slug} />
        </div>
      ) : null}

      {tab === "messages" ? (
      <section id="messages" className="scroll-mt-24 space-y-8 pt-2">
        <div>
          <h2 className="font-display text-xl font-semibold text-pvn-navy">
            Gift messages
          </h2>
          <p className="mt-2 text-sm text-pvn-navy/60">
            Filter, reply once, hide, redact, or delete. Same tools work on the
            public pot page when you are signed in.
          </p>

          {pot.donations.length > 0 ? (
            <div
              className="mt-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Filter gift messages"
            >
              {(
                [
                  {
                    id: "all" as const,
                    label: "All",
                    count: pot.donations.length,
                  },
                  {
                    id: "needs-reply" as const,
                    label: "Needs reply",
                    count: pot.donations.filter((d) => !d.creatorReply).length,
                  },
                  {
                    id: "hidden" as const,
                    label: "Hidden",
                    count: pot.donations.filter((d) => d.commentHidden).length,
                  },
                ] as const
              ).map((tab) => {
                const active = messageFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setMessageFilter(tab.id);
                      setMessagesPage(1);
                    }}
                    className={`font-nav inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition ${
                      active
                        ? "bg-pvn-navy text-pvn-cream"
                        : "border border-pvn-navy/15 text-pvn-navy/60 hover:border-pvn-navy/30 hover:text-pvn-navy"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={
                        active ? "text-pvn-gold" : "text-pvn-navy/35"
                      }
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {(() => {
          const filtered = pot.donations.filter((d) => {
            if (messageFilter === "needs-reply") return !d.creatorReply;
            if (messageFilter === "hidden") return d.commentHidden;
            return true;
          });

          if (pot.donations.length === 0) {
            return (
              <HostEmptyState
                title="No gift messages yet"
                body="When someone leaves words with their gift, you can thank them here — one reply each. Silent gifts are listed below."
              />
            );
          }

          if (filtered.length === 0) {
            return (
              <p className="text-sm text-pvn-navy/55">
                Nothing in this filter.
              </p>
            );
          }

          const totalPages = Math.max(
            1,
            Math.ceil(filtered.length / MESSAGES_PER_PAGE),
          );
          const page = Math.min(messagesPage, totalPages);
          const pageItems = filtered.slice(
            (page - 1) * MESSAGES_PER_PAGE,
            page * MESSAGES_PER_PAGE,
          );

          return (
            <>
            <ul className="divide-y divide-pvn-navy/10 border-t border-pvn-navy/10">
              {pageItems.map((comment) => {
                const name =
                  comment.isAnonymous || !comment.donorName?.trim()
                    ? "Anonymous"
                    : comment.donorName.trim();
                const busy = replyBusyId === comment.id;
                const editing = editingReplyId === comment.id;
                const draft = replyDrafts[comment.id] ?? "";
                const editingMessage = editingMessageId === comment.id;
                const messageDraft =
                  messageDrafts[comment.id] ?? comment.message ?? "";

                return (
                  <li key={comment.id} className="py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-pvn-navy">
                        {name}{" "}
                        <span className="font-normal text-pvn-navy/45">
                          · {formatWholeGbp(comment.amount)}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {comment.commentHidden ? (
                          <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-amber-800/80 uppercase">
                            Hidden
                          </span>
                        ) : null}
                        {comment.messageOriginal ? (
                          <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
                            Redacted
                          </span>
                        ) : null}
                        {!comment.creatorReply ? (
                          <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-gold uppercase">
                            Needs reply
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {editingMessage ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={4}
                          value={messageDraft}
                          maxLength={MESSAGE_MAX}
                          disabled={busy || confirmBusy}
                          onChange={(e) =>
                            setMessageDrafts((prev) => ({
                              ...prev,
                              [comment.id]: e.target.value,
                            }))
                          }
                          className="w-full resize-y rounded-sm border border-pvn-navy/15 bg-white/80 px-3 py-2 text-sm text-pvn-navy focus:border-pvn-gold focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={
                              busy ||
                              !messageDraft.trim() ||
                              messageDraft.trim() ===
                                (comment.message ?? "").trim()
                            }
                            onClick={() =>
                              setConfirm({
                                kind: "redact-comment",
                                id: comment.id,
                                message: messageDraft.trim(),
                              })
                            }
                            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase disabled:opacity-40"
                          >
                            Save redaction
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setEditingMessageId(null);
                              setMessageDrafts((prev) => ({
                                ...prev,
                                [comment.id]: comment.message ?? "",
                              }));
                            }}
                            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : comment.message ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-pvn-navy/75">
                        {comment.message}
                      </p>
                    ) : null}

                    {comment.messageOriginal && !editingMessage ? (
                      <details className="mt-2">
                        <summary className="font-nav cursor-pointer text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
                          View original (private)
                        </summary>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-pvn-navy/50">
                          {comment.messageOriginal}
                        </p>
                      </details>
                    ) : null}

                    {comment.creatorReply && !editing ? (
                      <div className="mt-3 border-l-2 border-pvn-gold/70 pl-3">
                        <p className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase">
                          Your reply
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-pvn-navy/70">
                          {comment.creatorReply}
                        </p>
                      </div>
                    ) : null}

                    {(editing || !comment.creatorReply) && (
                      <div className="mt-3">
                        <textarea
                          rows={3}
                          value={draft}
                          maxLength={REPLY_MAX}
                          disabled={busy}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [comment.id]: e.target.value,
                            }))
                          }
                          placeholder="Thank them. One reply per gift message."
                          className="w-full resize-y rounded-sm border border-pvn-navy/15 bg-white/80 px-3 py-2 text-sm text-pvn-navy focus:border-pvn-gold focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                      {(editing || !comment.creatorReply) && (
                        <button
                          type="button"
                          disabled={busy || !draft.trim()}
                          onClick={() => void saveReply(comment.id)}
                          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase disabled:opacity-40"
                        >
                          {comment.creatorReply ? "Save reply" : "Post reply"}
                        </button>
                      )}
                      {comment.creatorReply && !editing ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingReplyId(comment.id);
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [comment.id]: comment.creatorReply ?? "",
                            }));
                          }}
                          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase hover:text-pvn-gold"
                        >
                          Edit reply
                        </button>
                      ) : null}
                      {editing ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingReplyId(null);
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [comment.id]: comment.creatorReply ?? "",
                            }));
                          }}
                          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase"
                        >
                          Cancel
                        </button>
                      ) : null}
                      {comment.creatorReply ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ kind: "delete-reply", id: comment.id })
                          }
                          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase hover:text-red-700"
                        >
                          Delete reply
                        </button>
                      ) : null}
                      {!editingMessage ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingMessageId(comment.id);
                            setMessageDrafts((prev) => ({
                              ...prev,
                              [comment.id]: comment.message ?? "",
                            }));
                          }}
                          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase hover:text-pvn-gold"
                        >
                          Redact
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleHidden(comment)}
                        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase hover:text-pvn-gold"
                      >
                        {comment.commentHidden ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setConfirm({ kind: "delete-comment", id: comment.id })
                        }
                        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-red-800/70 uppercase hover:text-red-700"
                      >
                        Delete comment
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {totalPages > 1 ? (
              <nav
                className="mt-5 flex items-center justify-between gap-3 border-t border-pvn-navy/10 pt-4"
                aria-label="Gift messages pagination"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setMessagesPage((p) => Math.max(1, p - 1))}
                  className="font-nav inline-flex min-h-10 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  <span aria-hidden>←</span> Newer
                </button>
                <span className="font-nav shrink-0 text-center text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setMessagesPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="font-nav inline-flex min-h-10 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  Older <span aria-hidden>→</span>
                </button>
              </nav>
            ) : null}
            </>
          );
        })()}

        {/* C7 — silent gifts */}
        <div id="silent-gifts" className="scroll-mt-24 border-t border-pvn-navy/10 pt-8">
          <h3 className="font-display text-xl font-semibold text-pvn-navy">
            Silent gifts
          </h3>
          <p className="mt-1 text-sm text-pvn-navy/55">
            Succeeded gifts with no message — listed for completeness.
          </p>
          {(pot.silentGifts ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-pvn-navy/45">
              No silent gifts yet — every gift so far came with a message, or
              none have arrived.
            </p>
          ) : (
            (() => {
              const gifts = pot.silentGifts ?? [];
              const totalPages = Math.max(
                1,
                Math.ceil(gifts.length / MESSAGES_PER_PAGE),
              );
              const page = Math.min(silentGiftsPage, totalPages);
              const pageItems = gifts.slice(
                (page - 1) * MESSAGES_PER_PAGE,
                page * MESSAGES_PER_PAGE,
              );
              return (
                <>
                  <ul className="mt-4 divide-y divide-pvn-navy/10 border-t border-pvn-navy/10">
                    {pageItems.map((gift) => {
                      const name =
                        gift.isAnonymous || !gift.donorName?.trim()
                          ? "Anonymous"
                          : gift.donorName.trim();
                      const when = new Date(gift.createdAt).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" },
                      );
                      return (
                        <li
                          key={gift.id}
                          className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                        >
                          <p className="text-sm text-pvn-navy">
                            <span className="font-semibold">{name}</span>
                            <span className="text-pvn-navy/45"> · {when}</span>
                          </p>
                          <p className="font-nav text-[0.65rem] font-bold tracking-[0.1em] text-pvn-navy/55 uppercase">
                            {formatWholeGbp(gift.amount)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  {totalPages > 1 ? (
                    <nav
                      className="mt-4 flex items-center justify-between gap-3 border-t border-pvn-navy/10 pt-4"
                      aria-label="Silent gifts pagination"
                    >
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() =>
                          setSilentGiftsPage((p) => Math.max(1, p - 1))
                        }
                        className="font-nav inline-flex min-h-10 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold disabled:pointer-events-none disabled:opacity-35"
                      >
                        <span aria-hidden>←</span> Newer
                      </button>
                      <span className="font-nav shrink-0 text-center text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() =>
                          setSilentGiftsPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="font-nav inline-flex min-h-10 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold disabled:pointer-events-none disabled:opacity-35"
                      >
                        Older <span aria-hidden>→</span>
                      </button>
                    </nav>
                  ) : null}
                </>
              );
            })()
          )}
        </div>
      </section>
      ) : null}

      <ResultModal
        open={confirm !== null}
        variant="confirm"
        title={
          confirm?.kind === "change-slug"
            ? "Change this pot’s public link?"
            : confirm?.kind === "status"
            ? statusChangeCopy(confirm.to).title
            : confirm?.kind === "remove-cover"
              ? "Remove this cover?"
              : confirm?.kind === "redact-comment"
                ? "Replace this gift message?"
                : confirm?.kind === "delete-reply"
                  ? "Delete this reply?"
                  : "Delete this comment?"
        }
        body={
          confirm?.kind === "change-slug"
            ? `The address will become /pots/${confirm.nextSlug}. Anyone with the old link will be redirected. Update any printed materials when you can.`
            : confirm?.kind === "status"
            ? statusChangeCopy(confirm.to).body
            : confirm?.kind === "remove-cover"
              ? "The public pot page will show no cover image. You can upload a new one anytime."
              : confirm?.kind === "redact-comment"
                ? "Visitors will see your new wording. The giver’s original text is kept privately for your records."
                : confirm?.kind === "delete-reply"
                  ? "The gift message stays. Your reply will be removed."
                  : "This removes the giver’s words and any reply. The gift amount stays on the pot."
        }
        confirmLabel={
          confirm?.kind === "change-slug"
            ? "Change link"
            : confirm?.kind === "status"
            ? statusChangeCopy(confirm.to).confirmLabel
            : confirm?.kind === "remove-cover"
              ? "Remove cover"
              : confirm?.kind === "redact-comment"
                ? "Save redaction"
                : "Delete"
        }
        onConfirm={() => void runConfirm()}
        onClose={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        busy={confirmBusy}
      />
    </div>
  );
}

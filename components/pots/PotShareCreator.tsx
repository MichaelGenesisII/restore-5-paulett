"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HostLoginModal } from "@/components/host/HostLoginModal";
import { ShareCta } from "@/components/ShareCta";
import { potPublicUrl } from "@/lib/pot-share";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  slug: string;
  title?: string;
};

/**
 * Share + creator sign-in on the pot page (Supabase email/password).
 */
export function PotShareCreator({ slug, title }: Props) {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const destination = `/host/pots/${slug}`;
  const trimmed = title?.trim() || "this pot";

  useEffect(() => {
    let cancelled = false;

    async function openFromHash() {
      if (window.location.hash !== "#manage") return;

      const { data } = await getSupabaseBrowser().auth.getSession();
      if (cancelled) return;

      if (data.session) {
        // Already signed in — skip the login modal and go straight to manage.
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        await router.replace(destination);
        return;
      }

      setLoginOpen(true);
    }

    function onHashChange() {
      void openFromHash();
    }

    void openFromHash();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [destination, router]);

  // Prefetch the dashboard route as soon as this block is on screen.
  useEffect(() => {
    router.prefetch(destination);
  }, [destination, router]);

  async function goToCreator() {
    // Soft nav — keeps the signed-in session in memory and skips a full reload.
    await router.replace(destination);
  }

  return (
    <>
      <div
        id="manage"
        className="mt-8 scroll-mt-24 rounded-sm bg-pvn-navy px-4 py-4 text-pvn-cream sm:mt-10 sm:px-5 sm:py-5"
      >
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
              Are you the host?
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-pvn-cream/70">
              Share this pot, or sign in to update the page.
            </p>
          </div>

          <div className="flex flex-nowrap items-center gap-2.5">
            <ShareCta
              title={trimmed}
              text={`Join me on “${trimmed}” — raising for the restoration of 5 Paulett.`}
              label={`Share ${trimmed}`}
              size="lg"
              className="min-h-11 shrink-0 border-pvn-cream/25 bg-pvn-cream/5 px-4 text-[0.65rem] tracking-[0.14em] hover:border-pvn-gold hover:bg-pvn-gold/15 sm:min-h-10 sm:px-4 sm:text-[0.65rem]"
              getUrl={() => potPublicUrl(slug, "share")}
            />
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  const { data } = await getSupabaseBrowser().auth.getSession();
                  if (data.session) {
                    await goToCreator();
                    return;
                  }
                  setLoginOpen(true);
                })();
              }}
              className="font-nav inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-pvn-cream/25 bg-pvn-cream/5 px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:bg-pvn-gold/15 hover:text-pvn-gold sm:min-h-10"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
              Manage
            </button>
          </div>
        </div>
      </div>

      <HostLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        clearManageHash
        title="Is this your pot?"
        lead="Only the person who hosts this pot can sign in here. Use the email you used when you opened it."
        workingLabel="Opening your pot…"
        onSignedIn={async () => {
          // Keep the modal busy overlay up until the route is ready.
          await goToCreator();
        }}
      />
    </>
  );
}

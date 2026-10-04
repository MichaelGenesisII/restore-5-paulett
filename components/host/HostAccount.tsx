"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ResultModal } from "@/components/ResultModal";
import { useHostDashboard } from "@/components/host/HostDashboardShell";
import { useToast } from "@/components/toast/ToastProvider";
import { hostFetch } from "@/lib/host-client";
import { normalizeSlug } from "@/lib/slug";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const fieldClass =
  "mt-1.5 w-full rounded-sm border border-pvn-navy/15 bg-white/80 px-3 py-2.5 text-sm text-pvn-navy transition focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/25 focus:outline-none";

const labelClass =
  "font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase";

const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COVER_MAX = 5 * 1024 * 1024;

type Tab = "profile" | "password";

type ProfileUser = {
  email: string;
  name: string | null;
  bio: string | null;
  photoUrl: string | null;
  profileSlug: string | null;
  profilePublic: boolean;
};

function AccountPhotoPlaceholder({ tone = "light" }: { tone?: "light" | "dark" }) {
  const toneClass =
    tone === "dark"
      ? "bg-pvn-cream/10 text-pvn-gold/70"
      : "bg-gradient-to-br from-pvn-navy/[0.06] via-pvn-cream/50 to-pvn-gold/15 text-pvn-navy/40";

  return (
    <span
      className={`flex h-full w-full flex-col items-center justify-center gap-1 ${toneClass}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 sm:h-9 sm:w-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="9" r="3.5" />
        <path d="M5 19c0-3.2 3-5 7-5s7 1.8 7 5" />
      </svg>
      {tone === "light" ? (
        <span className="font-nav text-[0.5rem] font-bold tracking-[0.14em] uppercase">
          Add photo
        </span>
      ) : null}
    </span>
  );
}

function HostAccountSkeleton() {
  return (
    <div className="w-full max-w-3xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading account…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-sm bg-pvn-cream/15 sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-16 animate-pulse rounded-sm bg-pvn-cream/15" />
            <div className="mt-2 h-7 w-40 animate-pulse rounded-sm bg-pvn-cream/20" />
            <div className="mt-2 h-3.5 w-56 max-w-full animate-pulse rounded-sm bg-pvn-cream/10" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        <div className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
      </div>
      <div className="mt-8 flex gap-5">
        <div className="h-28 w-28 shrink-0 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-10 w-full animate-pulse rounded-sm bg-pvn-navy/8" />
          <div className="h-24 w-full animate-pulse rounded-sm bg-pvn-navy/8" />
          <div className="h-10 w-full animate-pulse rounded-sm bg-pvn-navy/8" />
        </div>
      </div>
    </div>
  );
}

export function HostAccount() {
  const { data, meReady, refresh, applyMe, setFormDirty } = useHostDashboard();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("profile");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState("");
  const [profilePublic, setProfilePublic] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [profilePending, setProfilePending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removePhotoConfirm, setRemovePhotoConfirm] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  // Remembers which URL failed, so a new photo is retried automatically.
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const photoFailed = failedPhotoUrl !== null && failedPhotoUrl === photoUrl;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);

  // Mirror the saved profile into the form during render (not in an effect).
  // Skipped while editing, so a background refresh can't clobber edits.
  const syncSource = data && meReady && !profileDirty ? data.user : null;
  const [syncedFrom, setSyncedFrom] = useState<typeof syncSource>(null);
  if (syncSource !== syncedFrom) {
    setSyncedFrom(syncSource);
    if (syncSource) {
      setName(syncSource.name ?? "");
      setBio(syncSource.bio ?? "");
      setPhotoUrl(syncSource.photoUrl);
      setProfileSlug(syncSource.profileSlug ?? "");
      setProfilePublic(Boolean(syncSource.profilePublic));
    }
  }

  useEffect(() => {
    setFormDirty(
      (tab === "profile" && profileDirty) ||
        (tab === "password" && passwordDirty),
    );
    return () => setFormDirty(false);
  }, [tab, profileDirty, passwordDirty, setFormDirty]);

  if (!data) return null;
  if (!meReady) return <HostAccountSkeleton />;

  function applyUser(user: ProfileUser) {
    setName(user.name ?? "");
    setBio(user.bio ?? "");
    setPhotoUrl(user.photoUrl);
    setProfileSlug(user.profileSlug ?? "");
    setProfilePublic(Boolean(user.profilePublic));
    setProfileDirty(false);
    setFailedPhotoUrl(null);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfilePending(true);
    try {
      const slugNorm = profileSlug.trim()
        ? normalizeSlug(profileSlug)
        : null;
      const response = await hostFetch("/api/host/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          profileSlug: slugNorm,
          profilePublic: Boolean(profilePublic && slugNorm),
        }),
      });
      const json = (await response.json()) as {
        user?: ProfileUser;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not update your profile.",
          ),
        );
      }
      if (json.user) applyUser(json.user);
      else setProfileDirty(false);
      toast.success("Profile saved");
      void refresh();
    } catch (err) {
      toast.error(
        "Profile not saved",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setProfilePending(false);
    }
  }

  async function onPhotoChange(file: File | null) {
    if (!file) return;
    if (!COVER_TYPES.has(file.type)) {
      toast.error("Photo", "Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > COVER_MAX) {
      toast.error("Photo", "Keep the photo under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await hostFetch("/api/host/avatar", {
        method: "POST",
        body: form,
      });
      const json = (await response.json()) as {
        url?: string | null;
        user?: ProfileUser;
        error?: string;
      };
      if (!response.ok || !json.url) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not upload the photo.",
          ),
        );
      }
      if (json.user) {
        applyUser(json.user);
        applyMe((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            ...json.user!,
          },
        }));
      } else {
        setPhotoUrl(json.url);
        setFailedPhotoUrl(null);
        applyMe((prev) => ({
          ...prev,
          user: { ...prev.user, photoUrl: json.url ?? null },
        }));
      }
      toast.success("Photo updated");
      void refresh({ bypassClientCache: true });
    } catch (err) {
      toast.error(
        "Upload failed",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setRemovingPhoto(true);
    try {
      const response = await hostFetch("/api/host/avatar", {
        method: "DELETE",
      });
      const json = (await response.json()) as {
        user?: ProfileUser;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not remove the photo.",
          ),
        );
      }
      if (json.user) {
        applyUser(json.user);
        applyMe((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            ...json.user!,
          },
        }));
      } else {
        setPhotoUrl(null);
        applyMe((prev) => ({
          ...prev,
          user: { ...prev.user, photoUrl: null },
        }));
      }
      setRemovePhotoConfirm(false);
      toast.success("Photo removed");
      void refresh({ bypassClientCache: true });
    } catch (err) {
      toast.error(
        "Could not remove",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setRemovingPhoto(false);
    }
  }

  async function copyProfileLink() {
    const slug = savedPublicReady
      ? data?.user.profileSlug
      : publicReady
        ? slugNorm
        : null;
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/hosts/${slug}`,
      );
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) {
      toast.error("Passwords do not match", "Type the same new password twice.");
      return;
    }

    setPasswordPending(true);
    try {
      const response = await hostFetch("/api/host/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not update your password. Please try again.",
          ),
        );
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setPasswordDirty(false);
      toast.success("Password updated");
    } catch (err) {
      toast.error(
        "Password not changed",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setPasswordPending(false);
    }
  }

  const firstName = name.trim().split(/\s+/)[0] || null;
  const slugNorm = normalizeSlug(profileSlug);
  const publicReady = Boolean(profilePublic && slugNorm);
  const savedPublicReady = Boolean(
    data.user.profilePublic && data.user.profileSlug,
  );
  const showPhoto = Boolean(photoUrl?.trim()) && !photoFailed;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "profile", label: "Profile" },
    { id: "password", label: "Password" },
  ];

  return (
    <div className="w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 text-pvn-cream sm:px-6 sm:py-5">
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
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm ring-1 ring-pvn-gold/50 sm:h-16 sm:w-16">
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl!}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setFailedPhotoUrl(photoUrl)}
              />
            ) : (
              <AccountPhotoPlaceholder tone="dark" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
              Account
            </p>
            <h1 className="font-display mt-0.5 truncate text-xl font-semibold sm:text-2xl">
              {firstName ? firstName : "Your profile"}
            </h1>
            <p className="mt-1 truncate text-sm text-pvn-cream/65">
              {data.user.email}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {savedPublicReady ? (
                <span className="font-nav rounded-sm bg-emerald-400/20 px-2 py-0.5 text-[0.55rem] font-bold tracking-[0.12em] text-emerald-200 uppercase ring-1 ring-emerald-300/35 ring-inset">
                  Public
                </span>
              ) : (
                <span className="font-nav rounded-sm bg-pvn-cream/10 px-2 py-0.5 text-[0.55rem] font-bold tracking-[0.12em] text-pvn-cream/60 uppercase ring-1 ring-pvn-cream/20 ring-inset">
                  Private
                </span>
              )}
              {profileDirty ? (
                <span className="font-nav text-[0.55rem] font-bold tracking-[0.12em] text-pvn-gold uppercase">
                  Unsaved changes
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <nav
        className="mt-6 flex w-full gap-0 border-b border-pvn-navy/10 sm:mt-8 sm:gap-1"
        aria-label="Account sections"
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`font-nav relative -mb-px min-h-10 flex-1 border-b-2 px-3 py-2 text-[0.65rem] font-bold tracking-[0.14em] uppercase transition sm:flex-none sm:px-4 ${
                active
                  ? "border-pvn-gold text-pvn-navy"
                  : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
              }`}
            >
              {item.label}
              {item.id === "profile" && profileDirty ? (
                <span
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pvn-gold"
                  aria-label="Unsaved changes"
                />
              ) : null}
              {item.id === "password" && passwordDirty ? (
                <span
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pvn-gold"
                  aria-label="Unsaved changes"
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {tab === "profile" ? (
        <div className="mt-6 animate-[pvn-rise_0.35s_ease-out] sm:mt-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex gap-4 sm:gap-5 lg:sticky lg:top-28 lg:flex-col lg:gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm ring-1 ring-pvn-navy/10 sm:h-28 sm:w-28 lg:aspect-square lg:h-auto lg:w-full">
              {showPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl!}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setFailedPhotoUrl(photoUrl)}
                />
              ) : (
                <AccountPhotoPlaceholder />
              )}
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-pvn-navy/50">
                  <span
                    className="h-7 w-7 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
                    aria-hidden
                  />
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 lg:w-full lg:flex-none">
              <p className={`${labelClass} lg:mt-0`}>Profile image (square)</p>
              <label className="font-nav inline-flex min-h-9 w-full cursor-pointer items-center justify-center rounded-md border border-pvn-navy/20 bg-white/80 px-3 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold">
                {uploading
                  ? "Uploading…"
                  : showPhoto
                    ? "Change photo"
                    : "Add photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    void onPhotoChange(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              {showPhoto ? (
                <button
                  type="button"
                  disabled={uploading || removingPhoto}
                  onClick={() => setRemovePhotoConfirm(true)}
                  className="font-nav inline-flex min-h-8 w-full items-center justify-center rounded-md border border-pvn-navy/10 px-3 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase transition hover:border-pvn-navy/25 hover:text-pvn-navy disabled:opacity-50"
                >
                  Remove photo
                </button>
              ) : null}
              <p className="text-xs text-pvn-navy/45">
                Square · JPEG, PNG or WebP · under 5 MB.
              </p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="mt-8 space-y-5 lg:mt-0">
            <div>
              <h2 className="font-display text-xl font-semibold text-pvn-navy">
                Public profile
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-pvn-navy/60">
                What visitors see when they open your host profile from a fundraiser.
              </p>
            </div>

            <label className="block">
              <span className={labelClass}>Display name</span>
              <input
                value={name}
                maxLength={80}
                required
                minLength={2}
                onChange={(e) => {
                  setName(e.target.value);
                  setProfileDirty(true);
                }}
                className={fieldClass}
                placeholder="Your name or family name"
                autoComplete="name"
              />
            </label>

            <label className="block">
              <span className={labelClass}>Bio</span>
              <textarea
                rows={4}
                maxLength={600}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setProfileDirty(true);
                }}
                className={`${fieldClass} min-h-[6.5rem] resize-y`}
                placeholder="A short word about why you host fundraisers for 5 Paulett."
              />
              <p className="mt-1 text-xs text-pvn-navy/40">{bio.length}/600</p>
            </label>

            <div>
              <span className={labelClass}>Profile link</span>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <span className="shrink-0 font-mono text-sm text-pvn-navy/50">
                  /hosts/
                </span>
                <input
                  value={profileSlug}
                  maxLength={64}
                  spellCheck={false}
                  onChange={(e) => {
                    setProfileSlug(e.target.value);
                    setProfileDirty(true);
                  }}
                  className={`${fieldClass} mt-0 w-full min-w-0 font-mono text-sm sm:flex-1`}
                  placeholder="your-name"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <p className="mt-1.5 break-all text-xs text-pvn-navy/45">
                Preview: /hosts/{slugNorm || "…"}
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-pvn-navy/10 bg-pvn-navy/[0.03] px-3.5 py-3.5 transition hover:border-pvn-navy/20">
              <input
                type="checkbox"
                checked={profilePublic}
                onChange={(e) => {
                  setProfilePublic(e.target.checked);
                  setProfileDirty(true);
                }}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                <span className="block text-sm font-medium text-pvn-navy">
                  Make profile public
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-pvn-navy/55">
                  Visitors can open it from “Built by” on your fundraisers and
                  share the link.
                </span>
              </span>
            </label>

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-pvn-navy/10 bg-pvn-cream/95 px-1 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:flex-row sm:flex-wrap sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1 sm:backdrop-blur-none">
              <button
                type="submit"
                disabled={profilePending || !profileDirty}
                className="font-nav inline-flex min-h-10 w-full items-center justify-center rounded-md bg-pvn-gold px-4 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50 sm:w-auto"
              >
                {profilePending ? "Saving…" : "Save profile"}
              </button>
              {publicReady || savedPublicReady ? (
                <button
                  type="button"
                  onClick={() => void copyProfileLink()}
                  className="font-nav inline-flex min-h-9 w-full items-center justify-center rounded-md border border-pvn-navy/20 bg-white/80 px-3.5 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:border-pvn-gold sm:w-auto"
                >
                  Copy profile link
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : (
        <form
          onSubmit={savePassword}
          className="mt-6 max-w-md animate-[pvn-rise_0.35s_ease-out] space-y-5 sm:mt-8"
        >
          <div>
            <h2 className="font-display text-xl font-semibold text-pvn-navy">
              Change password
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-pvn-navy/60">
              Replace a temporary password with one you will remember.
            </p>
          </div>

          <label className="block">
            <span className={labelClass}>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPasswordDirty(true);
              }}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordDirty(true);
              }}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setPasswordDirty(true);
              }}
              className={fieldClass}
            />
          </label>

          <div className="sticky bottom-0 z-10 -mx-1 border-t border-pvn-navy/10 bg-pvn-cream/95 px-1 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1 sm:backdrop-blur-none">
            <button
              type="submit"
              disabled={passwordPending || !passwordDirty}
              className="font-nav inline-flex min-h-10 w-full items-center justify-center rounded-md bg-pvn-gold px-4 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50 sm:w-auto"
            >
              {passwordPending ? "Saving…" : "Update password"}
            </button>
          </div>
        </form>
      )}

      <ResultModal
        open={removePhotoConfirm}
        variant="confirm"
        title="Remove this photo?"
        body="Your public profile will show a placeholder instead. The image will be deleted from storage."
        confirmLabel="Remove photo"
        busy={removingPhoto}
        onConfirm={() => void removePhoto()}
        onClose={() => {
          if (!removingPhoto) setRemovePhotoConfirm(false);
        }}
      />
    </div>
  );
}

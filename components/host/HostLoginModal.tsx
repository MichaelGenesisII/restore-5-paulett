"use client";

import { useEffect, useRef } from "react";
import { HostLoginForm } from "@/components/host/HostLoginForm";

type HostLoginModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful sign-in (session is ready). */
  onSignedIn?: () => void | Promise<void>;
  title?: string;
  lead?: string;
  /** Busy overlay copy while navigating after sign-in. */
  workingLabel?: string;
  /** When true, clears `#manage` from the URL on close (pot details). */
  clearManageHash?: boolean;
  initialEmail?: string;
};

/**
 * Shared host email/password dialog — pot details (and anywhere else).
 */
export function HostLoginModal({
  open,
  onClose,
  onSignedIn,
  title = "Sign in as host",
  lead = "Use the email and password from when you created your fundraiser.",
  workingLabel,
  clearManageHash = false,
  initialEmail,
}: HostLoginModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const suppressClose = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      suppressClose.current = true;
      dialog.close();
      suppressClose.current = false;
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onDialogClose = () => {
      if (suppressClose.current) return;
      onClose();
      if (clearManageHash && window.location.hash === "#manage") {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, [onClose, clearManageHash]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto max-h-[min(90vh,36rem)] w-[min(100%-2rem,24rem)] overflow-y-auto rounded-sm border-0 bg-pvn-cream p-0 text-pvn-navy shadow-[0_32px_80px_-24px_rgba(12,27,51,0.55)] open:flex open:flex-col backdrop:bg-pvn-navy/55 backdrop:backdrop-blur-[2px]"
      aria-labelledby="host-login-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="h-1 w-full bg-pvn-gold" aria-hidden />
      <div className="px-5 py-6 sm:px-6">
        <div className="mb-5">
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
            Fundraiser host
          </p>
          <h2
            id="host-login-title"
            className="font-display mt-1.5 text-2xl font-semibold text-pvn-navy"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-pvn-navy/65">{lead}</p>
        </div>

        <HostLoginForm
          key={initialEmail ?? ""}
          initialEmail={initialEmail}
          tone="cream"
          workingLabel={workingLabel}
          skipSuccessToast
          onSignedIn={async () => {
            // Navigate first while the form stays busy — no close → flash → navigate.
            await onSignedIn?.();
          }}
          footer={
            <button
              type="button"
              onClick={onClose}
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-navy/15 px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy/65 uppercase transition hover:border-pvn-navy/35"
            >
              Cancel
            </button>
          }
        />
      </div>
    </dialog>
  );
}

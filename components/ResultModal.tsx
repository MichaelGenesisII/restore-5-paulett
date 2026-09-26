"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type ResultVariant = "success" | "error" | "confirm" | "waiting";

type ResultModalProps = {
  open: boolean;
  variant: ResultVariant;
  title: string;
  body: string;
  actionLabel?: string | null;
  onClose: () => void;
  /** Supplying this turns the modal into a decision rather than a notice. */
  onConfirm?: () => void;
  confirmLabel?: string;
  /**
   * Optional secondary action. When set, the outline button runs this instead of
   * only closing the dialog (Esc / backdrop still use onClose).
   */
  onSecondary?: () => void;
  /** Locks the modal shut while the decision is being carried out. */
  busy?: boolean;
  /** Label shown on the confirm button while busy. */
  busyLabel?: string;
  /** Extra detail between the body and the buttons — a summary, usually. */
  children?: ReactNode;
};

function TickMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12.5 9.5 18 20 7" />
    </svg>
  );
}

function CrossMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ArrowMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * Built on the native dialog element, which brings the focus trap, Esc to
 * close, and an inert background with it — no library required.
 */
export function ResultModal({
  open,
  variant,
  title,
  body,
  actionLabel = "Close",
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  onSecondary,
  busy = false,
  busyLabel = "Please wait…",
  children,
}: ResultModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  /** When the parent flips `open` to false we close the dialog ourselves — don’t re-fire onClose. */
  const suppressCloseHandler = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      suppressCloseHandler.current = true;
      dialog.close();
      suppressCloseHandler.current = false;
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Fires for Esc / backdrop / explicit close — not when the parent sets open=false.
    const handleClose = () => {
      if (suppressCloseHandler.current) return;
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const accent =
    variant === "success"
      ? "bg-pvn-gold"
      : variant === "error"
        ? "bg-red-700"
        : variant === "waiting"
          ? "bg-pvn-gold/60"
          : "bg-pvn-navy";

  const badge =
    variant === "success"
      ? "bg-pvn-gold text-pvn-navy"
      : variant === "error"
        ? "bg-red-700/10 text-red-700"
        : variant === "waiting"
          ? "bg-pvn-gold/15 text-pvn-gold"
          : "bg-pvn-navy text-pvn-cream";

  return (
    <dialog
      ref={ref}
      // Clicking the backdrop lands on the dialog itself, never on its children.
      onClick={(event) => {
        if (busy || variant === "waiting") return;
        if (event.target === ref.current) ref.current?.close();
      }}
      onCancel={(event) => {
        if (busy || variant === "waiting") event.preventDefault();
      }}
      className="pvn-modal m-auto w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-sm border border-pvn-navy/10 bg-pvn-cream p-0 text-pvn-navy shadow-[0_40px_90px_-30px_rgba(12,27,51,0.65)] backdrop:bg-pvn-navy/70 backdrop:backdrop-blur-sm"
      aria-labelledby="pvn-modal-title"
    >
      <div className={`h-1 w-full ${accent}`} aria-hidden />

      <div className="px-6 py-8 text-center sm:px-8">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${badge}`}
          aria-hidden
        >
          {variant === "success" ? (
            <TickMark />
          ) : variant === "error" ? (
            <CrossMark />
          ) : variant === "waiting" ? (
            <span className="pvn-pulse-dot h-3 w-3 rotate-45 bg-pvn-gold" />
          ) : (
            <ArrowMark />
          )}
        </span>

        <div
          className="mx-auto mt-5 flex items-center justify-center gap-2"
          aria-hidden
        >
          <span className="h-px w-8 bg-pvn-gold/50" />
          <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
          <span className="h-px w-8 bg-pvn-gold/50" />
        </div>

        <h2
          id="pvn-modal-title"
          className="font-display mt-4 text-2xl font-semibold text-balance sm:text-3xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-pvn-navy/70 text-pretty">
          {body}
        </p>

        {children ? <div className="mt-5 text-left">{children}</div> : null}

        {variant === "waiting" ? (
          <p
            className="font-nav mt-7 text-[0.65rem] font-bold tracking-[0.18em] text-pvn-navy/45 uppercase"
            aria-live="polite"
          >
            Checking with the bank
          </p>
        ) : onConfirm ? (
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row-reverse">
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="font-nav inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-pvn-gold px-6 text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-pvn-gold-light disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? busyLabel : confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSecondary) {
                  onSecondary();
                  return;
                }
                ref.current?.close();
              }}
              disabled={busy}
              className="font-nav inline-flex min-h-12 items-center justify-center rounded-md border border-pvn-navy/20 px-6 text-xs font-bold tracking-[0.16em] text-pvn-navy/70 uppercase transition duration-300 ease-out hover:border-pvn-navy/40 hover:text-pvn-navy disabled:opacity-50"
            >
              {actionLabel ?? "Cancel"}
            </button>
          </div>
        ) : actionLabel ? (
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className={`font-nav mt-7 inline-flex min-h-11 items-center justify-center rounded-md px-8 text-xs font-bold tracking-[0.16em] uppercase transition duration-300 ease-out hover:-translate-y-0.5 ${
              variant === "success"
                ? "bg-pvn-gold text-pvn-navy hover:bg-pvn-gold-light"
                : "bg-pvn-navy text-pvn-cream hover:bg-pvn-navy-light"
            }`}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </dialog>
  );
}

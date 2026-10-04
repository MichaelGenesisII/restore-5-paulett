"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  kind?: ToastKind;
  /** ms — defaults by kind */
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
  kind: ToastKind;
};

type ToastContextValue = {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    show: (input: ToastInput) => void;
  };
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4200,
  info: 4500,
  error: 6500,
};

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const kind = input.kind ?? "info";
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        kind,
        duration: input.duration ?? DEFAULT_DURATION[kind],
      };

      setItems((current) => [item, ...current].slice(0, MAX_VISIBLE));

      window.setTimeout(() => dismiss(id), item.duration);
    },
    [dismiss],
  );

  /**
   * Native <dialog showModal()> uses the top layer, which sits above any
   * z-index. Promote the toast host with the Popover API so notices stay
   * visible while login/confirm modals are open.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof host.showPopover !== "function") return;

    try {
      if (items.length > 0) {
        if (!host.matches(":popover-open")) {
          host.showPopover();
        }
      } else if (host.matches(":popover-open")) {
        host.hidePopover();
      }
    } catch {
      /* older browsers — fixed positioning still works without a modal open */
    }
  }, [items.length]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        show,
        success: (title, description) =>
          show({ title, description, kind: "success" }),
        error: (title, description) =>
          show({ title, description, kind: "error" }),
        info: (title, description) =>
          show({ title, description, kind: "info" }),
      },
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={hostRef}
        popover="manual"
        className="pointer-events-none fixed inset-auto top-0 right-0 z-[200] m-0 flex w-full max-w-md flex-col items-stretch gap-2 border-0 bg-transparent p-4 sm:items-end sm:p-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx.toast;
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const accent =
    item.kind === "success"
      ? "border-l-pvn-gold"
      : item.kind === "error"
        ? "border-l-red-700"
        : "border-l-pvn-navy/40";

  const kicker =
    item.kind === "success"
      ? "Success"
      : item.kind === "error"
        ? "Something went wrong"
        : "Notice";

  const kickerColor =
    item.kind === "success"
      ? "text-pvn-gold"
      : item.kind === "error"
        ? "text-red-700"
        : "text-pvn-navy/50";

  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      className={`pointer-events-auto w-full max-w-md overflow-hidden rounded-sm border border-pvn-navy/10 border-l-4 ${accent} bg-pvn-cream shadow-[0_20px_50px_-24px_rgba(12,27,51,0.55)] [animation:pvn-toast-in_320ms_cubic-bezier(0.16,1,0.3,1)_both]`}
    >
      <div className="flex gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p
            className={`font-nav text-[0.65rem] font-bold tracking-[0.16em] uppercase ${kickerColor}`}
          >
            {kicker}
          </p>
          <p className="mt-1 text-sm font-semibold text-pvn-navy text-balance">
            {item.title}
          </p>
          {item.description ? (
            <p className="mt-1 text-sm leading-relaxed text-pvn-navy/65 text-pretty">
              {item.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="font-nav shrink-0 self-start px-1 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase transition hover:text-pvn-navy"
          aria-label="Dismiss"
        >
          Close
        </button>
      </div>
    </div>
  );
}

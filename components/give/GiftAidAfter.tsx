"use client";

import { useId, useState, type FormEvent } from "react";
import { GiftAidAddressFields } from "@/components/give/GiftAidAddressFields";
import { formatTidyGbp, giftAidBonusPence } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white/80 px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.65rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

/** Thank-you screen offer: declare Gift Aid on the gift just made. */
export function GiftAidAfter({
  sessionId,
  amountPence,
  isRecurring,
  initialName,
}: {
  sessionId: string;
  amountPence: number;
  isRecurring: boolean;
  initialName: string | null;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [address, setAddress] = useState({ line1: "", city: "", postcode: "" });
  const [declared, setDeclared] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const bonus = giftAidBonusPence(amountPence);
  const per = isRecurring ? " a month" : "";

  if (done) {
    return (
      <p className="rounded-sm border border-pvn-gold/50 bg-pvn-gold/10 px-3.5 py-3 text-center text-sm leading-relaxed text-pvn-navy">
        <span className="font-semibold">Gift Aid added.</span> The building
        receives {formatTidyGbp(amountPence + bonus)}
        {per}. Thank you.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full flex-col items-center gap-0.5 rounded-sm border border-pvn-gold/60 bg-pvn-gold/10 px-4 py-3 text-center transition hover:border-pvn-gold hover:bg-pvn-gold/20"
      >
        <span className="font-nav text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy uppercase">
          Add {formatTidyGbp(bonus)}
          {per} for free with Gift Aid
        </span>
        <span className="text-xs text-pvn-navy/65">
          UK taxpayer? Just your home address — it costs you nothing.
        </span>
      </button>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!declared) {
      setError("Please tick the taxpayer box to add Gift Aid.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/donations/gift-aid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name,
          addressLine1: address.line1,
          city: address.city,
          postcode: address.postcode,
          declaration: true,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not add Gift Aid. Please try again.",
          ),
        );
      }
      setDone(true);
    } catch (err) {
      setError(
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-sm border border-pvn-gold/50 bg-pvn-gold/[0.07] p-4 text-left"
    >
      <p className="font-nav text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy uppercase">
        Gift Aid · +{formatTidyGbp(bonus)}
        {per}
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-name`} className={labelClass}>
          Full name
        </label>
        <input
          id={`${uid}-name`}
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={120}
          placeholder="First name and surname"
          disabled={pending}
        />
      </div>
      <GiftAidAddressFields
        value={address}
        onChange={setAddress}
        fieldClass={fieldClass}
        labelClass={labelClass}
      />
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={declared}
          onChange={(e) => setDeclared(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-pvn-navy"
          disabled={pending}
        />
        <span className="text-xs leading-relaxed text-pvn-navy/70">
          I am a UK taxpayer and understand that if I pay less Income Tax or
          Capital Gains Tax in the current tax year than the Gift Aid claimed
          on all my donations, it is my responsibility to pay the difference.
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="submit"
          disabled={pending}
          className="font-nav inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add Gift Aid"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="font-nav inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-navy/15 px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy/65 uppercase transition hover:border-pvn-navy/35"
        >
          Not now
        </button>
      </div>
    </form>
  );
}

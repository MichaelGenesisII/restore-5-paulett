"use client";

import { useState } from "react";
import { ResultModal, type ResultVariant } from "@/components/ResultModal";

type Topic = { value: string; label: string; hint: string };

/** Grouped so a long list still scans quickly in the native select. */
const topicGroups: { group: string; items: Topic[] }[] = [
  {
    group: "Giving",
    items: [
      {
        value: "GIVING",
        label: "Giving & Gift Aid",
        hint: "A gift, a monthly gift, a receipt, or claiming Gift Aid.",
      },
      {
        value: "POT",
        label: "My fundraiser",
        hint: "Starting your part of the wall, or editing and sharing it.",
      },
      {
        value: "LEGACY",
        label: "Legacy & gifts in wills",
        hint: "Leaving something to the restoration in your will.",
      },
      {
        value: "GRANTS",
        label: "Grants & trusts",
        hint: "Trusts, foundations and funding bodies supporting heritage work.",
      },
    ],
  },
  {
    group: "Our people",
    items: [
      {
        value: "ALUMNI",
        label: "Alumni",
        hint: "Finding your year, your ministry or your friends again.",
      },
      {
        value: "VOLUNTEER",
        label: "Volunteering",
        hint: "Giving your time, your skills or your Saturday.",
      },
      {
        value: "PRAYER",
        label: "Prayer request",
        hint: "Something you would like the church to pray with you about.",
      },
      {
        value: "MEMBERSHIP",
        label: "Visiting or joining PVN",
        hint: "Service times, what to expect, and becoming part of the family.",
      },
    ],
  },
  {
    group: "The house & press",
    items: [
      {
        value: "HERITAGE",
        label: "Heritage & building",
        hint: "The fabric of 5 Paulett, history, or visiting the site.",
      },
      {
        value: "PRESS",
        label: "Press & media",
        hint: "Interviews, photography, and media requests.",
      },
      {
        value: "GENERAL",
        label: "Something else",
        hint: "Anything that does not fit the other topics.",
      },
    ],
  },
];

const allTopics = topicGroups.flatMap((group) => group.items);

/** The form only ever reports back — it never asks the reader to confirm. */
type Outcome = Extract<ResultVariant, "success" | "error">;

const modalCopy: Record<
  Outcome,
  { title: string; body: string; action: string }
> = {
  success: {
    title: "Your message is with us",
    body: "We are a volunteer team and we read everything. Expect a reply from a real person within three working days.",
    action: "Close",
  },
  error: {
    title: "That did not send",
    body: "Something went wrong on our side and your message was not delivered. Please try again, or email us directly.",
    action: "Try again",
  },
};

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white/70 px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/35 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

export function ContactForm() {
  const [topic, setTopic] = useState("GIVING");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Outcome | null>(null);
  const [pending, setPending] = useState(false);

  const activeHint = allTopics.find((item) => item.value === topic)?.hint ?? "";

  // Wire to /api/contact → ContactMessage for admin inbox. Honeypot stays client-side too.
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (website.trim().length > 0) return;

    if (name.trim().length < 2) {
      setError("Please tell us your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email address does not look right.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Please add a little more detail so we can help.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          website,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setResult("error");
        return;
      }
      setResult("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setResult("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="rounded-sm border border-pvn-navy/8 bg-white/60 p-6 shadow-[0_18px_40px_-28px_rgba(12,27,51,0.35)] sm:p-8"
        noValidate
      >
        <fieldset className="flex flex-col gap-5" disabled={pending}>
          <legend className="sr-only">Send us a message</legend>

          <div className="flex flex-col gap-2">
            <label htmlFor="contact-topic" className={labelClass}>
              What is this about?
            </label>
            <select
              id="contact-topic"
              className={fieldClass}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            >
              {topicGroups.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-pvn-navy/50">
              {activeHint}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="contact-name" className={labelClass}>
                Your name
              </label>
              <input
                id="contact-name"
                className={fieldClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                maxLength={120}
                placeholder="Tolu Adeyemi"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-email" className={labelClass}>
                Your email
              </label>
              <input
                id="contact-email"
                type="email"
                className={fieldClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contact-message" className={labelClass}>
              Your message
            </label>
            <textarea
              id="contact-message"
              className={`${fieldClass} min-h-40 resize-y`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={10}
              maxLength={4000}
              placeholder="Tell us what you need. There is no wrong way to start."
            />
            <p className="text-right text-xs text-pvn-navy/40">
              {message.length} / 4000
            </p>
          </div>

          {/* Honeypot — hidden from people, irresistible to bots */}
          <div className="hidden" aria-hidden>
            <label htmlFor="contact-website">Leave this field empty</label>
            <input
              id="contact-website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-sm border border-red-600/30 bg-red-600/5 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xs text-xs leading-relaxed text-pvn-navy/50">
              We use your details only to reply to you. Nothing is shared, and
              nothing is added to a mailing list.
            </p>
            <button
              type="submit"
              className="font-nav inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-pvn-gold px-6 text-xs font-bold uppercase tracking-[0.16em] text-pvn-navy transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-pvn-gold-light disabled:translate-y-0 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send message"}
            </button>
          </div>
        </fieldset>
      </form>

      <ResultModal
        open={result !== null}
        variant={result ?? "success"}
        title={modalCopy[result ?? "success"].title}
        body={modalCopy[result ?? "success"].body}
        actionLabel={modalCopy[result ?? "success"].action}
        onClose={() => setResult(null)}
      />
    </>
  );
}

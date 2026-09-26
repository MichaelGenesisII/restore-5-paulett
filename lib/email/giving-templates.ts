import { PaymentMethod } from "@prisma/client";
import { appBaseUrl } from "@/lib/email/config";
import {
  emailShell,
  escapeHtml,
  p,
  quoteBlock,
} from "@/lib/email/layout";
import { formatTidyGbp, giftAidBonusPence } from "@/lib/money";

export type GivingEmailContext = {
  donorName: string | null;
  donorEmail: string;
  amountPence: number;
  giftAid: boolean;
  isRecurring: boolean;
  paymentMethod: PaymentMethod;
  potTitle: string | null;
  potSlug: string | null;
  message: string | null;
  /** First succeeded gift on a pot — the founder’s seed. */
  isSeedGift?: boolean;
};

function greet(name: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "Friend";
  return escapeHtml(trimmed.split(/\s+/)[0] ?? trimmed);
}

function destination(ctx: GivingEmailContext) {
  if (ctx.potTitle) {
    return `the pot <strong style="color:#0c1b33;">${escapeHtml(ctx.potTitle)}</strong>`;
  }
  return "the one restoration fund for <strong style=\"color:#0c1b33;\">5 Paulett Avenue</strong>";
}

function destHref(ctx: GivingEmailContext) {
  const base = appBaseUrl();
  return ctx.potSlug ? `${base}/pots/${ctx.potSlug}` : `${base}/give`;
}

function amountBlock(ctx: GivingEmailContext, suffix = "") {
  const bonus = ctx.giftAid ? giftAidBonusPence(ctx.amountPence) : 0;
  const aidLine = ctx.giftAid
    ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(201,168,76,0.25);font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:rgba(247,243,234,0.72);">
        Gift Aid adds about <strong style="color:#e0c878;">${escapeHtml(formatTidyGbp(bonus))}</strong> — thank you for claiming it.
      </div>`
    : "";

  const recurringBadge = ctx.isRecurring
    ? `<span style="display:inline-block;margin-left:10px;padding:4px 8px;border:1px solid rgba(201,168,76,0.4);border-radius:3px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#e0c878;vertical-align:middle;">Monthly</span>`
    : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c9a84c;">
      Your gift${escapeHtml(suffix)}
    </div>
    <div style="margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:1;color:#f7f3ea;letter-spacing:-0.02em;">
      ${escapeHtml(formatTidyGbp(ctx.amountPence))}${recurringBadge}
    </div>
    <div style="margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:rgba(247,243,234,0.78);">
      Toward ${destination(ctx).replace(/style="color:#0c1b33;"/g, 'style="color:#f7f3ea;"')}
    </div>
    ${aidLine}
  `;
}

function methodLabel(method: PaymentMethod) {
  return method === PaymentMethod.BACS_DEBIT
    ? "UK bank standing order"
    : "card";
}

function metaLine(label: string, value: string) {
  return `<span style="display:inline-block;margin:0 14px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6a7380;"><strong style="color:#0c1b33;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:10px;">${label}</strong>&nbsp;&nbsp;${value}</span>`;
}

/** Receipt + thank-you after a gift clears (one-off or first monthly card payment). */
export function giftThankYouEmail(ctx: GivingEmailContext) {
  const recurring = ctx.isRecurring;
  const isCardMonthly =
    recurring && ctx.paymentMethod === PaymentMethod.CARD;
  const title = isCardMonthly
    ? "Your monthly card gift is underway"
    : recurring
      ? "Your monthly gift is in motion"
      : "Thank you — your stone is in the wall";

  const body = [
    p(`Dear ${greet(ctx.donorName)},`),
    p(
      isCardMonthly
        ? `Your first monthly card gift has cleared. Every month from here, that same amount joins ${destination(ctx)} — one fund, one house rising. We will email a short receipt each time a payment lands.`
        : recurring
          ? `Your first monthly gift has cleared. Every month from here, that same amount joins ${destination(ctx)} — one fund, one house rising.`
          : `Your gift has landed. It joins ${destination(ctx)}. One pot, one fund, one house coming back to life.`,
    ),
    ctx.message?.trim()
      ? `${p("We received your word with the gift:")}${quoteBlock(ctx.message.trim())}`
      : "",
    `<p style="margin:0 0 8px;">${metaLine("Paid by", methodLabel(ctx.paymentMethod))}${metaLine("Keep", "this email as your receipt")}</p>`,
  ]
    .filter(Boolean)
    .join("");

  return {
    subject: isCardMonthly
      ? `Monthly card gift confirmed — ${formatTidyGbp(ctx.amountPence)}`
      : recurring
        ? `Monthly gift confirmed — ${formatTidyGbp(ctx.amountPence)}`
        : `Thank you for your gift of ${formatTidyGbp(ctx.amountPence)}`,
    html: emailShell({
      tone: "success",
      preheader: isCardMonthly
        ? `Your first monthly card gift of ${formatTidyGbp(ctx.amountPence)} is in. Receipts will follow each month.`
        : recurring
          ? `Your monthly gift of ${formatTidyGbp(ctx.amountPence)} is underway.`
          : `Your gift of ${formatTidyGbp(ctx.amountPence)} is in the stonework.`,
      eyebrow: isCardMonthly
        ? "Monthly card gift confirmed"
        : recurring
          ? "Monthly gift confirmed"
          : "Gift received",
      title,
      bodyHtml: body,
      highlightHtml: amountBlock(ctx, isCardMonthly ? " · monthly" : undefined),
      cta: ctx.potSlug
        ? {
            label: "View this pot",
            href: destHref(ctx),
          }
        : {
            label: "Start a pot",
            href: `${appBaseUrl()}/fundraisers/create`,
          },
      secondaryCta: ctx.potSlug
        ? ctx.isSeedGift
          ? {
              label: "Manage this pot",
              href: `${appBaseUrl()}/host/pots/${ctx.potSlug}`,
            }
          : {
              label: "Browse pots",
              href: `${appBaseUrl()}/fundraisers`,
            }
        : {
            label: "See the wall rising",
            href: `${appBaseUrl()}/the-wall`,
          },
      footnote: isCardMonthly
        ? "This confirms the first payment of your monthly card gift to Place of Victory for All Nations Belfast. To change or stop it, reply to this email or manage the payment with your card issuer. If you did not make this gift, reply and we will help."
        : "This is a receipt for your gift to Place of Victory for All Nations Belfast. If you did not make this gift, reply to this email and we will help.",
    }),
  };
}

/** Bacs mandate set up — money not cleared yet. */
export function standingOrderSetupEmail(ctx: GivingEmailContext) {
  return {
    subject: "Your standing order is set up — awaiting the first payment",
    html: emailShell({
      tone: "pending",
      preheader:
        "Your Direct Debit mandate is in place. The first payment takes a few working days.",
      eyebrow: "Standing order · awaiting bank",
      title: "The mandate is ready",
      bodyHtml: [
        p(`Dear ${greet(ctx.donorName)},`),
        p(
          `Your UK bank standing order for ${destination(ctx)} is set up. The first Direct Debit usually takes a few working days to clear — we will write again when it lands.`,
        ),
        p(
          "Until then, nothing is counted on the wall. A redirect alone is never proof; the bank’s confirmation is.",
        ),
      ].join(""),
      highlightHtml: amountBlock(ctx, " · monthly"),
      cta: ctx.potSlug
        ? {
            label: "View this pot",
            href: destHref(ctx),
          }
        : {
            label: "Start a pot",
            href: `${appBaseUrl()}/fundraisers/create`,
          },
      secondaryCta: ctx.potSlug
        ? ctx.isSeedGift
          ? {
              label: "Manage this pot",
              href: `${appBaseUrl()}/host/pots/${ctx.potSlug}`,
            }
          : {
              label: "Browse pots",
              href: `${appBaseUrl()}/fundraisers`,
            }
        : {
            label: "See the wall rising",
            href: `${appBaseUrl()}/the-wall`,
          },
      footnote:
        "You can cancel a standing order through your bank in the usual way. Questions? Just reply.",
    }),
  };
}

/** Monthly renewal receipt (card subscription or Bacs standing order). */
export function monthlyRenewalEmail(ctx: GivingEmailContext) {
  const byCard = ctx.paymentMethod === PaymentMethod.CARD;

  return {
    subject: byCard
      ? `This month’s card gift of ${formatTidyGbp(ctx.amountPence)} is in`
      : `This month’s gift of ${formatTidyGbp(ctx.amountPence)} is in`,
    html: emailShell({
      tone: "success",
      preheader: byCard
        ? `Your monthly card gift of ${formatTidyGbp(ctx.amountPence)} has cleared for 5 Paulett.`
        : `Another stone for 5 Paulett — ${formatTidyGbp(ctx.amountPence)} this month.`,
      eyebrow: byCard ? "Monthly card renewal" : "Monthly renewal",
      title: "Another month, another stone",
      bodyHtml: [
        p(`Dear ${greet(ctx.donorName)},`),
        p(
          byCard
            ? `This month’s card gift has cleared and joined ${destination(ctx)}. Keep this note as your receipt for the payment just taken.`
            : `This month’s gift has cleared and joined ${destination(ctx)}. Faithfulness like yours is how ruins rise.`,
        ),
        byCard
          ? ""
          : p("Keep this note as your receipt for the payment just taken."),
        `<p style="margin:0 0 8px;">${metaLine("Paid by", methodLabel(ctx.paymentMethod))}</p>`,
      ]
        .filter(Boolean)
        .join(""),
      highlightHtml: amountBlock(ctx, " · this month"),
      cta: ctx.potSlug
        ? {
            label: "View this pot",
            href: destHref(ctx),
          }
        : {
            label: "See the wall rising",
            href: `${appBaseUrl()}/the-wall`,
          },
      secondaryCta: ctx.potSlug
        ? {
            label: "Browse pots",
            href: `${appBaseUrl()}/fundraisers`,
          }
        : {
            label: "Give again",
            href: `${appBaseUrl()}/give`,
          },
      footnote: byCard
        ? "This receipt is for your monthly card gift. To change or stop it, reply to this email or manage the payment with your card issuer."
        : "This receipt is for a recurring gift. To change or stop it, manage the mandate with your bank, or reply to this email.",
    }),
  };
}

/** Payment failed — first attempt, or a later monthly renewal. */
export function paymentFailedEmail(
  ctx: GivingEmailContext,
  options?: { renewal?: boolean },
) {
  const renewal = options?.renewal === true;
  const byCard = ctx.paymentMethod === PaymentMethod.CARD;

  if (renewal) {
    return {
      subject: byCard
        ? "We could not take this month’s card gift"
        : "We could not take this month’s gift",
      html: emailShell({
        tone: "alert",
        preheader: byCard
          ? "Your monthly card payment did not go through. Nothing was taken for this month."
          : "This month’s Direct Debit did not clear. Nothing was taken for this attempt.",
        eyebrow: byCard ? "Monthly card payment unsuccessful" : "Monthly payment unsuccessful",
        title: "This month’s gift did not go through",
        bodyHtml: [
          p(`Dear ${greet(ctx.donorName)},`),
          p(
            byCard
              ? `We could not take this month’s card gift of <strong>${escapeHtml(formatTidyGbp(ctx.amountPence))}</strong> toward ${destination(ctx)}. Nothing was taken for this month.`
              : `We could not take this month’s gift of <strong>${escapeHtml(formatTidyGbp(ctx.amountPence))}</strong> toward ${destination(ctx)}. Nothing was taken for this attempt.`,
          ),
          p(
            byCard
              ? "Expired cards, bank checks, and insufficient funds are the usual culprits. Update your card with your issuer if needed, or reply to this email and we will help."
              : "Bank checks and interrupted mandates are the usual culprits. When you are ready, reply to this email and we will help.",
          ),
        ].join(""),
        highlightHtml: `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#e0c878;">
          Attempted this month
        </div>
        <div style="margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1;color:#f7f3ea;">
          ${escapeHtml(formatTidyGbp(ctx.amountPence))}
        </div>
        <div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(247,243,234,0.65);">
          No funds were taken for this month.
        </div>
      `,
        cta: {
          label: "Contact us",
          href: `${appBaseUrl()}/contact`,
        },
        secondaryCta: {
          label: "View the wall",
          href: `${appBaseUrl()}/the-wall`,
        },
        footnote:
          "If money did leave your account, reply with the approximate time and we will trace it with Stripe.",
      }),
    };
  }

  return {
    subject: "We could not complete your gift",
    html: emailShell({
      tone: "alert",
      preheader:
        "Something stopped the payment. Your gift was not taken — you can try again.",
      eyebrow: "Payment unsuccessful",
      title: "This gift did not go through",
      bodyHtml: [
        p(`Dear ${greet(ctx.donorName)},`),
        p(
          `We could not complete your gift of <strong>${escapeHtml(formatTidyGbp(ctx.amountPence))}</strong> toward ${destination(ctx)}. Nothing was taken from you for this attempt.`,
        ),
        p(
          "Card declines, bank checks, and interrupted checkouts are the usual culprits. When you are ready, you can try again from the same place you started.",
        ),
      ].join(""),
      highlightHtml: `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#e0c878;">
          Attempted amount
        </div>
        <div style="margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1;color:#f7f3ea;">
          ${escapeHtml(formatTidyGbp(ctx.amountPence))}
        </div>
        <div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(247,243,234,0.65);">
          No funds were taken for this attempt.
        </div>
      `,
      cta: {
        label: "Try giving again",
        href: destHref(ctx),
      },
      secondaryCta: {
        label: "Contact us",
        href: `${appBaseUrl()}/contact`,
      },
      footnote:
        "If money did leave your account, reply with the approximate time and we will trace it with Stripe.",
    }),
  };
}

/** Refund processed. */
export function giftRefundedEmail(ctx: GivingEmailContext) {
  return {
    subject: `Your gift of ${formatTidyGbp(ctx.amountPence)} has been refunded`,
    html: emailShell({
      tone: "neutral",
      preheader: "The gift has been returned. The wall total has been adjusted.",
      eyebrow: "Refund processed",
      title: "Your gift has been returned",
      bodyHtml: [
        p(`Dear ${greet(ctx.donorName)},`),
        p(
          `Your gift of <strong>${escapeHtml(formatTidyGbp(ctx.amountPence))}</strong> toward ${destination(ctx)} has been refunded. The house total has been adjusted so the wall stays honest.`,
        ),
        p(
          "Depending on your bank, the return can take a few working days to appear.",
        ),
      ].join(""),
      highlightHtml: amountBlock(ctx, " · refunded"),
      cta: ctx.potSlug
        ? {
            label: "View this pot",
            href: destHref(ctx),
          }
        : {
            label: "See the wall rising",
            href: `${appBaseUrl()}/the-wall`,
          },
      secondaryCta: {
        label: "Give again",
        href: destHref(ctx),
      },
      footnote:
        "If you did not expect this refund, reply and we will explain what happened.",
    }),
  };
}

/** Checkout session could not be created (server/Stripe error). */
export function checkoutCouldNotStartEmail(ctx: {
  donorName: string | null;
  donorEmail: string;
  amountPence: number;
  potTitle: string | null;
  potSlug: string | null;
}) {
  const slim: GivingEmailContext = {
    ...ctx,
    giftAid: false,
    isRecurring: false,
    paymentMethod: PaymentMethod.CARD,
    message: null,
  };

  return {
    subject: "We could not open checkout for your gift",
    html: emailShell({
      tone: "alert",
      preheader:
        "Checkout did not open on our side. No payment was taken — please try again.",
      eyebrow: "Checkout interrupted",
      title: "We never reached Stripe",
      bodyHtml: [
        p(`Dear ${greet(ctx.donorName)},`),
        p(
          `Something went wrong before payment began for your gift toward ${destination(slim)}. No money was taken.`,
        ),
        p(
          "Please try again in a moment. If it keeps failing, write to us and we will walk it through with you.",
        ),
      ].join(""),
      highlightHtml: `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c9a84c;">
          Intended gift
        </div>
        <div style="margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1;color:#f7f3ea;">
          ${escapeHtml(formatTidyGbp(ctx.amountPence))}
        </div>
      `,
      cta: {
        label: "Try again",
        href: destHref(slim),
      },
      secondaryCta: {
        label: "Contact us",
        href: `${appBaseUrl()}/contact`,
      },
    }),
  };
}

/** Soft nudge after abandoning Stripe checkout (cancel return). */
export function checkoutCancelledEmail(ctx: GivingEmailContext) {
  return {
    subject: "Your gift is unfinished — the wall still has a place for you",
    html: emailShell({
      tone: "soft",
      preheader:
        "You left checkout before the gift completed. Nothing was taken. Ready when you are.",
      eyebrow: "Checkout left open",
      title: "Whenever you are ready",
      bodyHtml: [
        p(`Dear ${greet(ctx.donorName)},`),
        p(
          `You started a gift of <strong>${escapeHtml(formatTidyGbp(ctx.amountPence))}</strong> toward ${destination(ctx)}, then left before it finished. That is alright — nothing was taken.`,
        ),
        p(
          "The stone is still waiting. When you return, you can pick up from the give form and finish in a minute or two.",
        ),
      ].join(""),
      highlightHtml: amountBlock(ctx, " · not taken"),
      cta: {
        label: "Finish your gift",
        href: destHref(ctx),
      },
      secondaryCta: ctx.potSlug
        ? {
            label: "Browse pots",
            href: `${appBaseUrl()}/fundraisers`,
          }
        : {
            label: "See the wall rising",
            href: `${appBaseUrl()}/the-wall`,
          },
      footnote:
        "If you closed the tab by mistake, this note is simply a gentle reminder — not a demand.",
    }),
  };
}

/** Pot host — a visitor’s gift cleared on their pot. */
export function hostPotGiftReceivedEmail(input: {
  hostName: string | null;
  amountPence: number;
  potTitle: string;
  potSlug: string;
  donorLabel: string;
  message: string | null;
}) {
  const first = greet(input.hostName);
  return {
    subject: `A gift landed on “${input.potTitle}”`,
    html: emailShell({
      tone: "success",
      preheader: `${formatTidyGbp(input.amountPence)} joined ${input.potTitle}.`,
      eyebrow: "Your pot · new gift",
      title: "Someone gave to your pot",
      bodyHtml: [
        p(`Dear ${first},`),
        p(
          `<strong>${escapeHtml(input.donorLabel)}</strong> gave <strong>${escapeHtml(formatTidyGbp(input.amountPence))}</strong> toward <strong>${escapeHtml(input.potTitle)}</strong>.`,
        ),
        input.message?.trim()
          ? `${p("They left a word:")}${quoteBlock(input.message.trim())}`
          : p("No message came with this gift — it is still a stone in the wall."),
      ]
        .filter(Boolean)
        .join(""),
      cta: {
        label: "Manage this pot",
        href: `${appBaseUrl()}/host/pots/${input.potSlug}`,
      },
      secondaryCta: {
        label: "Open inbox",
        href: `${appBaseUrl()}/host/inbox`,
      },
      footnote:
        "You are receiving this because you host this pot. The giver also received their own receipt.",
    }),
  };
}

/** Church inbox — a direct gift to the restoration (/give) cleared. */
export function orgDirectGiftReceivedEmail(input: {
  amountPence: number;
  donorLabel: string;
  message: string | null;
}) {
  return {
    subject: `Direct gift of ${formatTidyGbp(input.amountPence)} received`,
    html: emailShell({
      tone: "success",
      preheader: `${formatTidyGbp(input.amountPence)} joined the restoration fund.`,
      eyebrow: "Give now · new gift",
      title: "A gift to the house",
      bodyHtml: [
        p(`Dear friends,`),
        p(
          `<strong>${escapeHtml(input.donorLabel)}</strong> gave <strong>${escapeHtml(formatTidyGbp(input.amountPence))}</strong> straight to the restoration of 5 Paulett.`,
        ),
        input.message?.trim()
          ? `${p("They left a word for The Wall:")}${quoteBlock(input.message.trim())}`
          : p("No message came with this gift."),
      ]
        .filter(Boolean)
        .join(""),
      cta: {
        label: "See the wall rising",
        href: `${appBaseUrl()}/the-wall`,
      },
      secondaryCta: {
        label: "Open Give page",
        href: `${appBaseUrl()}/give`,
      },
      footnote:
        "This notice goes to addresses in ADMIN_EMAILS. The giver also received their own receipt.",
    }),
  };
}

/** All templates for the local HTML preview page. */
export function allGivingEmailPreviews(sample: GivingEmailContext) {
  return [
    {
      id: "thank-you",
      label: "Thank you / receipt",
      ...giftThankYouEmail(sample),
    },
    {
      id: "thank-you-monthly-card",
      label: "Thank you (monthly card start)",
      ...giftThankYouEmail({
        ...sample,
        isRecurring: true,
        paymentMethod: PaymentMethod.CARD,
      }),
    },
    {
      id: "standing-order",
      label: "Standing order setup",
      ...standingOrderSetupEmail({
        ...sample,
        isRecurring: true,
        paymentMethod: PaymentMethod.BACS_DEBIT,
      }),
    },
    {
      id: "monthly-renewal-card",
      label: "Monthly renewal (card)",
      ...monthlyRenewalEmail({
        ...sample,
        isRecurring: true,
        paymentMethod: PaymentMethod.CARD,
        message: null,
      }),
    },
    {
      id: "monthly-renewal",
      label: "Monthly renewal (Bacs)",
      ...monthlyRenewalEmail({
        ...sample,
        isRecurring: true,
        paymentMethod: PaymentMethod.BACS_DEBIT,
        message: null,
      }),
    },
    {
      id: "payment-failed",
      label: "Payment failed (first)",
      ...paymentFailedEmail(sample),
    },
    {
      id: "payment-failed-renewal",
      label: "Payment failed (monthly renewal)",
      ...paymentFailedEmail(
        { ...sample, isRecurring: true, paymentMethod: PaymentMethod.CARD },
        { renewal: true },
      ),
    },
    {
      id: "refunded",
      label: "Refund",
      ...giftRefundedEmail(sample),
    },
    {
      id: "checkout-failed",
      label: "Checkout could not start",
      ...checkoutCouldNotStartEmail(sample),
    },
    {
      id: "checkout-cancelled",
      label: "Checkout cancelled",
      ...checkoutCancelledEmail(sample),
    },
  ] as const;
}

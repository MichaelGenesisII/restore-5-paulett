import { NextResponse } from "next/server";
import {
  DonationStatus,
  type Prisma,
} from "@prisma/client";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { toCsv } from "@/lib/csv";
import { giftAidBonusPence } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const KINDS = ["gift-aid", "succeeded", "attempts"] as const;
type ExportKind = (typeof KINDS)[number];

function parseKind(value: string | null): ExportKind | null {
  if (value && (KINDS as readonly string[]).includes(value)) {
    return value as ExportKind;
  }
  return null;
}

function parseDateBound(value: string | null, endOfDay: boolean): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}

function amountPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** CSV download for Gift Aid claims or ops audit. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));
  if (!kind) {
    return NextResponse.json(
      {
        error:
          "kind required: gift-aid | succeeded | attempts",
      },
      { status: 400 },
    );
  }

  const from = parseDateBound(url.searchParams.get("from"), false);
  const to = parseDateBound(url.searchParams.get("to"), true);

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = to;

  const where: Prisma.DonationWhereInput = {
    ...(from || to ? { createdAt } : {}),
  };

  if (kind === "gift-aid") {
    where.status = DonationStatus.SUCCEEDED;
    where.giftAid = true;
  } else if (kind === "succeeded") {
    where.status = DonationStatus.SUCCEEDED;
  }
  // attempts = all statuses

  const gifts = await prisma.donation.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      amount: true,
      status: true,
      donorName: true,
      donorEmail: true,
      isAnonymous: true,
      giftAid: true,
      donorAddressLine1: true,
      donorCity: true,
      donorPostcode: true,
      isRecurring: true,
      paymentMethod: true,
      message: true,
      createdAt: true,
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
      pot: { select: { slug: true, title: true } },
    },
  });

  const headers =
    kind === "gift-aid"
      ? [
          "donation_id",
          "date",
          "amount_gbp",
          "gift_aid_reclaim_gbp",
          "donor_name",
          "donor_email",
          "address_line1",
          "city",
          "postcode",
          "destination",
          "fundraiser_slug",
          "fundraiser_title",
          "payment_method",
          "recurring",
        ]
      : [
          "donation_id",
          "date",
          "status",
          "amount_gbp",
          "gift_aid",
          "donor_name",
          "donor_email",
          "anonymous",
          "address_line1",
          "city",
          "postcode",
          "destination",
          "fundraiser_slug",
          "fundraiser_title",
          "payment_method",
          "recurring",
          "message",
          "stripe_payment_intent",
          "stripe_checkout_session",
        ];

  const rows =
    kind === "gift-aid"
      ? gifts.map((g) => [
          g.id,
          isoDate(g.createdAt),
          amountPounds(g.amount),
          amountPounds(giftAidBonusPence(g.amount)),
          g.donorName,
          g.donorEmail,
          g.donorAddressLine1,
          g.donorCity,
          g.donorPostcode,
          g.pot ? "fundraiser" : "direct",
          g.pot?.slug ?? "",
          g.pot?.title ?? "",
          g.paymentMethod,
          g.isRecurring ? "yes" : "no",
        ])
      : gifts.map((g) => [
          g.id,
          isoDate(g.createdAt),
          g.status,
          amountPounds(g.amount),
          g.giftAid ? "yes" : "no",
          g.donorName,
          g.donorEmail,
          g.isAnonymous ? "yes" : "no",
          g.donorAddressLine1,
          g.donorCity,
          g.donorPostcode,
          g.pot ? "fundraiser" : "direct",
          g.pot?.slug ?? "",
          g.pot?.title ?? "",
          g.paymentMethod,
          g.isRecurring ? "yes" : "no",
          g.message,
          g.stripePaymentIntentId,
          g.stripeCheckoutSessionId,
        ]);

  const csv = toCsv(headers, rows);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `5-paulett-${kind}-${stamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Row-Count": String(gifts.length),
    },
  });
}

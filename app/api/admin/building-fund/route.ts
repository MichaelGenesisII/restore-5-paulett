import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import {
  getAdminBuildingFundCached,
  revalidateAdminBuildingFund,
} from "@/lib/admin-building-fund";
import { revalidateAdminAnalytics } from "@/lib/admin-analytics";
import { revalidateAdminOverview } from "@/lib/admin-overview";
import { getOrCreateBuildingFund } from "@/lib/building-fund";
import { BUILDING_FUND_ID } from "@/lib/constants";
import {
  assertBuildingFundTargetPence,
  poundsToPence,
} from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const payload = await getAdminBuildingFundCached();
  return NextResponse.json(payload);
}

/** Update campaign target only — never totalRaised (webhook-owned). */
export async function PATCH(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  let body: { targetAmountPence?: unknown; targetPounds?: unknown };
  try {
    body = (await request.json()) as {
      targetAmountPence?: unknown;
      targetPounds?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let target: number;
  try {
    if ("targetAmountPence" in body) {
      target = assertBuildingFundTargetPence(body.targetAmountPence);
    } else if (typeof body.targetPounds === "string") {
      const pence = poundsToPence(body.targetPounds);
      target = assertBuildingFundTargetPence(pence);
    } else {
      return NextResponse.json(
        { error: "targetAmountPence or targetPounds required" },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid target amount.",
      },
      { status: 400 },
    );
  }

  await getOrCreateBuildingFund();
  const fund = await prisma.buildingFund.update({
    where: { id: BUILDING_FUND_ID },
    data: { targetAmount: target },
  });

  revalidateAdminBuildingFund();
  revalidateAdminOverview();
  revalidateAdminAnalytics();
  return NextResponse.json({
    targetAmount: fund.targetAmount,
    totalRaised: fund.totalRaised,
    remainingPence: Math.max(0, fund.targetAmount - fund.totalRaised),
    updatedAt: fund.updatedAt.toISOString(),
  });
}

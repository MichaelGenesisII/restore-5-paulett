import { NextResponse } from "next/server";
import { getOrCreateBuildingFund } from "@/lib/building-fund";

export const runtime = "nodejs";

/** Public building fund totals — target comes from the DB (admin-owned). */
export async function GET() {
  const fund = await getOrCreateBuildingFund();
  return NextResponse.json({
    targetAmount: fund.targetAmount,
    totalRaised: fund.totalRaised,
    updatedAt: fund.updatedAt,
  });
}

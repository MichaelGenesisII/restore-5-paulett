import { NextResponse } from "next/server";
import { requireOwnedPot } from "@/lib/auth/require-host";
import { getHostPotAnalyticsCached } from "@/lib/host-pot-analytics";

export const runtime = "nodejs";

/** Per-pot gift + traffic analytics for the signed-in owner (cached 60s). */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const owned = await requireOwnedPot(request, slug);
  if (owned instanceof NextResponse) return owned;

  try {
    const payload = await getHostPotAnalyticsCached(owned.pot.id);
    if (!payload) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Host pot analytics failed", error);
    return NextResponse.json(
      { error: "Could not load analytics." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics-db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = searchParams.get("from") || thirtyDaysAgo.toISOString();
  const to = searchParams.get("to") || now.toISOString();
  const groupBy = (searchParams.get("groupBy") as "day" | "week") || "day";

  const analytics = await getAnalytics(params.id, from, to, groupBy);

  return NextResponse.json({
    clientId: params.id,
    period: { from, to },
    groupBy,
    metrics: analytics,
  });
}

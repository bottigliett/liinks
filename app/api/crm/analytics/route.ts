import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { getAnalytics } from "@/lib/analytics-db";
import { getClientById } from "@/lib/data";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const valid = await validateApiKey(apiKey);
  if (!valid) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId parameter is required" }, { status: 400 });
  }

  const client = await getClientById(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = searchParams.get("from") || thirtyDaysAgo.toISOString();
  const to = searchParams.get("to") || now.toISOString();
  const groupBy = (searchParams.get("groupBy") as "day" | "week" | "month") || "day";

  const analytics = await getAnalytics(clientId, from, to, groupBy === "month" ? "week" : groupBy);

  return NextResponse.json({
    clientId,
    period: { from, to },
    metrics: {
      pageViews: analytics.pageViews,
      uniqueVisitors: analytics.uniqueVisitors,
      widgetClicks: analytics.widgetClicks,
      topWidgets: analytics.topWidgets,
      deviceBreakdown: analytics.deviceBreakdown,
      referrers: analytics.referrers,
    },
  });
}

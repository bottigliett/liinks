import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { getClients } from "@/lib/data";

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
  const since = searchParams.get("since");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let clients = await getClients();

  if (since) {
    clients = clients.filter((c) => c.updatedAt >= since || c.createdAt >= since);
  }

  const total = clients.length;
  const paged = clients.slice(offset, offset + limit);

  return NextResponse.json({
    clients: paged.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      bio: c.bio,
      email: c.email,
      phone: c.phone,
      widgetCount: c.widgets.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    hasMore: offset + limit < total,
  });
}

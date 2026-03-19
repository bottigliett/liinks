import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics-db";
import { getClientById } from "@/lib/data";

const VALID_EVENT_TYPES = ["PAGE_VIEW", "WIDGET_CLICK", "VCARD_DOWNLOAD"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, type, widgetId, sessionId, referrer, userAgent } = body;

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    if (!type || !VALID_EVENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    // Verify client exists
    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await trackEvent({
      clientId,
      type,
      widgetId: widgetId || undefined,
      sessionId: sessionId || undefined,
      referrer: referrer || undefined,
      userAgent: userAgent || req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

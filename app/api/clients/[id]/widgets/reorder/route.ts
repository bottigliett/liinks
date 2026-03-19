import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reorderWidgets } from "@/lib/data";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { widgetIds } = await req.json();
  if (!Array.isArray(widgetIds)) {
    return NextResponse.json({ error: "widgetIds array required" }, { status: 400 });
  }

  const ok = await reorderWidgets(params.id, widgetIds);
  if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

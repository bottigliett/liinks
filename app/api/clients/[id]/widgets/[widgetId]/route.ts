import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateWidget, deleteWidget } from "@/lib/data";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; widgetId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const widget = await updateWidget(params.id, params.widgetId, body);
  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(widget);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; widgetId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await deleteWidget(params.id, params.widgetId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

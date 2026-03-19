import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addWidget } from "@/lib/data";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const widget = await addWidget(params.id, body);
  if (!widget) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json(widget, { status: 201 });
}

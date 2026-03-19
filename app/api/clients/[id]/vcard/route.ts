import { NextRequest, NextResponse } from "next/server";
import { getClientById } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const client = await getClientById(params.id);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${client.name}`,
    `N:${client.name};;;`,
  ];

  if (client.phone) {
    lines.push(`TEL;TYPE=CELL:${client.phone}`);
  }
  if (client.email) {
    lines.push(`EMAIL:${client.email}`);
  }

  // Add public page URL
  const baseUrl = process.env.NEXTAUTH_URL || "https://localhost:3000";
  lines.push(`URL:${baseUrl}/${client.slug}`);

  if (client.avatarUrl && client.avatarUrl.startsWith("http")) {
    lines.push(`PHOTO;VALUE=URI:${client.avatarUrl}`);
  }

  lines.push("END:VCARD");

  const vcf = lines.join("\r\n");
  const filename = client.name.replace(/[^a-zA-Z0-9]/g, "_") + ".vcf";

  return new NextResponse(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

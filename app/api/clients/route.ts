import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClients, getClientById, createClient } from "@/lib/data";
import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["b", "strong", "u", "br", "ul", "li", "p"],
  allowedAttributes: {},
};

function parseMapsUrl(url: string): { lat: number; lng: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  const placeMatch = url.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getClients());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, slug, bio, avatarUrl, accentColor, phone, email, templateWidgets, cloneFromId } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  // If cloning from existing client, copy their widgets (with new IDs)
  let widgetsToUse = templateWidgets;
  if (cloneFromId) {
    const source = await getClientById(cloneFromId);
    if (source) {
      widgetsToUse = source.widgets.map((w) => ({
        type: w.type,
        title: w.title,
        url: w.url,
        size: w.size,
        icon: w.icon,
        brandImage: w.brandImage,
        bgColor: w.bgColor,
        textColor: w.textColor,
        platform: w.platform,
        username: w.username,
        lat: w.lat,
        lng: w.lng,
        mapLabel: w.mapLabel,
        description: w.description,
        content: w.content,
        rowSpan: w.rowSpan,
      }));
    }
  }

  // Parse map URLs to extract coordinates
  if (widgetsToUse) {
    for (const w of widgetsToUse) {
      if (w.type === "map" && w.url && (!w.lat || !w.lng)) {
        const coords = parseMapsUrl(w.url);
        if (coords) {
          w.lat = coords.lat;
          w.lng = coords.lng;
        }
      }
    }
  }

  const client = await createClient({
    name,
    slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    bio: bio ? sanitizeHtml(bio, SANITIZE_OPTIONS) : "",
    avatarUrl: avatarUrl || "",
    accentColor: accentColor || "#3b82f6",
    phone: phone || "",
    email: email || "",
    ...(widgetsToUse ? { templateWidgets: widgetsToUse } : {}),
  });

  return NextResponse.json(client, { status: 201 });
}

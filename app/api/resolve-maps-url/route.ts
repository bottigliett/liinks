import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    // Resolve shortened URLs by following redirects
    const finalUrl = resolveUrl(url);

    // Try to extract coordinates
    const coords = parseCoords(finalUrl);
    const reviewUrl = extractReviewUrl(finalUrl);

    if (coords) {
      return NextResponse.json({ ...coords, resolvedUrl: finalUrl, ...(reviewUrl && { reviewUrl }) });
    }

    // If URL-only parsing failed, fetch HTML body and try to extract from there
    const body = fetchBody(finalUrl);
    if (body) {
      const bodyCoords = parseCoordsFromHtml(body);
      const bodyReviewUrl = reviewUrl || extractReviewUrlFromHtml(body);
      if (bodyCoords) {
        return NextResponse.json({ ...bodyCoords, resolvedUrl: finalUrl, ...(bodyReviewUrl && { reviewUrl: bodyReviewUrl }) });
      }
      // Even if no coords, try to get reviewUrl from body
      if (bodyReviewUrl && !reviewUrl) {
        return NextResponse.json({ error: "Could not extract coordinates", resolvedUrl: finalUrl, reviewUrl: bodyReviewUrl }, { status: 422 });
      }
    }

    return NextResponse.json({ error: "Could not extract coordinates", resolvedUrl: finalUrl }, { status: 422 });
  } catch {
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 });
  }
}

/** Use curl to follow redirects — more reliable than fetch() for Google short URLs */
function resolveUrl(url: string): string {
  try {
    // curl -Ls -o /dev/null -w '%{url_effective}' follows all redirects and prints final URL
    const result = execSync(
      `curl -Ls -o /dev/null -w '%{url_effective}' --max-time 10 ${JSON.stringify(url)}`,
      { encoding: "utf-8", timeout: 15000 },
    ).trim();
    return result || url;
  } catch {
    return url;
  }
}

function fetchBody(url: string): string | null {
  try {
    return execSync(
      `curl -Ls --max-time 10 ${JSON.stringify(url)}`,
      { encoding: "utf-8", timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
    );
  } catch {
    return null;
  }
}

function parseCoords(url: string): { lat: number; lng: number } | null {
  // @lat,lng pattern
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  // q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  // place/.../@lat,lng
  const placeMatch = url.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  // ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  return null;
}

function parseCoordsFromHtml(html: string): { lat: number; lng: number } | null {
  const match = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  const centerMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
  if (centerMatch) return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };
  return null;
}

// --- Google Review URL generation from CID ---

function extractCidFromUrl(url: string): string | null {
  const cidMatch = url.match(/0x[0-9a-fA-F]+:0x([0-9a-fA-F]+)/);
  if (cidMatch) return cidMatch[1];
  return null;
}

function extractCidFromHtml(html: string): string | null {
  const match = html.match(/0x[0-9a-fA-F]+:0x([0-9a-fA-F]+)/);
  if (match) return match[1];
  return null;
}

function cidToReviewUrl(cidHex: string): string | null {
  try {
    const cid = BigInt("0x" + cidHex);
    const buf = new Uint8Array(11);
    buf[0] = 0x09;
    let val = cid;
    for (let i = 1; i <= 8; i++) {
      buf[i] = Number(val & 0xffn);
      val >>= 8n;
    }
    buf[9] = 0x10;
    buf[10] = 0x13;
    const base64 = Buffer.from(buf).toString("base64url");
    return `https://g.page/r/${base64}/review`;
  } catch {
    return null;
  }
}

function extractReviewUrl(url: string): string | null {
  const cid = extractCidFromUrl(url);
  if (!cid) return null;
  return cidToReviewUrl(cid);
}

function extractReviewUrlFromHtml(html: string): string | null {
  const cid = extractCidFromHtml(html);
  if (!cid) return null;
  return cidToReviewUrl(cid);
}

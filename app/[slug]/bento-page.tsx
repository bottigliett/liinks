"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";
import { Client, Widget, SocialPlatform, ClientStyle } from "@/lib/types";
import { IconRenderer } from "@/components/icon-renderer";
import { cn } from "@/lib/utils";
import {
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandYoutube,
  IconBrandX,
  IconBrandFacebook,
  IconBrandLinkedin,
  IconBrandGithub,
  IconBrandSpotify,
  IconWorld,
  IconArrowUpRight,
} from "@tabler/icons-react";

const SOCIAL_ICONS: Record<SocialPlatform, typeof IconBrandInstagram> = {
  instagram: IconBrandInstagram,
  tiktok: IconBrandTiktok,
  youtube: IconBrandYoutube,
  x: IconBrandX,
  facebook: IconBrandFacebook,
  linkedin: IconBrandLinkedin,
  github: IconBrandGithub,
  spotify: IconBrandSpotify,
  website: IconWorld,
};

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X (Twitter)",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  github: "GitHub",
  spotify: "Spotify",
  website: "Website",
};

function getBorderRadius(br: ClientStyle["borderRadius"]): number {
  const map: Record<string, number> = { none: 0, sm: 4, md: 8, lg: 12, xl: 16, "2xl": 20, full: 9999 };
  return map[br] ?? 20;
}

function getGap(gap: ClientStyle["gridGap"]): string {
  return { tight: "gap-2", normal: "gap-3 sm:gap-4", loose: "gap-4 sm:gap-6" }[gap] || "gap-3 sm:gap-4";
}

function getColSpan(size: Widget["size"]): number {
  return size === "wide" || size === "large" ? 2 : 1;
}

function getDefaultRowSpan(size: Widget["size"]): number {
  return size === "medium" || size === "large" ? 2 : 1;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("liinks_session");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("liinks_session", id);
  }
  return id;
}

function sendTrackEvent(data: {
  clientId: string;
  type: string;
  widgetId?: string;
}) {
  const sessionId = getSessionId();
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      sessionId,
      referrer: document.referrer || undefined,
      userAgent: navigator.userAgent,
    }),
    keepalive: true,
  }).catch(() => {});
}

export function BentoPage({
  client,
  widgets,
}: {
  client: Client;
  widgets: Widget[];
}) {
  const s = client.style;
  const radius = getBorderRadius(s.borderRadius);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      sendTrackEvent({ clientId: client.id, type: "PAGE_VIEW" });
    }
  }, [client.id]);

  const handleWidgetClick = useCallback(
    (widgetId: string) => {
      sendTrackEvent({ clientId: client.id, type: "WIDGET_CLICK", widgetId });
    },
    [client.id],
  );

  const handleVcardClick = useCallback(
    (widgetId: string) => {
      sendTrackEvent({ clientId: client.id, type: "VCARD_DOWNLOAD", widgetId });
    },
    [client.id],
  );

  return (
    <div
      className="min-h-screen px-4 py-12 sm:px-6"
      style={{
        backgroundColor: s.bgColor,
        fontFamily: "'Stack Sans Text', sans-serif",
      }}
    >
      <div
        className={cn(
          "mx-auto max-w-[430px]",
          s.alignment === "center" ? "text-center" : "text-left",
        )}
      >
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {s.showAvatar && (
            <div className={cn("mb-4", s.alignment === "center" && "flex justify-center")}>
              {client.avatarUrl ? (
                <Image
                  src={client.avatarUrl}
                  alt={client.name}
                  width={96}
                  height={96}
                  className={cn(
                    "h-24 w-24 object-cover",
                    s.avatarStyle === "circle" && "rounded-full",
                    s.avatarStyle === "rounded" && "rounded-2xl",
                    s.avatarStyle === "square" && "rounded-none",
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "flex h-24 w-24 items-center justify-center text-2xl font-bold text-white",
                    s.avatarStyle === "circle" && "rounded-full",
                    s.avatarStyle === "rounded" && "rounded-2xl",
                    s.avatarStyle === "square" && "rounded-none",
                  )}
                  style={{ backgroundColor: client.accentColor }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <h1 className="font-bold" style={{ color: s.textColor, fontSize: 21 }}>
            {client.name}
          </h1>
          {client.bio && (
            <div
              className="bio-content mt-2 text-sm"
              style={{ color: s.subtextColor }}
              dangerouslySetInnerHTML={{ __html: client.bio }}
            />
          )}
        </motion.div>

        {widgets.length > 0 ? (
          <div
            className={cn("grid grid-cols-2", getGap(s.gridGap))}
            style={{ gridAutoRows: `${s.rowHeight}px` }}
          >
            {widgets.map((widget, i) => {
              const colSpan = getColSpan(widget.size);
              const rowSpan = widget.rowSpan ?? getDefaultRowSpan(widget.size);
              return (
                <motion.div
                  key={widget.id}
                  style={{
                    gridColumn: `span ${colSpan}`,
                    gridRow: `span ${rowSpan}`,
                  }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <BentoWidget
                    widget={widget}
                    style={s}
                    accentColor={client.accentColor}
                    radius={radius}
                    onWidgetClick={handleWidgetClick}
                    onVcardClick={handleVcardClick}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: s.subtextColor }}>
            Nessun contenuto ancora.
          </p>
        )}

        <footer className="mt-12 flex items-center justify-between pb-4">
          <p
            className="text-xs"
            style={{ color: s.textColor, opacity: 0.5 }}
          >
            Liinks v0.1 by MISMO&reg;
          </p>
          <Image
            src="/logo_liinks.svg"
            alt="Liinks"
            width={80}
            height={35}
            className="h-7 w-auto"
            style={{
              filter: s.bgColor === "#ffffff" || s.bgColor === "#f4f4f5" || s.bgColor === "#F5F5F5"
                ? "none"
                : "invert(1)",
            }}
          />
        </footer>
      </div>
    </div>
  );
}

function BentoWidget({
  widget,
  style: s,
  accentColor,
  radius,
  onWidgetClick,
  onVcardClick,
}: {
  widget: Widget;
  style: ClientStyle;
  accentColor: string;
  radius: number;
  onWidgetClick: (widgetId: string) => void;
  onVcardClick: (widgetId: string) => void;
}) {
  const bg = widget.bgColor || s.widgetBgColor;
  const textColor = widget.textColor || s.widgetTextColor;

  const boxStyle: React.CSSProperties = {
    backgroundColor: bg,
    borderColor: s.widgetBorderColor,
    borderWidth: 1,
    borderRadius: radius,
    borderStyle: "solid",
  };

  const iconRadius = s.iconBorderRadius ?? 17;
  const isPng = widget.brandImage?.endsWith(".png");

  const customIcon = widget.brandImage ? (
    isPng ? (
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: iconRadius,
          backgroundColor: "#F5F5F5",
        }}
      >
        <Image
          src={widget.brandImage}
          alt=""
          width={36}
          height={36}
          className="object-contain"
          style={{ width: 36, height: 36 }}
        />
      </div>
    ) : (
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: 64,
          height: 64,
          borderRadius: iconRadius,
        }}
      >
        <Image
          src={widget.brandImage}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
        />
      </div>
    )
  ) : widget.icon ? (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 64,
        height: 64,
        borderRadius: iconRadius,
        backgroundColor: "#F5F5F5",
      }}
    >
      <IconRenderer name={widget.icon} style={{ color: accentColor, width: 36, height: 36 }} />
    </div>
  ) : null;

  // ---- MAP ----
  if (widget.type === "map" && widget.lat != null && widget.lng != null) {
    // CartoDB Voyager tiles with precise centering via CSS offset
    const zoom = 14;
    const tileSize = 256;
    const n = Math.pow(2, zoom);
    const latRad = (widget.lat * Math.PI) / 180;
    // Exact pixel position of the coordinate within the world
    const worldX = ((widget.lng + 180) / 360) * n * tileSize;
    const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * tileSize;
    // Tile indices
    const tileX = Math.floor(worldX / tileSize);
    const tileY = Math.floor(worldY / tileSize);
    // Pixel offset within the center tile (how far the point is from the tile's top-left)
    const offsetX = worldX - tileX * tileSize;
    const offsetY = worldY - tileY * tileSize;
    // Build 5x5 grid for plenty of coverage
    const gridSize = 5;
    const half = Math.floor(gridSize / 2);
    const tiles: { src: string; col: number; row: number }[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        tiles.push({
          src: `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tileX + col - half}/${tileY + row - half}@2x.png`,
          col,
          row,
        });
      }
    }
    // The center of the grid should align with the coordinate
    // Grid center pixel = half * tileSize + offset within center tile
    // We shift the grid so this point is at 50% 50% of the container
    const shiftX = half * tileSize + offsetX;
    const shiftY = half * tileSize + offsetY;

    return (
      <a
        href={widget.url || `https://www.google.com/maps/@${widget.lat},${widget.lng},15z`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onWidgetClick(widget.id)}
        className="group relative block h-full overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ borderRadius: radius, borderColor: s.widgetBorderColor, borderWidth: 1, borderStyle: "solid" }}
      >
        {/* Tile mosaic — shifted so coordinate is at exact center */}
        <div
          className="absolute"
          style={{
            width: gridSize * tileSize,
            height: gridSize * tileSize,
            top: `calc(50% - ${shiftY}px)`,
            left: `calc(50% - ${shiftX}px)`,
            display: "grid",
            gridTemplateColumns: `repeat(${gridSize}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${tileSize}px)`,
            fontSize: 0,
            lineHeight: 0,
          }}
        >
          {tiles.map((t, i) => (
            <img
              key={i}
              src={t.src}
              alt=""
              draggable={false}
              width={tileSize}
              height={tileSize}
              style={{ display: "block", width: tileSize, height: tileSize }}
            />
          ))}
        </div>
        {/* Blinking blue dot — always at center */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative">
            <div className="h-4 w-4 rounded-full bg-blue-500 shadow-[0_0_20px_6px_rgba(59,130,246,0.4)]" />
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75" />
          </div>
        </div>
        {/* Label */}
        {widget.mapLabel && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 p-3"
            style={{
              background: `linear-gradient(transparent, rgba(0,0,0,0.7))`,
              borderRadius: `0 0 ${radius}px ${radius}px`,
            }}
          >
            <p className="text-xs font-medium text-white">
              {widget.mapLabel}
            </p>
          </div>
        )}
      </a>
    );
  }

  // ---- LINK ----
  if (widget.type === "link") {
    const isVcard = widget.url?.includes("/vcard");
    return (
      <a
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => isVcard ? onVcardClick(widget.id) : onWidgetClick(widget.id)}
        className="group flex h-full flex-col justify-between overflow-hidden p-5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={boxStyle}
      >
        <div>
          {customIcon}
          <p className={cn("text-sm font-semibold", customIcon && "mt-2")} style={{ color: textColor }}>
            {widget.title}
          </p>
          {widget.description && (
            <p className="mt-1 text-xs" style={{ color: s.subtextColor }}>
              {widget.description}
            </p>
          )}
        </div>
        <div className="flex items-end justify-between">
          <span className="truncate text-xs" style={{ color: s.subtextColor, opacity: 0.6 }}>
            {widget.url && (() => { try { return new URL(widget.url).hostname; } catch { return ""; } })()}
          </span>
          <IconArrowUpRight
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: s.subtextColor }}
          />
        </div>
      </a>
    );
  }

  // ---- SOCIAL ----
  if (widget.type === "social" && widget.platform) {
    const SocialIcon = SOCIAL_ICONS[widget.platform];
    return (
      <a
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onWidgetClick(widget.id)}
        className="group flex h-full flex-col justify-between overflow-hidden p-5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={boxStyle}
      >
        {customIcon || <SocialIcon className="h-8 w-8" style={{ color: accentColor }} />}
        <div>
          <p className="text-sm font-semibold" style={{ color: textColor }}>
            {SOCIAL_LABELS[widget.platform]}
          </p>
          <p className="text-xs" style={{ color: s.subtextColor }}>
            @{widget.username}
          </p>
        </div>
      </a>
    );
  }

  // ---- TEXT ----
  if (widget.type === "text") {
    return (
      <div className="flex h-full flex-col overflow-hidden p-5" style={boxStyle}>
        {customIcon}
        {widget.title && (
          <p className={cn("mb-2 text-sm font-semibold", customIcon && "mt-2")} style={{ color: textColor }}>
            {widget.title}
          </p>
        )}
        <p className="flex-1 text-xs leading-relaxed" style={{ color: s.subtextColor }}>
          {widget.content}
        </p>
      </div>
    );
  }

  return null;
}

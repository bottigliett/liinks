"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useRef, useCallback, useState } from "react";
import { Client, Widget, SocialPlatform, ClientStyle } from "@/lib/types";
import { getCardBoxStyle } from "@/lib/card-styles";
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
  IconLayoutGrid,
  IconList,
  IconSun,
  IconMoon,
  IconShare,
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
  const originalStyle = client.style;
  const [darkMode, setDarkMode] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  // Invert colors for dark mode
  const s: ClientStyle = darkMode
    ? {
        ...originalStyle,
        bgColor: "#18181b",
        textColor: "#f4f4f5",
        subtextColor: "#a1a1aa",
        widgetBgColor: "#27272a",
        widgetBorderColor: "#3f3f46",
        widgetTextColor: "#f4f4f5",
      }
    : originalStyle;

  const radius = getBorderRadius(s.borderRadius);
  const trackedRef = useRef(false);
  const [copyFeedback, setCopyFeedback] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<"widget" | "list">("widget");

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      sendTrackEvent({ clientId: client.id, type: "PAGE_VIEW" });
    }
  }, [client.id]);

  useEffect(() => {
    function handleCopyClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("[data-copy]");
      if (!target) return;
      const container = (e.target as HTMLElement).closest(".bio-content");
      if (!container) return;
      e.preventDefault();
      const text = (target as HTMLElement).getAttribute("data-copy") || "";
      navigator.clipboard.writeText(text).then(() => {
        setCopyFeedback({ x: e.clientX, y: e.clientY });
        setTimeout(() => setCopyFeedback(null), 1500);
      }).catch(() => {});
    }
    document.addEventListener("click", handleCopyClick);
    return () => document.removeEventListener("click", handleCopyClick);
  }, []);

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

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 1500);
    }).catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen px-4 py-12 sm:px-6"
      style={{
        backgroundColor: s.bgColor,
        fontFamily: "'Stack Sans Text', sans-serif",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: (() => {
        const c = encodeURIComponent(s.subtextColor);
        const ico = (svg: string) => `url("data:image/svg+xml,${svg}")`;
        const mail = ico(`%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/%3E%3C/svg%3E`);
        const phone = ico(`%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'/%3E%3C/svg%3E`);
        const copy = ico(`%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E`);
        return [
          `.bio-content a{text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;gap:3px}`,
          `.bio-content a::before{content:'';display:inline-block;width:14px;height:14px;flex-shrink:0;background-size:contain;background-repeat:no-repeat}`,
          `.bio-content a[href^=mailto]::before{background-image:${mail}}`,
          `.bio-content a[href^=tel]::before{background-image:${phone}}`,
          `.bio-content a[data-copy]::before{background-image:${copy}}`,
        ].join('');
      })() }} />
      <div
        className={cn(
          "mx-auto max-w-[430px]",
          s.alignment === "center" ? "text-center" : "text-left",
        )}
      >
        {/* Top bar: dark/light toggle + share */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="relative flex items-center justify-center rounded-full p-2 transition-all duration-300 active:scale-90"
            style={{
              backgroundColor: s.widgetBgColor,
              borderColor: s.widgetBorderColor,
              borderWidth: 1,
              borderStyle: "solid",
              boxShadow: `0 2px 0px ${s.widgetBorderColor}`,
              color: s.widgetTextColor,
            }}
          >
            {darkMode ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleShare}
            className="relative flex items-center justify-center rounded-full p-2 transition-all duration-300 active:scale-90"
            style={{
              backgroundColor: s.widgetBgColor,
              borderColor: s.widgetBorderColor,
              borderWidth: 1,
              borderStyle: "solid",
              boxShadow: `0 2px 0px ${s.widgetBorderColor}`,
              color: s.widgetTextColor,
            }}
          >
            <IconShare className="h-4 w-4" />
          </button>
        </div>

        {shareFeedback && (
          <div className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            Link copiato!
          </div>
        )}

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

        {/* View mode toggle — icon only */}
        {widgets.length > 0 && (
          <div className="mb-5 flex justify-start">
            <div
              className="inline-flex rounded-full p-0.5"
              style={{ backgroundColor: s.widgetBorderColor }}
            >
              <button
                onClick={() => setViewMode("widget")}
                className="relative flex items-center justify-center rounded-full p-1.5 transition-all duration-300"
                style={{
                  backgroundColor: viewMode === "widget" ? s.widgetBgColor : "transparent",
                  color: viewMode === "widget" ? s.widgetTextColor : s.subtextColor,
                  boxShadow: viewMode === "widget" ? "0 2px 0px rgba(0,0,0,0.15)" : "none",
                }}
              >
                <IconLayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="relative flex items-center justify-center rounded-full p-1.5 transition-all duration-300"
                style={{
                  backgroundColor: viewMode === "list" ? s.widgetBgColor : "transparent",
                  color: viewMode === "list" ? s.widgetTextColor : s.subtextColor,
                  boxShadow: viewMode === "list" ? "0 2px 0px rgba(0,0,0,0.15)" : "none",
                }}
              >
                <IconList className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {widgets.length > 0 ? (
          viewMode === "widget" ? (
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
            <div className="flex flex-col gap-3">
              {widgets.map((widget, i) => (
                <motion.div
                  key={widget.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05, ease: [0.175, 0.885, 0.32, 1.275] }}
                >
                  <ListItem
                    widget={widget}
                    style={s}
                    accentColor={client.accentColor}
                    radius={radius}
                    onWidgetClick={handleWidgetClick}
                    onVcardClick={handleVcardClick}
                  />
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm" style={{ color: s.subtextColor }}>
            Nessun contenuto ancora.
          </p>
        )}

        {copyFeedback && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
            style={{ left: copyFeedback.x, top: copyFeedback.y - 40, transform: "translateX(-50%)" }}
          >
            Copiato!
          </div>
        )}

        <footer className="mt-12 flex items-center justify-between pb-4">
          <p
            className="text-xs"
            style={{ color: s.textColor, opacity: 0.5 }}
          >
            Liinks v0.2 by MISMO&reg;
          </p>
          <Image
            src="/logo_liinks.svg"
            alt="Liinks"
            width={80}
            height={35}
            className="h-7 w-auto"
            style={{
              filter: (originalStyle.bgColor === "#ffffff" || originalStyle.bgColor === "#f4f4f5" || originalStyle.bgColor === "#F5F5F5") && !darkMode
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

  const boxStyle: React.CSSProperties = getCardBoxStyle(s, widget);

  const iconRadius = s.iconBorderRadius ?? 17;
  const needsBgBox = widget.brandImage?.endsWith(".png") || widget.brandImage?.endsWith(".svg");

  const customIcon = widget.brandImage ? (
    needsBgBox ? (
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
        style={getCardBoxStyle(s, widget)}
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
        className="group relative flex h-full flex-col justify-between p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={boxStyle}
      >
        <div className="min-w-0 overflow-hidden">
          {customIcon}
          <p className={cn("truncate text-sm font-semibold pr-5", customIcon && "mt-1.5")} style={{ color: textColor }}>
            {widget.title}
          </p>
        </div>
        <div className="min-w-0">
          {widget.description ? (
            <p className="line-clamp-2 text-xs pr-5" style={{ color: s.subtextColor }}>
              {widget.description}
            </p>
          ) : (
            <span className="truncate block text-xs" style={{ color: s.subtextColor, opacity: 0.6 }}>
              {widget.url && (() => { try { return new URL(widget.url).hostname; } catch { return ""; } })()}
            </span>
          )}
        </div>
        <IconArrowUpRight
          className="absolute bottom-3.5 right-3.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color: s.subtextColor }}
        />
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
        className="group relative flex h-full flex-col justify-between p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={boxStyle}
      >
        {customIcon || <SocialIcon className="h-8 w-8" style={{ color: accentColor }} />}
        <div className="min-w-0 overflow-hidden">
          <p className="truncate text-sm font-semibold pr-5" style={{ color: textColor }}>
            {widget.title || SOCIAL_LABELS[widget.platform]}
          </p>
          <p className="line-clamp-2 text-xs pr-5" style={{ color: s.subtextColor }}>
            {widget.description || `@${widget.username}`}
          </p>
        </div>
        <IconArrowUpRight
          className="absolute bottom-3.5 right-3.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color: s.subtextColor }}
        />
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

function ListItem({
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
  const textColor = widget.textColor || s.widgetTextColor;
  const cardBox = getCardBoxStyle(s, widget);
  const iconRadius = s.iconBorderRadius ?? 17;
  const needsBgBox = widget.brandImage?.endsWith(".png") || widget.brandImage?.endsWith(".svg");

  const listIcon = widget.brandImage ? (
    needsBgBox ? (
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: 44, height: 44, borderRadius: iconRadius * 0.7, backgroundColor: "#F5F5F5" }}
      >
        <Image src={widget.brandImage} alt="" width={26} height={26} className="object-contain" style={{ width: 26, height: 26 }} />
      </div>
    ) : (
      <div className="shrink-0 overflow-hidden" style={{ width: 44, height: 44, borderRadius: iconRadius * 0.7 }}>
        <Image src={widget.brandImage} alt="" width={44} height={44} className="h-full w-full object-cover" />
      </div>
    )
  ) : widget.icon ? (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: 44, height: 44, borderRadius: iconRadius * 0.7, backgroundColor: "#F5F5F5" }}
    >
      <IconRenderer name={widget.icon} style={{ color: accentColor, width: 26, height: 26 }} />
    </div>
  ) : null;

  // Map widget in list mode
  if (widget.type === "map" && widget.lat != null && widget.lng != null) {
    return (
      <a
        href={widget.url || `https://www.google.com/maps/@${widget.lat},${widget.lng},15z`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onWidgetClick(widget.id)}
        className="relative flex items-center gap-3 overflow-hidden px-4 py-3 transition-all active:top-[2px] active:shadow-none"
        style={{ ...cardBox, top: 0 }}
      >
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: iconRadius * 0.7, backgroundColor: "#F5F5F5" }}
        >
          <div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: textColor }}>
            {widget.mapLabel || "Mappa"}
          </p>
        </div>
        <IconArrowUpRight className="h-4 w-4 shrink-0" style={{ color: s.subtextColor }} />
      </a>
    );
  }

  // Link widget
  if (widget.type === "link") {
    const isVcard = widget.url?.includes("/vcard");
    return (
      <a
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => isVcard ? onVcardClick(widget.id) : onWidgetClick(widget.id)}
        className="relative flex items-center gap-3 px-4 py-3 transition-all active:top-[2px] active:shadow-none"
        style={{ ...cardBox, top: 0 }}
      >
        {listIcon}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: textColor }}>
            {widget.title}
          </p>
          {widget.description && (
            <p className="truncate text-xs" style={{ color: s.subtextColor }}>{widget.description}</p>
          )}
        </div>
        <IconArrowUpRight className="h-4 w-4 shrink-0" style={{ color: s.subtextColor }} />
      </a>
    );
  }

  // Social widget
  if (widget.type === "social" && widget.platform) {
    const SocialIcon = SOCIAL_ICONS[widget.platform];
    return (
      <a
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onWidgetClick(widget.id)}
        className="relative flex items-center gap-3 px-4 py-3 transition-all active:top-[2px] active:shadow-none"
        style={{ ...cardBox, top: 0 }}
      >
        {listIcon || <SocialIcon className="h-6 w-6 shrink-0" style={{ color: accentColor }} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: textColor }}>
            {SOCIAL_LABELS[widget.platform]}
          </p>
          <p className="truncate text-xs" style={{ color: s.subtextColor }}>@{widget.username}</p>
        </div>
        <IconArrowUpRight className="h-4 w-4 shrink-0" style={{ color: s.subtextColor }} />
      </a>
    );
  }

  // Text widget
  if (widget.type === "text") {
    return (
      <div
        className="relative flex items-center gap-3 px-4 py-3"
        style={{ ...cardBox, top: 0 }}
      >
        {listIcon}
        <div className="min-w-0 flex-1">
          {widget.title && (
            <p className="truncate text-sm font-semibold" style={{ color: textColor }}>{widget.title}</p>
          )}
          {widget.content && (
            <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: s.subtextColor }}>{widget.content}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

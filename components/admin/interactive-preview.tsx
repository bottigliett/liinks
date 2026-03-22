"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Widget, ClientStyle, SocialPlatform } from "@/lib/types";
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

function getBorderRadius(br: ClientStyle["borderRadius"]): number {
  const map = { none: 0, sm: 4, md: 8, lg: 12, xl: 16, "2xl": 20, full: 9999 };
  return map[br] ?? 20;
}

function getColSpan(size: Widget["size"]): number {
  return size === "wide" || size === "large" ? 2 : 1;
}

function getRowSpan(w: Widget): number {
  if (w.rowSpan) return w.rowSpan;
  return w.size === "medium" || w.size === "large" ? 2 : 1;
}

function sizeFromSpans(colSpan: number, rowSpan: number): { size: Widget["size"]; rowSpan?: number } {
  if (colSpan >= 2 && rowSpan >= 2) return { size: "large", ...(rowSpan > 2 ? { rowSpan } : {}) };
  if (colSpan >= 2) return { size: "wide", ...(rowSpan > 1 ? { rowSpan } : {}) };
  if (rowSpan >= 2) return { size: "medium", ...(rowSpan > 2 ? { rowSpan } : {}) };
  return { size: "small" };
}

interface InteractivePreviewProps {
  name: string;
  bio: string;
  avatarUrl: string;
  accentColor: string;
  style: ClientStyle;
  widgets: Widget[];
  onReorder: (widgetIds: string[]) => void;
  onResizeWidget: (widgetId: string, updates: Partial<Widget>) => void;
}

export function InteractivePreview({
  name,
  bio,
  avatarUrl,
  accentColor,
  style: s,
  widgets,
  onReorder,
  onResizeWidget,
}: InteractivePreviewProps) {
  const radius = getBorderRadius(s.borderRadius);
  const gapClass = { tight: "gap-1.5", normal: "gap-2", loose: "gap-3" }[s.gridGap];
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = widgets.findIndex((w) => w.id === active.id);
      const newIdx = widgets.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(widgets, oldIdx, newIdx);
      onReorder(reordered.map((w) => w.id));
    },
    [widgets, onReorder],
  );

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  const bioLinkStyles = (() => {
    const c = encodeURIComponent(s.subtextColor);
    const ico = (svg: string) => `url("data:image/svg+xml,${svg}")`;
    const mail = ico(`%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/%3E%3C/svg%3E`);
    const phone = ico(`%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'/%3E%3C/svg%3E`);
    const copy = ico(`%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E`);
    return [
      `.bio-content a{text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;gap:2px}`,
      `.bio-content a::before{content:'';display:inline-block;width:11px;height:11px;flex-shrink:0;background-size:contain;background-repeat:no-repeat}`,
      `.bio-content a[href^=mailto]::before{background-image:${mail}}`,
      `.bio-content a[href^=tel]::before{background-image:${phone}}`,
      `.bio-content a[data-copy]::before{background-image:${copy}}`,
    ].join('');
  })();

  return (
    <div className={s.alignment === "center" ? "text-center" : "text-left"}>
      <style dangerouslySetInnerHTML={{ __html: bioLinkStyles }} />
      {s.showAvatar && (
        <div className={cn("mb-3", s.alignment === "center" && "flex justify-center")}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={56}
              height={56}
              className={cn(
                "h-14 w-14 object-cover",
                s.avatarStyle === "circle" && "rounded-full",
                s.avatarStyle === "rounded" && "rounded-xl",
                s.avatarStyle === "square" && "rounded-none",
              )}
            />
          ) : (
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center text-lg font-bold text-white",
                s.avatarStyle === "circle" && "rounded-full",
                s.avatarStyle === "rounded" && "rounded-xl",
                s.avatarStyle === "square" && "rounded-none",
              )}
              style={{ backgroundColor: accentColor }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
      <p className="text-base font-bold" style={{ color: s.textColor }}>{name}</p>
      {bio && (
        <div
          className="bio-content mt-1 text-xs"
          style={{ color: s.subtextColor }}
          dangerouslySetInnerHTML={{ __html: bio }}
        />
      )}

      {widgets.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={widgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className={cn("mt-4 grid grid-cols-2", gapClass)}
              style={{ gridAutoRows: `${Math.round(s.rowHeight * 0.82)}px` }}
            >
              {widgets.map((w) => (
                <DraggableResizableWidget
                  key={w.id}
                  widget={w}
                  style={s}
                  accentColor={accentColor}
                  radius={radius}
                  isDragActive={activeId === w.id}
                  onResize={(updates) => onResizeWidget(w.id, updates)}
                  gridRowHeight={Math.round(s.rowHeight * 0.82)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeWidget && (
              <div
                className="overflow-hidden p-2.5 opacity-80 shadow-lg"
                style={{
                  gridColumn: `span ${getColSpan(activeWidget.size)}`,
                  gridRow: `span ${getRowSpan(activeWidget)}`,
                  ...getCardBoxStyle(s, activeWidget),
                  borderRadius: Math.min(s.cardStyle === "brutal" ? 0 : radius, 16),
                  width: getColSpan(activeWidget.size) === 2 ? "100%" : "50%",
                }}
              >
                <WidgetContent widget={activeWidget} style={s} accentColor={accentColor} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function DraggableResizableWidget({
  widget,
  style: s,
  accentColor,
  radius,
  isDragActive,
  onResize,
  gridRowHeight,
}: {
  widget: Widget;
  style: ClientStyle;
  accentColor: string;
  radius: number;
  isDragActive: boolean;
  onResize: (updates: Partial<Widget>) => void;
  gridRowHeight: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Resize state
  const [resizing, setResizing] = useState(false);
  const [tempColSpan, setTempColSpan] = useState<number | null>(null);
  const [tempRowSpan, setTempRowSpan] = useState<number | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startColSpan: number;
    startRowSpan: number;
    colWidth: number;
  } | null>(null);

  const currentColSpan = tempColSpan ?? getColSpan(widget.size);
  const currentRowSpan = tempRowSpan ?? getRowSpan(widget);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const gridEl = target.closest("[class*='grid-cols-2']") as HTMLElement;
      const colWidth = gridEl ? gridEl.clientWidth / 2 : 170;

      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startColSpan: getColSpan(widget.size),
        startRowSpan: getRowSpan(widget),
        colWidth,
      };
      setResizing(true);
    },
    [widget],
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return;
      const { startX, startY, startColSpan, startRowSpan, colWidth } = resizeRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newColSpan = Math.max(1, Math.min(2, Math.round(startColSpan + dx / colWidth)));
      const newRowSpan = Math.max(1, Math.min(4, Math.round(startRowSpan + dy / gridRowHeight)));

      setTempColSpan(newColSpan);
      setTempRowSpan(newRowSpan);
    },
    [gridRowHeight],
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return;
      const target = e.currentTarget as HTMLElement;
      target.releasePointerCapture(e.pointerId);

      const finalColSpan = tempColSpan ?? getColSpan(widget.size);
      const finalRowSpan = tempRowSpan ?? getRowSpan(widget);

      const { size, rowSpan } = sizeFromSpans(finalColSpan, finalRowSpan);
      onResize({ size, rowSpan });

      resizeRef.current = null;
      setResizing(false);
      setTempColSpan(null);
      setTempRowSpan(null);
    },
    [tempColSpan, tempRowSpan, widget, onResize],
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        ...sortableStyle,
        gridColumn: `span ${currentColSpan}`,
        gridRow: `span ${currentRowSpan}`,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="group relative"
    >
      <div
        {...attributes}
        {...listeners}
        className="h-full w-full cursor-grab overflow-hidden p-2.5 active:cursor-grabbing"
        style={{
          ...getCardBoxStyle(s, widget),
          borderRadius: Math.min(s.cardStyle === "brutal" ? 0 : radius, 16),
          ...(isDragActive ? { borderColor: accentColor, borderWidth: 2, borderStyle: "dashed" } : {}),
        }}
      >
        <WidgetContent widget={widget} style={s} accentColor={accentColor} />
      </div>
      {/* Resize handle */}
      <div
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className={cn(
          "absolute bottom-0 right-0 z-10 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-tl-md transition-opacity",
          resizing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        style={{
          backgroundColor: accentColor,
          borderBottomRightRadius: Math.min(radius, 16),
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M7 1L1 7M7 4L4 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      {resizing && (
        <div
          className="pointer-events-none absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white"
        >
          {currentColSpan}x{currentRowSpan}
        </div>
      )}
    </div>
  );
}

function WidgetContent({
  widget: w,
  style: s,
  accentColor,
}: {
  widget: Widget;
  style: ClientStyle;
  accentColor: string;
}) {
  return (
    <>
      {w.brandImage ? (
        (w.brandImage.endsWith(".png") || w.brandImage.endsWith(".svg")) ? (
          <div className="mb-1 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: (s.iconBorderRadius ?? 17) * 22 / 64, backgroundColor: "#F5F5F5" }}>
            <img src={w.brandImage} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
          </div>
        ) : (
          <div className="mb-1 overflow-hidden" style={{ width: 22, height: 22, borderRadius: (s.iconBorderRadius ?? 17) * 22 / 64 }}>
            <img src={w.brandImage} alt="" style={{ width: 22, height: 22, objectFit: "cover" }} />
          </div>
        )
      ) : w.icon ? (
        <div className="mb-1 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: (s.iconBorderRadius ?? 17) * 22 / 64, backgroundColor: "#F5F5F5" }}>
          <IconRenderer
            name={w.icon}
            style={{ color: accentColor, width: 12, height: 12 }}
          />
        </div>
      ) : null}
      {w.type === "social" && w.platform && !w.icon && (
        <SocialIconSmall platform={w.platform} color={accentColor} />
      )}
      {w.type === "map" && (
        <div className="relative flex h-full items-center justify-center">
          <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)]" />
        </div>
      )}
      <p className="truncate text-[10px] font-medium" style={{ color: w.textColor || s.widgetTextColor }}>
        {w.type === "social" ? (w.title || w.platform) : w.type === "map" ? (w.mapLabel || "Map") : (w.title || w.content?.slice(0, 30) || "")}
      </p>
    </>
  );
}

function SocialIconSmall({ platform, color }: { platform: SocialPlatform; color: string }) {
  const Icon = SOCIAL_ICONS[platform];
  return <Icon className="mb-1 h-4 w-4" style={{ color }} />;
}

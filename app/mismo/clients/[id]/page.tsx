"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Client,
  Widget,
  WidgetType,
  SocialPlatform,
  ClientStyle,
  CardStyle,
  DEFAULT_STYLE,
} from "@/lib/types";
import { AVAILABLE_ICONS } from "@/lib/icons";
import { BRAND_IMAGES } from "@/lib/brands";
import { IconRenderer } from "@/components/icon-renderer";
import { cn } from "@/lib/utils";
import { InteractivePreview } from "@/components/admin/interactive-preview";
import { RichBioEditor } from "@/components/admin/rich-bio-editor";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconExternalLink,
  IconLink,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandYoutube,
  IconBrandX,
  IconBrandFacebook,
  IconBrandLinkedin,
  IconBrandGithub,
  IconBrandSpotify,
  IconWorld,
  IconAlignLeft,
  IconDeviceFloppy,
  IconUpload,
  IconPalette,
  IconPhoto,
  IconGripVertical,
  IconEdit,
  IconCheck,
  IconX,
  IconMap,
  IconArrowUpRight,
  IconChartBar,
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

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  link: "Link",
  social: "Social",
  text: "Testo",
  map: "Mappa",
};

const SIZE_OPTIONS = [
  { value: "small", label: "1×1" },
  { value: "medium", label: "1×2" },
  { value: "wide", label: "2×1" },
  { value: "large", label: "2×2" },
] as const;

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:border-white dark:focus:ring-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";
const labelClass =
  "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

type Tab = "info" | "style" | "widgets" | "insights";

// --- Parse Google Maps URL ---
function parseMapsUrl(url: string): { lat: number; lng: number } | null {
  // Try @lat,lng pattern
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  // Try q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  // Try place/.../@lat,lng
  const placeMatch = url.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  return null;
}

export default function ClientDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("widgets");
  const [addingWidget, setAddingWidget] = useState<WidgetType | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  // Live preview: overrides from in-progress editing
  const [widgetOverrides, setWidgetOverrides] = useState<Record<string, Partial<Widget>>>({});

  // Edit state
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAccent, setEditAccent] = useState("#3b82f6");
  const [editStyle, setEditStyle] = useState<ClientStyle>(DEFAULT_STYLE);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleWidgetEditChange = useCallback(
    (widgetId: string, data: Partial<Widget> | null) => {
      setWidgetOverrides((prev) => {
        if (data === null) {
          const next = { ...prev };
          delete next[widgetId];
          return next;
        }
        return { ...prev, [widgetId]: data };
      });
    },
    [],
  );

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (res.ok) {
      const data: Client = await res.json();
      setClient(data);
      setEditName(data.name);
      setEditSlug(data.slug);
      setEditBio(data.bio || "");
      setEditAvatarUrl(data.avatarUrl || "");
      setEditPhone(data.phone || "");
      setEditEmail(data.email || "");
      setEditAccent(data.accentColor);
      setEditStyle({ ...DEFAULT_STYLE, ...data.style });
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/mismo/login");
    else if (status === "authenticated") fetchClient();
  }, [status, router, fetchClient]);

  async function saveAll() {
    setSaving(true);
    // Save client info
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        slug: editSlug,
        bio: editBio,
        avatarUrl: editAvatarUrl,
        phone: editPhone,
        email: editEmail,
        accentColor: editAccent,
        style: editStyle,
      }),
    });
    // Also save any in-progress widget edits
    if (editingWidgetId && widgetOverrides[editingWidgetId]) {
      await fetch(`/api/clients/${clientId}/widgets/${editingWidgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widgetOverrides[editingWidgetId]),
      });
      setEditingWidgetId(null);
      handleWidgetEditChange(editingWidgetId, null);
    }
    await fetchClient();
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) {
      const { url } = await res.json();
      setEditAvatarUrl(url);
    }
  }

  async function addWidget(
    type: WidgetType,
    formData: Record<string, string>,
  ) {
    const widgetData: Partial<Widget> = { type };

    if (type === "link") {
      widgetData.title = formData.title;
      widgetData.url = formData.url;
      widgetData.description = formData.description;
      widgetData.size = (formData.size as Widget["size"]) || "wide";
    } else if (type === "social") {
      widgetData.platform = formData.platform as SocialPlatform;
      widgetData.username = formData.username;
      widgetData.url = formData.url;
      widgetData.size = (formData.size as Widget["size"]) || "small";
    } else if (type === "text") {
      widgetData.title = formData.title;
      widgetData.content = formData.content;
      widgetData.size = (formData.size as Widget["size"]) || "large";
    } else if (type === "map") {
      const mapsUrl = formData.mapsUrl || "";
      // First try local parsing
      let coords = parseMapsUrl(mapsUrl);
      // If local parsing fails (e.g. shortened URL), resolve server-side
      if (!coords && mapsUrl) {
        try {
          const res = await fetch("/api/resolve-maps-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: mapsUrl }),
          });
          if (res.ok) {
            const data = await res.json();
            coords = { lat: data.lat, lng: data.lng };
          }
        } catch { /* ignore */ }
      }
      if (coords) {
        widgetData.lat = coords.lat;
        widgetData.lng = coords.lng;
      }
      widgetData.mapLabel = formData.mapLabel;
      widgetData.url = mapsUrl;
      widgetData.size = (formData.size as Widget["size"]) || "wide";
    }

    if (formData.icon) widgetData.icon = formData.icon;
    if (formData.brandImage) widgetData.brandImage = formData.brandImage;
    if (formData.bgColor) widgetData.bgColor = formData.bgColor;
    if (formData.textColor) widgetData.textColor = formData.textColor;
    if (formData.rowSpan) widgetData.rowSpan = Number(formData.rowSpan);

    await fetch(`/api/clients/${clientId}/widgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(widgetData),
    });
    setAddingWidget(null);
    fetchClient();
  }

  async function updateWidget(
    widgetId: string,
    updates: Partial<Widget>,
  ) {
    // Optimistic update for live preview
    if (client) {
      setClient({
        ...client,
        widgets: client.widgets.map((w) =>
          w.id === widgetId ? { ...w, ...updates } : w,
        ),
      });
    }
    await fetch(`/api/clients/${clientId}/widgets/${widgetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setEditingWidgetId(null);
    handleWidgetEditChange(widgetId, null);
    fetchClient();
  }

  async function deleteWidget(widgetId: string) {
    if (!confirm("Eliminare questo widget?")) return;
    await fetch(`/api/clients/${clientId}/widgets/${widgetId}`, {
      method: "DELETE",
    });
    fetchClient();
  }

  async function cycleSize(widgetId: string, currentSize: Widget["size"]) {
    const order: Widget["size"][] = ["small", "wide", "medium", "large"];
    const idx = order.indexOf(currentSize);
    const next = order[(idx + 1) % order.length];
    await updateWidget(widgetId, { size: next });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !client) return;

    const widgets = [...client.widgets].sort((a, b) => a.order - b.order);
    const oldIdx = widgets.findIndex((w) => w.id === active.id);
    const newIdx = widgets.findIndex((w) => w.id === over.id);
    const reordered = arrayMove(widgets, oldIdx, newIdx);

    // Optimistic update
    setClient({
      ...client,
      widgets: reordered.map((w, i) => ({ ...w, order: i })),
    });

    await fetch(`/api/clients/${clientId}/widgets/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetIds: reordered.map((w) => w.id) }),
    });
    fetchClient();
  }

  async function handlePreviewReorder(widgetIds: string[]) {
    if (!client) return;
    // Optimistic update
    const widgetMap = new Map(client.widgets.map((w) => [w.id, w]));
    const reordered = widgetIds.map((id, i) => ({ ...widgetMap.get(id)!, order: i }));
    setClient({ ...client, widgets: reordered });

    await fetch(`/api/clients/${clientId}/widgets/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetIds }),
    });
    fetchClient();
  }

  async function handlePreviewResize(widgetId: string, updates: Partial<Widget>) {
    await updateWidget(widgetId, updates);
  }

  function updateStyle<K extends keyof ClientStyle>(
    key: K,
    value: ClientStyle[K],
  ) {
    setEditStyle((prev) => ({ ...prev, [key]: value }));
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Caricamento...</p>
      </div>
    );
  }

  if (!session || !client) return null;

  const sortedWidgets = [...client.widgets].sort((a, b) => a.order - b.order);

  // Merge overrides for live preview
  const previewWidgets = sortedWidgets.map((w) =>
    widgetOverrides[w.id] ? { ...w, ...widgetOverrides[w.id] } : w,
  );

  const tabs: { key: Tab; label: string; icon: typeof IconPalette }[] = [
    { key: "info", label: "Info & Avatar", icon: IconPhoto },
    { key: "style", label: "Stile", icon: IconPalette },
    { key: "widgets", label: "Widget", icon: IconLink },
    { key: "insights", label: "Insights", icon: IconChartBar },
  ];

  // Build a preview style for live preview
  const previewStyle = editStyle;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/mismo")}
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <IconArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              {editAvatarUrl ? (
                <Image
                  src={editAvatarUrl}
                  alt={client.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: editAccent }}
                >
                  {editName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {editName}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  /{editSlug}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/${client.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <IconExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Apri</span>
            </a>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50"
            >
              <IconDeviceFloppy className="h-4 w-4" />
              {saving ? "Salvo..." : "Salva"}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl gap-0 px-4 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content: left panel + live preview */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex gap-6">
          {/* Left: controls */}
          <div className="min-w-0 flex-1">
            {tab === "info" && (
              <InfoTab
                editName={editName}
                setEditName={setEditName}
                editSlug={editSlug}
                setEditSlug={setEditSlug}
                editBio={editBio}
                setEditBio={setEditBio}
                editAvatarUrl={editAvatarUrl}
                setEditAvatarUrl={setEditAvatarUrl}
                editPhone={editPhone}
                setEditPhone={setEditPhone}
                editEmail={editEmail}
                setEditEmail={setEditEmail}
                editAccent={editAccent}
                editStyle={editStyle}
                updateStyle={updateStyle}
                handleAvatarUpload={handleAvatarUpload}
              />
            )}

            {tab === "style" && (
              <StyleTab
                editAccent={editAccent}
                setEditAccent={setEditAccent}
                editStyle={editStyle}
                updateStyle={updateStyle}
                editName={editName}
                editBio={editBio}
              />
            )}

            {tab === "insights" && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <IconChartBar className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                  Insights
                </h3>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Visualizza le metriche di questo cliente
                </p>
                <button
                  onClick={() => router.push(`/mismo/clients/${clientId}/insights`)}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Apri Insights
                </button>
              </div>
            )}

            {tab === "widgets" && (
              <WidgetsTab
                sortedWidgets={sortedWidgets}
                addingWidget={addingWidget}
                setAddingWidget={setAddingWidget}
                editingWidgetId={editingWidgetId}
                setEditingWidgetId={setEditingWidgetId}
                addWidget={addWidget}
                updateWidget={updateWidget}
                deleteWidget={deleteWidget}
                cycleSize={cycleSize}
                handleDragEnd={handleDragEnd}
                sensors={sensors}
                widgetOverrides={widgetOverrides}
                onWidgetEditChange={handleWidgetEditChange}
              />
            )}
          </div>

          {/* Right: Live preview */}
          <div className="hidden w-[360px] shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Anteprima
              </p>
              <div
                className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
                style={{ height: 640 }}
              >
                <div
                  className="h-full overflow-y-auto p-4"
                  style={{
                    backgroundColor: previewStyle.bgColor,
                    fontFamily: "'Stack Sans Text', sans-serif",
                  }}
                >
                  <InteractivePreview
                    name={editName}
                    bio={editBio}
                    avatarUrl={editAvatarUrl}
                    accentColor={editAccent}
                    style={previewStyle}
                    widgets={previewWidgets}
                    onReorder={handlePreviewReorder}
                    onResizeWidget={handlePreviewResize}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ==========================================
// INFO TAB
// ==========================================
function InfoTab({
  editName,
  setEditName,
  editSlug,
  setEditSlug,
  editBio,
  setEditBio,
  editAvatarUrl,
  setEditAvatarUrl,
  editPhone,
  setEditPhone,
  editEmail,
  setEditEmail,
  editAccent,
  editStyle,
  updateStyle,
  handleAvatarUpload,
}: {
  editName: string;
  setEditName: (v: string) => void;
  editSlug: string;
  setEditSlug: (v: string) => void;
  editBio: string;
  setEditBio: (v: string) => void;
  editAvatarUrl: string;
  setEditAvatarUrl: (v: string) => void;
  editPhone: string;
  setEditPhone: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editAccent: string;
  editStyle: ClientStyle;
  updateStyle: <K extends keyof ClientStyle>(k: K, v: ClientStyle[K]) => void;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
          Immagine profilo
        </h3>
        <div className="flex items-start gap-6">
          <div>
            {editAvatarUrl ? (
              <Image
                src={editAvatarUrl}
                alt="Avatar"
                width={96}
                height={96}
                className={cn(
                  "h-24 w-24 object-cover",
                  editStyle.avatarStyle === "circle" && "rounded-full",
                  editStyle.avatarStyle === "rounded" && "rounded-2xl",
                  editStyle.avatarStyle === "square" && "rounded-none",
                )}
              />
            ) : (
              <div
                className={cn(
                  "flex h-24 w-24 items-center justify-center text-2xl font-bold text-white",
                  editStyle.avatarStyle === "circle" && "rounded-full",
                  editStyle.avatarStyle === "rounded" && "rounded-2xl",
                  editStyle.avatarStyle === "square" && "rounded-none",
                )}
                style={{ backgroundColor: editAccent }}
              >
                {editName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <IconUpload className="h-4 w-4" />
              Carica immagine
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
            <div>
              <label className={labelClass}>O inserisci URL</label>
              <input
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className={labelClass}>Stile avatar</label>
              <div className="flex gap-2">
                {(["circle", "rounded", "square"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateStyle("avatarStyle", s)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      editStyle.avatarStyle === s
                        ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-white dark:bg-zinc-800 dark:text-white"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400",
                    )}
                  >
                    {s === "circle" ? "Cerchio" : s === "rounded" ? "Arrotondato" : "Quadrato"}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={editStyle.showAvatar}
                onChange={(e) => updateStyle("showAvatar", e.target.checked)}
                className="rounded"
              />
              Mostra avatar
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
          Informazioni
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nome</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Slug (URL)</label>
            <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telefono</label>
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputClass} placeholder="+39 333 1234567" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputClass} placeholder="info@esempio.it" type="email" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Bio</label>
            <RichBioEditor value={editBio} onChange={setEditBio} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STYLE TAB
// ==========================================
function StyleTab({
  editAccent,
  setEditAccent,
  editStyle,
  updateStyle,
  editName,
  editBio,
}: {
  editAccent: string;
  setEditAccent: (v: string) => void;
  editStyle: ClientStyle;
  updateStyle: <K extends keyof ClientStyle>(k: K, v: ClientStyle[K]) => void;
  editName: string;
  editBio: string;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
          Colori
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorPicker label="Accento" value={editAccent} onChange={setEditAccent} />
          <ColorPicker label="Sfondo pagina" value={editStyle.bgColor} onChange={(v) => updateStyle("bgColor", v)} />
          <ColorPicker label="Testo" value={editStyle.textColor} onChange={(v) => updateStyle("textColor", v)} />
          <ColorPicker label="Testo secondario" value={editStyle.subtextColor} onChange={(v) => updateStyle("subtextColor", v)} />
          <ColorPicker label="Sfondo widget" value={editStyle.widgetBgColor} onChange={(v) => updateStyle("widgetBgColor", v)} />
          <ColorPicker label="Bordo widget" value={editStyle.widgetBorderColor} onChange={(v) => updateStyle("widgetBorderColor", v)} />
          <ColorPicker label="Testo widget" value={editStyle.widgetTextColor} onChange={(v) => updateStyle("widgetTextColor", v)} />
        </div>
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Preset</p>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setEditAccent(preset.accent);
                  updateStyle("bgColor", preset.style.bgColor);
                  updateStyle("textColor", preset.style.textColor);
                  updateStyle("subtextColor", preset.style.subtextColor);
                  updateStyle("widgetBgColor", preset.style.widgetBgColor);
                  updateStyle("widgetBorderColor", preset.style.widgetBorderColor);
                  updateStyle("widgetTextColor", preset.style.widgetTextColor);
                }}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.style.bgColor }} />
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.accent }} />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
          Layout
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Allineamento</label>
            <div className="flex gap-2">
              {(["center", "left"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => updateStyle("alignment", a)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    editStyle.alignment === a
                      ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-white dark:bg-zinc-800 dark:text-white"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400",
                  )}
                >
                  {a === "center" ? "Centrato" : "Sinistra"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Border radius</label>
            <select
              value={editStyle.borderRadius}
              onChange={(e) => updateStyle("borderRadius", e.target.value as ClientStyle["borderRadius"])}
              className={inputClass}
            >
              <option value="none">Nessuno</option>
              <option value="sm">Piccolo</option>
              <option value="md">Medio</option>
              <option value="lg">Grande</option>
              <option value="xl">XL</option>
              <option value="2xl">2XL</option>
              <option value="full">Full</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Spaziatura</label>
            <div className="flex gap-2">
              {(["tight", "normal", "loose"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => updateStyle("gridGap", g)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    editStyle.gridGap === g
                      ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-white dark:bg-zinc-800 dark:text-white"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400",
                  )}
                >
                  {g === "tight" ? "Stretto" : g === "normal" ? "Normale" : "Largo"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Altezza riga: {editStyle.rowHeight}px</label>
            <input
              type="range"
              min={100}
              max={200}
              step={10}
              value={editStyle.rowHeight}
              onChange={(e) => updateStyle("rowHeight", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className={labelClass}>Border radius icone: {editStyle.iconBorderRadius ?? 17}px</label>
            <input
              type="range"
              min={0}
              max={32}
              step={1}
              value={editStyle.iconBorderRadius ?? 17}
              onChange={(e) => updateStyle("iconBorderRadius", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Stile card</label>
            <div className="flex gap-2">
              {(["flat", "shadow", "outline", "brutal"] as CardStyle[]).map((cs) => (
                <button
                  key={cs}
                  onClick={() => updateStyle("cardStyle", cs)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    editStyle.cardStyle === cs
                      ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-white dark:bg-zinc-800 dark:text-white"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400",
                  )}
                >
                  <div
                    className="h-6 w-10 rounded-sm bg-zinc-100 dark:bg-zinc-700"
                    style={{
                      border: cs === "outline" || cs === "brutal" ? "2px solid #000" : "1px solid #d4d4d8",
                      boxShadow: cs === "shadow" ? "0 2px 0px #d4d4d8" : cs === "brutal" ? "3px 3px 0px #000" : "none",
                      borderRadius: cs === "brutal" ? 0 : 4,
                    }}
                  />
                  {cs === "flat" ? "Piatto" : cs === "shadow" ? "Ombra" : cs === "outline" ? "Bordo" : "Brutal"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// WIDGETS TAB
// ==========================================
function WidgetsTab({
  sortedWidgets,
  addingWidget,
  setAddingWidget,
  editingWidgetId,
  setEditingWidgetId,
  addWidget,
  updateWidget,
  deleteWidget,
  cycleSize,
  handleDragEnd,
  sensors,
  widgetOverrides,
  onWidgetEditChange,
}: {
  sortedWidgets: Widget[];
  addingWidget: WidgetType | null;
  setAddingWidget: (v: WidgetType | null) => void;
  editingWidgetId: string | null;
  setEditingWidgetId: (v: string | null) => void;
  addWidget: (type: WidgetType, data: Record<string, string>) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  deleteWidget: (id: string) => void;
  cycleSize: (id: string, size: Widget["size"]) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  widgetOverrides: Record<string, Partial<Widget>>;
  onWidgetEditChange: (widgetId: string, data: Partial<Widget> | null) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Widget ({sortedWidgets.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {(["link", "social", "text", "map"] as WidgetType[]).map((type) => (
            <button
              key={type}
              onClick={() => setAddingWidget(addingWidget === type ? null : type)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                addingWidget === type
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              <IconPlus className="h-3.5 w-3.5" />
              {WIDGET_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {addingWidget && (
        <WidgetForm
          type={addingWidget}
          onSubmit={(data) => addWidget(addingWidget, data)}
          onCancel={() => setAddingWidget(null)}
        />
      )}

      {sortedWidgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            Nessun widget. Aggiungi un widget per iniziare.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedWidgets.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedWidgets.map((widget) => (
                <SortableWidgetItem
                  key={widget.id}
                  widget={widget}
                  isEditing={editingWidgetId === widget.id}
                  editData={widgetOverrides[widget.id] || null}
                  onEditChange={(data) => onWidgetEditChange(widget.id, data)}
                  onEdit={() => {
                    setEditingWidgetId(widget.id);
                    onWidgetEditChange(widget.id, { ...widget });
                  }}
                  onCancelEdit={() => {
                    setEditingWidgetId(null);
                    onWidgetEditChange(widget.id, null);
                  }}
                  onSaveEdit={(updates) => updateWidget(widget.id, updates)}
                  onDelete={() => deleteWidget(widget.id)}
                  onCycleSize={() => cycleSize(widget.id, widget.size)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ==========================================
// SORTABLE WIDGET ITEM
// ==========================================
function SortableWidgetItem({
  widget,
  isEditing,
  editData,
  onEditChange,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onCycleSize,
}: {
  widget: Widget;
  isEditing: boolean;
  editData: Partial<Widget> | null;
  onEditChange: (data: Partial<Widget> | null) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updates: Partial<Widget>) => void;
  onDelete: () => void;
  onCycleSize: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const setEditData = (updater: Partial<Widget> | ((prev: Partial<Widget>) => Partial<Widget>)) => {
    if (typeof updater === "function") {
      onEditChange(updater(editData || {}));
    } else {
      onEditChange(updater);
    }
  };

  if (isEditing && editData) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border border-zinc-300 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/30"
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Modifica {WIDGET_TYPE_LABELS[widget.type]}
          </h4>
          <div className="flex gap-1">
            <button
              onClick={() => onSaveEdit(editData || {})}
              className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <IconCheck className="h-3.5 w-3.5" /> Salva
            </button>
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
            >
              <IconX className="h-3.5 w-3.5" /> Annulla
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(widget.type === "link" || widget.type === "text") && (
            <div>
              <label className={labelClass}>Titolo</label>
              <input
                value={editData.title || ""}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className={inputClass}
              />
            </div>
          )}
          {widget.type === "link" && (
            <>
              <div>
                <label className={labelClass}>URL</label>
                <input
                  value={editData.url || ""}
                  onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Descrizione</label>
                <input
                  value={editData.description || ""}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className={inputClass}
                />
              </div>
            </>
          )}
          {widget.type === "social" && (
            <>
              <div>
                <label className={labelClass}>Piattaforma</label>
                <select
                  value={editData.platform || ""}
                  onChange={(e) => setEditData({ ...editData, platform: e.target.value as SocialPlatform })}
                  className={inputClass}
                >
                  {Object.keys(SOCIAL_ICONS).map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Username</label>
                <input
                  value={editData.username || ""}
                  onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>URL profilo</label>
                <input
                  value={editData.url || ""}
                  onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                  className={inputClass}
                />
              </div>
            </>
          )}
          {widget.type === "text" && (
            <div className="sm:col-span-2">
              <label className={labelClass}>Contenuto</label>
              <textarea
                value={editData.content || ""}
                onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </div>
          )}
          {widget.type === "map" && (
            <>
              <div className="sm:col-span-2">
                <label className={labelClass}>Link Google Maps</label>
                <input
                  value={editData.url || ""}
                  onChange={(e) => {
                    const url = e.target.value;
                    setEditData((prev) => ({ ...prev, url }));
                    // Try local parsing on full URLs typed/pasted
                    const coords = parseMapsUrl(url);
                    if (coords) {
                      setEditData((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (!pasted) return;
                    const coords = parseMapsUrl(pasted);
                    if (coords) {
                      setTimeout(() => setEditData((prev) => ({ ...prev, url: pasted, lat: coords.lat, lng: coords.lng })), 0);
                      return;
                    }
                    if (pasted.includes("goo.gl") || pasted.includes("maps.app") || pasted.includes("google.com/maps")) {
                      fetch("/api/resolve-maps-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: pasted }),
                      })
                        .then((res) => res.ok ? res.json() : null)
                        .then((data) => {
                          if (data?.lat != null && data?.lng != null) {
                            setEditData((prev) => ({ ...prev, lat: data.lat, lng: data.lng }));
                          }
                        })
                        .catch(() => {});
                    }
                  }}
                  onBlur={() => {
                    const url = editData.url;
                    if (!url) return;
                    // If lat/lng are still default or missing, try resolving
                    const coords = parseMapsUrl(url);
                    if (coords) {
                      setEditData((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
                      return;
                    }
                    if (url.includes("goo.gl") || url.includes("maps.app") || url.includes("google.com/maps")) {
                      fetch("/api/resolve-maps-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url }),
                      })
                        .then((res) => res.ok ? res.json() : null)
                        .then((data) => {
                          if (data?.lat != null && data?.lng != null) {
                            setEditData((prev) => ({ ...prev, lat: data.lat, lng: data.lng }));
                          }
                        })
                        .catch(() => {});
                    }
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Etichetta</label>
                <input
                  value={editData.mapLabel || ""}
                  onChange={(e) => setEditData({ ...editData, mapLabel: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Latitudine</label>
                <input
                  type="number"
                  step="any"
                  value={editData.lat ?? ""}
                  onChange={(e) => setEditData({ ...editData, lat: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className={inputClass}
                  placeholder="45.3520"
                />
              </div>
              <div>
                <label className={labelClass}>Longitudine</label>
                <input
                  type="number"
                  step="any"
                  value={editData.lng ?? ""}
                  onChange={(e) => setEditData({ ...editData, lng: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className={inputClass}
                  placeholder="10.9844"
                />
              </div>
            </>
          )}
          <div>
            <label className={labelClass}>Dimensione</label>
            <select
              value={editData.size || widget.size}
              onChange={(e) => setEditData({ ...editData, size: e.target.value as Widget["size"] })}
              className={inputClass}
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Altezza (righe)</label>
            <select
              value={editData.rowSpan ?? ""}
              onChange={(e) => setEditData({ ...editData, rowSpan: e.target.value ? Number(e.target.value) : undefined })}
              className={inputClass}
            >
              <option value="">Auto</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Immagine brand</label>
            <select
              value={editData.brandImage || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  setEditData({ ...editData, brandImage: val, icon: null as any });
                } else {
                  setEditData({ ...editData, brandImage: null as any });
                }
              }}
              className={inputClass}
            >
              <option value="">Nessuna</option>
              {BRAND_IMAGES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Icona</label>
            <IconPicker
              value={editData.icon || ""}
              onChange={(v) => setEditData({ ...editData, icon: v || (null as any), brandImage: v ? (null as any) : editData.brandImage })}
            />
          </div>
          <div>
            <label className={labelClass}>Sfondo</label>
            <input
              type="color"
              value={editData.bgColor || "#18181b"}
              onChange={(e) => setEditData({ ...editData, bgColor: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className={labelClass}>Colore testo</label>
            <input
              type="color"
              value={editData.textColor || "#ffffff"}
              onChange={(e) => setEditData({ ...editData, textColor: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 text-zinc-400 hover:text-zinc-600 active:cursor-grabbing dark:hover:text-zinc-200"
      >
        <IconGripVertical className="h-4 w-4" />
      </button>
      {widget.bgColor && (
        <div
          className="h-7 w-7 shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700"
          style={{ backgroundColor: widget.bgColor }}
        />
      )}
      {widget.brandImage ? (
        <Image src={widget.brandImage} alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded object-contain" />
      ) : widget.icon ? (
        <IconRenderer name={widget.icon} className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-white">
          {widget.type === "social"
            ? `${widget.platform} — @${widget.username}`
            : widget.type === "map"
              ? widget.mapLabel || "Mappa"
              : widget.title || widget.content?.slice(0, 50) || "Widget"}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {widget.type === "link" && widget.url}
          {widget.type === "text" && widget.content?.slice(0, 60)}
          {widget.type === "social" && widget.url}
          {widget.type === "map" && `${widget.lat?.toFixed(4)}, ${widget.lng?.toFixed(4)}`}
        </p>
      </div>
      <button
        onClick={onCycleSize}
        className="shrink-0 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        title="Clicca per cambiare dimensione"
      >
        {SIZE_OPTIONS.find((s) => s.value === widget.size)?.label || widget.size}
      </button>
      <button
        onClick={onEdit}
        className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <IconEdit className="h-4 w-4" />
      </button>
      <button
        onClick={onDelete}
        className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
      >
        <IconTrash className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==========================================
// ICON PICKER
// ==========================================
function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = AVAILABLE_ICONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(inputClass, "flex items-center gap-2 text-left")}
      >
        {value ? (
          <>
            <IconRenderer name={value} className="h-4 w-4" />
            <span className="truncate text-xs">{value.replace("Icon", "")}</span>
          </>
        ) : (
          <span className="text-zinc-400">Nessuna icona</span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca icona..."
            className="mb-2 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
            autoFocus
          />
          <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 hover:bg-zinc-50 dark:border-zinc-600"
            >
              <IconX className="h-3 w-3" />
            </button>
            {filtered.map((name) => (
              <button
                key={name}
                onClick={() => { onChange(name); setOpen(false); }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  value === name
                    ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700",
                )}
                title={name.replace("Icon", "")}
              >
                <IconRenderer name={name} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// WIDGET FORM (NEW)
// ==========================================
function WidgetForm({
  type,
  onSubmit,
  onCancel,
}: {
  type: WidgetType;
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [icon, setIcon] = useState("");
  const [brandImage, setBrandImage] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => (data[k] = v as string));
    if (icon) data.icon = icon;
    if (brandImage) data.brandImage = brandImage;
    onSubmit(data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-xl border border-zinc-300 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-800/30"
    >
      <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
        Nuovo: {WIDGET_TYPE_LABELS[type]}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {type === "link" && (
          <>
            <div>
              <label className={labelClass}>Titolo</label>
              <input name="title" required className={inputClass} placeholder="Il mio sito" />
            </div>
            <div>
              <label className={labelClass}>URL</label>
              <input name="url" type="url" required className={inputClass} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Descrizione</label>
              <input name="description" className={inputClass} placeholder="Opzionale" />
            </div>
          </>
        )}
        {type === "social" && (
          <>
            <div>
              <label className={labelClass}>Piattaforma</label>
              <select name="platform" required className={inputClass}>
                {Object.keys(SOCIAL_ICONS).map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Username</label>
              <input name="username" required className={inputClass} placeholder="@username" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>URL profilo</label>
              <input name="url" type="url" required className={inputClass} placeholder="https://..." />
            </div>
          </>
        )}
        {type === "text" && (
          <>
            <div className="sm:col-span-2">
              <label className={labelClass}>Titolo</label>
              <input name="title" className={inputClass} placeholder="Opzionale" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Contenuto</label>
              <textarea name="content" required rows={3} className={inputClass} />
            </div>
          </>
        )}
        {type === "map" && (
          <>
            <div className="sm:col-span-2">
              <label className={labelClass}>Link Google Maps</label>
              <input name="mapsUrl" required className={inputClass} placeholder="https://maps.google.com/... o link abbreviato" />
              <p className="mt-1 text-xs text-zinc-500">Incolla qualsiasi link di Google Maps (anche abbreviato). Le coordinate verranno estratte automaticamente.</p>
            </div>
            <div>
              <label className={labelClass}>Etichetta</label>
              <input name="mapLabel" className={inputClass} placeholder="La mia sede" />
            </div>
          </>
        )}
        <div>
          <label className={labelClass}>Dimensione</label>
          <select
            name="size"
            defaultValue={type === "social" ? "small" : type === "text" ? "large" : "wide"}
            className={inputClass}
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Altezza (righe)</label>
          <select name="rowSpan" className={inputClass}>
            <option value="">Auto</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Immagine brand</label>
          <select
            value={brandImage}
            onChange={(e) => {
              setBrandImage(e.target.value);
              if (e.target.value) setIcon("");
            }}
            className={inputClass}
          >
            <option value="">Nessuna</option>
            {BRAND_IMAGES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Icona</label>
          <IconPicker value={icon} onChange={(v) => { setIcon(v); if (v) setBrandImage(""); }} />
        </div>
        <div>
          <label className={labelClass}>Sfondo</label>
          <input name="bgColor" type="color" defaultValue="#18181b" className="h-9 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800" />
        </div>
        <div>
          <label className={labelClass}>Colore testo</label>
          <input name="textColor" type="color" defaultValue="#ffffff" className="h-9 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
          Aggiungi
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
          Annulla
        </button>
      </div>
    </form>
  );
}

// ==========================================
// HELPERS
// ==========================================
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-mono text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
      </div>
    </div>
  );
}

const THEME_PRESETS = [
  { name: "Dark", accent: "#3b82f6", style: { bgColor: "#09090b", textColor: "#ffffff", subtextColor: "#a1a1aa", widgetBgColor: "#18181b", widgetBorderColor: "#27272a", widgetTextColor: "#ffffff" } },
  { name: "Light", accent: "#3b82f6", style: { bgColor: "#f4f4f5", textColor: "#18181b", subtextColor: "#71717a", widgetBgColor: "#ffffff", widgetBorderColor: "#e4e4e7", widgetTextColor: "#18181b" } },
  { name: "Midnight", accent: "#8b5cf6", style: { bgColor: "#0f0b1a", textColor: "#e2e0f0", subtextColor: "#8b85a8", widgetBgColor: "#1a1528", widgetBorderColor: "#2d2640", widgetTextColor: "#e2e0f0" } },
  { name: "Forest", accent: "#10b981", style: { bgColor: "#0a1a14", textColor: "#d1fae5", subtextColor: "#6ee7b7", widgetBgColor: "#112320", widgetBorderColor: "#1a3a30", widgetTextColor: "#d1fae5" } },
  { name: "Warm", accent: "#f59e0b", style: { bgColor: "#1c1410", textColor: "#fef3c7", subtextColor: "#d4a574", widgetBgColor: "#292018", widgetBorderColor: "#3d3020", widgetTextColor: "#fef3c7" } },
  { name: "Rose", accent: "#f43f5e", style: { bgColor: "#1a0a10", textColor: "#fce7f3", subtextColor: "#f9a8d4", widgetBgColor: "#26101a", widgetBorderColor: "#3d1a28", widgetTextColor: "#fce7f3" } },
];

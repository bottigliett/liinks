"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Client } from "@/lib/types";
import { CLIENT_TEMPLATES, ClientTemplate } from "@/lib/brands";
import Image from "next/image";
import {
  IconPlus,
  IconTrash,
  IconExternalLink,
  IconLogout,
  IconEdit,
  IconCopy,
  IconTemplate,
  IconFilePlus,
  IconArrowLeft,
  IconKey,
  IconEye,
  IconClick,
  IconUsers,
  IconChartBar,
  IconPhone,
  IconMail,
  IconCalendar,
} from "@tabler/icons-react";
import { RichBioEditor } from "@/components/admin/rich-bio-editor";

type CreationMode = null | "choose" | "template" | "clone" | "custom";

interface TemplateFieldValues {
  phone: string;
  email: string;
  instagramUrl: string;
  siteUrl: string;
  googleReviewUrl: string;
  mapsUrl: string;
  mapLabel: string;
}

const defaultTemplateFields: TemplateFieldValues = {
  phone: "",
  email: "",
  instagramUrl: "",
  siteUrl: "",
  googleReviewUrl: "",
  mapsUrl: "",
  mapLabel: "La nostra sede",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function generateReviewUrlFromMapsUrl(mapsUrl: string): string | null {
  // Extract CID from Google Maps URL (pattern: 0x[hex]:0x[hex_cid])
  const cidMatch = mapsUrl.match(/0x[0-9a-fA-F]+:0x([0-9a-fA-F]+)/);
  if (!cidMatch) return null;
  try {
    const cid = BigInt("0x" + cidMatch[1]);
    // Encode as protobuf: field 1 (fixed64) = CID, field 2 (varint) = 19
    const buf = new Uint8Array(11);
    buf[0] = 0x09;
    let val = cid;
    for (let i = 1; i <= 8; i++) {
      buf[i] = Number(val & 0xffn);
      val >>= 8n;
    }
    buf[9] = 0x10;
    buf[10] = 0x13;
    // Base64url encode without padding
    const base64 = btoa(String.fromCharCode(...buf))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return `https://g.page/r/${base64}/review`;
  } catch {
    return null;
  }
}

function parseMapsUrl(url: string): { lat: number; lng: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  const placeMatch = url.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  return null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ClientTemplate | null>(null);
  const [cloneSourceId, setCloneSourceId] = useState<string>("");
  const [templateFields, setTemplateFields] = useState<TemplateFieldValues>(defaultTemplateFields);
  const [loading, setLoading] = useState(true);
  const [clientAnalytics, setClientAnalytics] = useState<Record<string, { pageViews: number; uniqueVisitors: number; widgetClicks: number }>>({});
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formBio, setFormBio] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [instagramManuallyEdited, setInstagramManuallyEdited] = useState(false);
  const [reviewManuallyEdited, setReviewManuallyEdited] = useState(false);
  const [resolvingMaps, setResolvingMaps] = useState(false);
  const [reviewResolveFailed, setReviewResolveFailed] = useState(false);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    if (res.ok) {
      const data: Client[] = await res.json();
      setClients(data);
      // Fetch analytics for each client in parallel
      const analyticsPromises = data.map(async (c) => {
        try {
          const r = await fetch(`/api/clients/${c.id}/analytics`);
          if (r.ok) {
            const a = await r.json();
            return [c.id, { pageViews: a.metrics.pageViews, uniqueVisitors: a.metrics.uniqueVisitors, widgetClicks: a.metrics.widgetClicks }] as const;
          }
        } catch { /* ignore */ }
        return [c.id, { pageViews: 0, uniqueVisitors: 0, widgetClicks: 0 }] as const;
      });
      const results = await Promise.all(analyticsPromises);
      setClientAnalytics(Object.fromEntries(results));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/mismo/login");
    } else if (status === "authenticated") {
      fetchClients();
    }
  }, [status, router, fetchClients]);

  function handleNameChange(name: string) {
    setFormName(name);
    if (!slugManuallyEdited) {
      const slug = generateSlug(name);
      setFormSlug(slug);
      if (!instagramManuallyEdited && selectedTemplate) {
        setTemplateFields((p) => ({
          ...p,
          instagramUrl: slug ? `https://www.instagram.com/${slug}/` : "",
        }));
      }
    }
  }

  function handleSlugChange(slug: string) {
    setFormSlug(slug);
    setSlugManuallyEdited(true);
    if (!instagramManuallyEdited && selectedTemplate) {
      const cleanSlug = slug.replace(/[^a-z0-9]/g, "");
      setTemplateFields((p) => ({
        ...p,
        instagramUrl: cleanSlug ? `https://www.instagram.com/${cleanSlug}/` : "",
      }));
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: formName,
      slug: formSlug,
      bio: formBio,
      accentColor: form.get("accentColor") || "#18181b",
      phone: templateFields.phone,
      email: templateFields.email,
    };

    if (selectedTemplate) {
      // Set default avatar from template
      if (selectedTemplate.defaultAvatar) {
        payload.avatarUrl = selectedTemplate.defaultAvatar;
      }
      // Fill widget URLs from template fields
      const filledWidgets = selectedTemplate.widgets.map((w) => {
        const copy = { ...w };
        if (w.title === "Salva contatto") {
          // vCard URL is set server-side
        } else if (w.type === "map") {
          copy.url = templateFields.mapsUrl;
          copy.mapLabel = templateFields.mapLabel || w.mapLabel;
        } else if (w.title?.toLowerCase().includes("instagram")) {
          copy.url = templateFields.instagramUrl;
        } else if (w.title?.toLowerCase().includes("recensione")) {
          copy.url = templateFields.googleReviewUrl;
        } else if (w.title?.toLowerCase().includes("casa") || w.title?.toLowerCase().includes("immobili")) {
          copy.url = templateFields.siteUrl;
        }
        return copy;
      });

      // Resolve coordinates for map widgets
      for (const w of filledWidgets) {
        if (w.type === "map" && w.url) {
          let coords = parseMapsUrl(w.url);
          if (!coords) {
            try {
              const res = await fetch("/api/resolve-maps-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: w.url }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data?.lat != null && data?.lng != null) {
                  coords = { lat: data.lat, lng: data.lng };
                }
              }
            } catch { /* ignore */ }
          }
          if (coords) {
            w.lat = coords.lat;
            w.lng = coords.lng;
          }
        }
      }

      payload.templateWidgets = filledWidgets;
    } else if (cloneSourceId) {
      payload.cloneFromId = cloneSourceId;
    }

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setCreationMode(null);
      setSelectedTemplate(null);
      setCloneSourceId("");
      setTemplateFields(defaultTemplateFields);
      setFormName("");
      setFormSlug("");
      setFormBio("");
      setSlugManuallyEdited(false);
      setInstagramManuallyEdited(false);
      setReviewManuallyEdited(false);
      fetchClients();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo cliente?")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) fetchClients();
  }

  function openCreation() {
    setCreationMode("choose");
    setSelectedTemplate(null);
    setCloneSourceId("");
    setTemplateFields(defaultTemplateFields);
    setFormName("");
    setFormSlug("");
    setFormBio("");
    setSlugManuallyEdited(false);
    setInstagramManuallyEdited(false);
    setReviewManuallyEdited(false);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Caricamento...</p>
      </div>
    );
  }

  if (!session) return null;

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white";
  const labelClass =
    "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/logo_liinks.svg" alt="Liinks" width={80} height={35} className="h-7 w-auto" />
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              v0.2 Beta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/mismo/api-keys")}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <IconKey className="h-4 w-4" />
              API Keys
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/mismo/login" })}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <IconLogout className="h-4 w-4" />
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Clienti
          </h2>
          <button
            onClick={openCreation}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <IconPlus className="h-4 w-4" />
            Nuovo cliente
          </button>
        </div>

        {/* Creation flow */}
        {creationMode === "choose" && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Come vuoi creare il nuovo cliente?
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setCreationMode("template")}
                className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-6 text-center transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-700 dark:hover:border-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <IconTemplate className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Da template</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Scegli tra Tecnocasa, Tecnorete, Industriale
                  </p>
                </div>
              </button>
              <button
                onClick={() => setCreationMode("clone")}
                disabled={clients.length === 0}
                className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-6 text-center transition-all hover:border-zinc-900 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:border-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <IconCopy className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Da cliente esistente</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Copia i widget da un altro cliente
                  </p>
                </div>
              </button>
              <button
                onClick={() => setCreationMode("custom")}
                className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-6 text-center transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-700 dark:hover:border-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <IconFilePlus className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Personalizzato</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Crea da zero con i widget di default
                  </p>
                </div>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setCreationMode(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Template selection */}
        {creationMode === "template" && !selectedTemplate && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setCreationMode("choose")}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconArrowLeft className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Scegli un template
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {CLIENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    if (!formName) {
                      const name = tpl.name.toUpperCase() + " ";
                      setFormName(name);
                      const slug = generateSlug(name);
                      if (!slugManuallyEdited) {
                        setFormSlug(slug);
                        if (!instagramManuallyEdited) {
                          setTemplateFields((p) => ({
                            ...p,
                            instagramUrl: slug ? `https://www.instagram.com/${slug}/` : "",
                          }));
                        }
                      }
                    } else if (formSlug && !instagramManuallyEdited) {
                      setTemplateFields((p) => ({
                        ...p,
                        instagramUrl: `https://www.instagram.com/${formSlug}/`,
                      }));
                    }
                  }}
                  className="flex flex-col rounded-xl border border-zinc-200 p-5 text-left transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-700 dark:hover:border-white"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{tpl.name}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{tpl.description}</p>
                  <p className="mt-3 text-xs text-zinc-400">{tpl.widgets.length} widget</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setCreationMode("choose")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Indietro
              </button>
            </div>
          </div>
        )}

        {/* Clone selection */}
        {creationMode === "clone" && !cloneSourceId && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setCreationMode("choose")}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconArrowLeft className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Scegli il cliente da copiare
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCloneSourceId(c.id)}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-700 dark:hover:border-white"
                >
                  {c.avatarUrl ? (
                    <Image src={c.avatarUrl} alt={c.name} width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: c.accentColor }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.widgets.length} widget</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setCreationMode("choose")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Indietro
              </button>
            </div>
          </div>
        )}

        {/* Actual creation form — shown after choosing mode */}
        {(creationMode === "custom" || selectedTemplate || cloneSourceId) && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedTemplate) {
                    setSelectedTemplate(null);
                  } else if (cloneSourceId) {
                    setCloneSourceId("");
                  } else {
                    setCreationMode("choose");
                  }
                }}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconArrowLeft className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Nuovo cliente
                {selectedTemplate && (
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    — Template {selectedTemplate.name}
                  </span>
                )}
                {cloneSourceId && (
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    — Copia da {clients.find((c) => c.id === cloneSourceId)?.name}
                  </span>
                )}
              </h3>
            </div>

            {/* Client info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nome</label>
                <input
                  name="name"
                  required
                  className={inputClass}
                  placeholder="Tecnocasa Vigasio"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">/</span>
                  <input
                    name="slug"
                    required
                    pattern="[a-z0-9\-]+"
                    className={inputClass}
                    placeholder="tecnocasavigasio"
                    value={formSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                  />
                </div>
                {formSlug && (
                  <p className="mt-1 text-xs text-zinc-400">
                    URL: /{formSlug}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Bio</label>
                <RichBioEditor
                  value={formBio}
                  onChange={(v) => setFormBio(v)}
                />
              </div>
              <div>
                <label className={labelClass}>Colore accento</label>
                <input
                  name="accentColor"
                  type="color"
                  defaultValue="#18181b"
                  className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-1 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            </div>

            {/* Template-specific fields */}
            {selectedTemplate && (
              <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <h4 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
                  Informazioni per i widget
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Telefono (per vCard)</label>
                    <input
                      value={templateFields.phone}
                      onChange={(e) => setTemplateFields((p) => ({ ...p, phone: e.target.value }))}
                      className={inputClass}
                      placeholder="+39 333 1234567"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email (per vCard)</label>
                    <input
                      value={templateFields.email}
                      onChange={(e) => setTemplateFields((p) => ({ ...p, email: e.target.value }))}
                      className={inputClass}
                      placeholder="info@esempio.it"
                      type="email"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Link Google Maps</label>
                    <input
                      value={templateFields.mapsUrl}
                      onChange={(e) => {
                        const mapsUrl = e.target.value;
                        setTemplateFields((p) => ({ ...p, mapsUrl }));
                        // Try instant local CID extraction
                        if (mapsUrl && !reviewManuallyEdited) {
                          const localReviewUrl = generateReviewUrlFromMapsUrl(mapsUrl);
                          if (localReviewUrl) {
                            setTemplateFields((p) => ({ ...p, googleReviewUrl: localReviewUrl }));
                          }
                        }
                      }}
                      onPaste={(e) => {
                        // Get pasted text and resolve review URL
                        const pasted = e.clipboardData.getData("text");
                        if (!pasted || reviewManuallyEdited) return;
                        setReviewResolveFailed(false);
                        // Try local first
                        const localReviewUrl = generateReviewUrlFromMapsUrl(pasted);
                        if (localReviewUrl) {
                          setTimeout(() => setTemplateFields((p) => ({ ...p, googleReviewUrl: localReviewUrl })), 0);
                          return;
                        }
                        // Otherwise resolve server-side
                        if (pasted.includes("google") || pasted.includes("goo.gl") || pasted.includes("maps.app")) {
                          setResolvingMaps(true);
                          fetch("/api/resolve-maps-url", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: pasted }),
                          })
                            .then((res) => res.ok ? res.json() : null)
                            .then((data) => {
                              if (data?.reviewUrl) {
                                setTemplateFields((p) => ({ ...p, googleReviewUrl: data.reviewUrl }));
                              } else {
                                setReviewResolveFailed(true);
                              }
                            })
                            .catch(() => { setReviewResolveFailed(true); })
                            .finally(() => setResolvingMaps(false));
                        }
                      }}
                      onBlur={() => {
                        // Fallback: if review URL still empty, try resolving
                        const mapsUrl = templateFields.mapsUrl;
                        if (!mapsUrl || reviewManuallyEdited || templateFields.googleReviewUrl) return;
                        setReviewResolveFailed(false);
                        if (mapsUrl.includes("google") || mapsUrl.includes("goo.gl") || mapsUrl.includes("maps.app")) {
                          setResolvingMaps(true);
                          fetch("/api/resolve-maps-url", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: mapsUrl }),
                          })
                            .then((res) => res.ok ? res.json() : null)
                            .then((data) => {
                              if (data?.reviewUrl) {
                                setTemplateFields((p) => ({ ...p, googleReviewUrl: data.reviewUrl }));
                              } else {
                                setReviewResolveFailed(true);
                              }
                            })
                            .catch(() => { setReviewResolveFailed(true); })
                            .finally(() => setResolvingMaps(false));
                        }
                      }}
                      className={inputClass}
                      placeholder="https://maps.google.com/..."
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      Incolla il link di Google Maps — il link recensione verrà generato automaticamente
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Etichetta mappa</label>
                    <input
                      value={templateFields.mapLabel}
                      onChange={(e) => setTemplateFields((p) => ({ ...p, mapLabel: e.target.value }))}
                      className={inputClass}
                      placeholder="La nostra sede"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Link Instagram</label>
                    <input
                      value={templateFields.instagramUrl}
                      onChange={(e) => {
                        setTemplateFields((p) => ({ ...p, instagramUrl: e.target.value }));
                        setInstagramManuallyEdited(true);
                      }}
                      className={inputClass}
                      placeholder="https://instagram.com/..."
                    />
                    {!instagramManuallyEdited && formSlug && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        Auto-generato dallo slug
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Link annunci immobiliari</label>
                    <input
                      value={templateFields.siteUrl}
                      onChange={(e) => setTemplateFields((p) => ({ ...p, siteUrl: e.target.value }))}
                      className={inputClass}
                      placeholder="https://www.tecnocasa.it/annunci/..."
                    />
                    <p className="mt-1 text-xs text-zinc-400">Link per &quot;Trova la tua nuova casa&quot;</p>
                  </div>
                  <div>
                    <label className={labelClass}>Link Google Review</label>
                    <input
                      value={templateFields.googleReviewUrl}
                      onChange={(e) => {
                        setTemplateFields((p) => ({ ...p, googleReviewUrl: e.target.value }));
                        setReviewManuallyEdited(true);
                      }}
                      className={inputClass}
                      placeholder="https://g.page/r/..."
                    />
                    {resolvingMaps && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Generazione link recensione in corso...
                      </p>
                    )}
                    {!resolvingMaps && reviewResolveFailed && !templateFields.googleReviewUrl && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                        Generazione automatica fallita — inserisci il link recensione manualmente
                      </p>
                    )}
                    {!reviewManuallyEdited && templateFields.googleReviewUrl && !resolvingMaps && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        Auto-generato dal link Maps
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Crea
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreationMode(null);
                  setSelectedTemplate(null);
                  setCloneSourceId("");
                  setTemplateFields(defaultTemplateFields);
                  setFormName("");
                  setFormSlug("");
                  setFormBio("");
                  setSlugManuallyEdited(false);
                  setInstagramManuallyEdited(false);
                            }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Annulla
              </button>
            </div>
          </form>
        )}

        {/* Client list */}
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400">
              Nessun cliente. Crea il tuo primo cliente per iniziare.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {clients.map((client) => {
              const analytics = clientAnalytics[client.id];
              return (
                <div
                  key={client.id}
                  className="group flex h-[320px] flex-col rounded-xl border border-zinc-200 bg-white transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-4 p-5 pb-0">
                    {client.avatarUrl ? (
                      <Image
                        src={client.avatarUrl}
                        alt={client.name}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                        style={{ backgroundColor: client.accentColor }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                          {client.name}
                        </h3>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="shrink-0 rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                          title="Elimina"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        /{client.slug} &middot; {client.widgets.length} widget
                      </p>
                    </div>
                  </div>

                  {/* Info block */}
                  <div className="min-h-0 flex-1 px-5 pt-4">
                    {client.bio && (
                      <div
                        className="mb-3 h-10 overflow-hidden text-sm text-zinc-500 dark:text-zinc-400"
                        dangerouslySetInnerHTML={{ __html: client.bio }}
                      />
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <IconPhone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      )}
                      {client.email && (
                        <span className="flex items-center gap-1">
                          <IconMail className="h-3 w-3" />
                          {client.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <IconCalendar className="h-3 w-3" />
                        {new Date(client.createdAt).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                  </div>

                  {/* Mini analytics */}
                  <div className="mx-5 mt-auto grid grid-cols-3 gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <IconEye className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {analytics?.pageViews ?? "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">Visite</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <IconUsers className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {analytics?.uniqueVisitors ?? "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">Unici</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <IconClick className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {analytics?.widgetClicks ?? "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">Click</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2 px-5 pb-5 pt-4">
                    <button
                      onClick={() => router.push(`/mismo/clients/${client.id}`)}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      Modifica
                    </button>
                    <button
                      onClick={() => router.push(`/mismo/clients/${client.id}/insights`)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <IconChartBar className="h-3.5 w-3.5" />
                      Insights
                    </button>
                    <a
                      href={`/${client.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <IconExternalLink className="h-3.5 w-3.5" />
                      Apri
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

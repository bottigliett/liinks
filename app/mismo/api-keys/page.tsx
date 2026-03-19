"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconKey,
} from "@tabler/icons-react";

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/crm/keys");
    if (res.ok) setKeys(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/mismo/login");
    else if (status === "authenticated") fetchKeys();
  }, [status, router, fetchKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/crm/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName || "API Key" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKeyValue(data.key);
      setNewKeyName("");
      fetchKeys();
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Sei sicuro di voler revocare questa API key?")) return;
    await fetch("/api/crm/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Caricamento...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push("/mismo")}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <IconArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <IconKey className="h-5 w-5 text-zinc-500" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Gestione API Keys
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* New key alert */}
        {newKeyValue && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
              Nuova API Key creata — copiala adesso, non sarà più visibile!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-xs font-mono text-zinc-900 dark:bg-zinc-900 dark:text-white">
                {newKeyValue}
              </code>
              <button
                onClick={() => copyToClipboard(newKeyValue)}
                className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {copied ? <IconCheck className="h-4 w-4 text-green-500" /> : <IconCopy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => setNewKeyValue(null)}
              className="mt-2 text-xs text-amber-600 underline dark:text-amber-400"
            >
              Ho copiato la key, chiudi
            </button>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="mb-6 flex gap-2">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Nome API key (opzionale)"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
          />
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <IconPlus className="h-4 w-4" />
            Crea
          </button>
        </form>

        {/* Keys list */}
        {keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <IconKey className="mx-auto mb-4 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-500 dark:text-zinc-400">
              Nessuna API key. Creane una per integrare con CRM esterni.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {key.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <code>{key.prefix}...</code> — Creata il{" "}
                    {new Date(key.createdAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                  title="Revoca"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Usage info */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
            Come usare le API
          </h3>
          <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <p>Usa l&apos;header <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Authorization: Bearer YOUR_API_KEY</code></p>
            <p><strong>Clienti:</strong> <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">GET /api/crm/clients</code></p>
            <p><strong>Analytics:</strong> <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">GET /api/crm/analytics?clientId=...</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  IconArrowLeft,
  IconEye,
  IconUsers,
  IconClick,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconDeviceTablet,
} from "@tabler/icons-react";

interface Analytics {
  clientId: string;
  period: { from: string; to: string };
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    widgetClicks: number;
    topWidgets: { widgetId: string; clicks: number }[];
    deviceBreakdown: { device: string; count: number }[];
    referrers: { referrer: string; count: number }[];
    dailyStats: { date: string; views: number; clicks: number }[];
  };
}

const DEVICE_ICONS: Record<string, typeof IconDeviceMobile> = {
  mobile: IconDeviceMobile,
  desktop: IconDeviceDesktop,
  tablet: IconDeviceTablet,
};

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");

  const fetchData = useCallback(async () => {
    const [analyticsRes, clientRes] = await Promise.all([
      fetch(`/api/clients/${clientId}/analytics`),
      fetch(`/api/clients/${clientId}`),
    ]);
    if (analyticsRes.ok) {
      setAnalytics(await analyticsRes.json());
    }
    if (clientRes.ok) {
      const c = await clientRes.json();
      setClientName(c.name);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/mismo/login");
    else if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Caricamento...</p>
      </div>
    );
  }

  if (!session || !analytics) return null;

  const m = analytics.metrics;
  const maxViews = Math.max(...m.dailyStats.map((d) => d.views), 1);
  const totalDevices = m.deviceBreakdown.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push(`/mismo/clients/${clientId}`)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <IconArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Insights — {clientName}
            </h1>
            <p className="text-xs text-zinc-500">Ultimi 30 giorni</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard icon={IconEye} label="Visite totali" value={m.pageViews} />
          <KpiCard icon={IconUsers} label="Visitatori unici" value={m.uniqueVisitors} />
          <KpiCard icon={IconClick} label="Click totali" value={m.widgetClicks} />
        </div>

        {/* Daily Chart */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
            Visite giornaliere
          </h3>
          {m.dailyStats.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessun dato disponibile</p>
          ) : (
            <div className="flex items-end gap-1" style={{ height: 200 }}>
              {m.dailyStats.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex-1"
                  style={{ height: "100%" }}
                >
                  <div className="absolute bottom-0 left-0 right-0 rounded-t bg-blue-500 transition-all group-hover:bg-blue-600"
                    style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: day.views > 0 ? 4 : 0 }}
                  />
                  <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white group-hover:block dark:bg-zinc-200 dark:text-zinc-900">
                    {day.date}: {day.views} visite
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Top Widgets */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
              Top Widget per click
            </h3>
            {m.topWidgets.length === 0 ? (
              <p className="text-sm text-zinc-500">Nessun click registrato</p>
            ) : (
              <div className="space-y-3">
                {m.topWidgets.map((w, i) => (
                  <div key={w.widgetId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {i + 1}
                      </span>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                        {w.widgetId.slice(0, 8)}...
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {w.clicks}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
              Dispositivi
            </h3>
            {m.deviceBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-500">Nessun dato</p>
            ) : (
              <div className="space-y-3">
                {m.deviceBreakdown.map((d) => {
                  const Icon = DEVICE_ICONS[d.device] || IconDeviceDesktop;
                  const pct = Math.round((d.count / totalDevices) * 100);
                  return (
                    <div key={d.device}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-zinc-500" />
                          <span className="text-sm capitalize text-zinc-700 dark:text-zinc-300">
                            {d.device}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Referrers */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
              Referrer principali
            </h3>
            {m.referrers.length === 0 ? (
              <p className="text-sm text-zinc-500">Nessun dato</p>
            ) : (
              <div className="space-y-3">
                {m.referrers.map((r) => (
                  <div key={r.referrer} className="flex items-center justify-between">
                    <span className="truncate text-sm text-zinc-700 dark:text-zinc-300 max-w-[180px]">
                      {r.referrer}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IconEye;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-zinc-500" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-zinc-900 dark:text-white">
        {value.toLocaleString("it-IT")}
      </p>
    </div>
  );
}

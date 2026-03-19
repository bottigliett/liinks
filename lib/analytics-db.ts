import { RowDataPacket, FieldPacket } from "mysql2/promise";
import { getPool, initDb } from "./db";

async function db() {
  await initDb();
  return getPool();
}

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua)) return "mobile";
  return "desktop";
}

export async function trackEvent(data: {
  clientId: string;
  type: string;
  widgetId?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  const pool = await db();
  const deviceType = data.userAgent ? detectDeviceType(data.userAgent) : "unknown";

  await pool.execute(
    `INSERT INTO events (client_id, event_type, widget_id, session_id, referrer, user_agent, device_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.clientId,
      data.type,
      data.widgetId || null,
      data.sessionId || null,
      data.referrer || null,
      data.userAgent || null,
      deviceType,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ],
  );
}

export interface AnalyticsResult {
  pageViews: number;
  uniqueVisitors: number;
  widgetClicks: number;
  topWidgets: { widgetId: string; clicks: number }[];
  deviceBreakdown: { device: string; count: number }[];
  referrers: { referrer: string; count: number }[];
  dailyStats: { date: string; views: number; clicks: number }[];
}

function toMySQLDatetime(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function getAnalytics(
  clientId: string,
  from: string,
  to: string,
  groupBy: "day" | "week" = "day",
): Promise<AnalyticsResult> {
  const pool = await db();
  // Convert ISO dates to local MySQL DATETIME format to avoid timezone mismatch
  from = toMySQLDatetime(from);
  to = toMySQLDatetime(to);

  const [pvRows] = await pool.execute(
    `SELECT COUNT(*) as count FROM events WHERE client_id = ? AND event_type = 'PAGE_VIEW' AND created_at >= ? AND created_at <= ?`,
    [clientId, from, to],
  ) as [RowDataPacket[], FieldPacket[]];

  const [uvRows] = await pool.execute(
    `SELECT COUNT(DISTINCT session_id) as count FROM events WHERE client_id = ? AND event_type = 'PAGE_VIEW' AND created_at >= ? AND created_at <= ?`,
    [clientId, from, to],
  ) as [RowDataPacket[], FieldPacket[]];

  const [wcRows] = await pool.execute(
    `SELECT COUNT(*) as count FROM events WHERE client_id = ? AND event_type = 'WIDGET_CLICK' AND created_at >= ? AND created_at <= ?`,
    [clientId, from, to],
  ) as [RowDataPacket[], FieldPacket[]];

  const [topWidgets] = await pool.execute(
    `SELECT widget_id as widgetId, COUNT(*) as clicks FROM events WHERE client_id = ? AND event_type = 'WIDGET_CLICK' AND widget_id IS NOT NULL AND created_at >= ? AND created_at <= ? GROUP BY widget_id ORDER BY clicks DESC LIMIT 10`,
    [clientId, from, to],
  ) as [RowDataPacket[], FieldPacket[]];

  const [deviceBreakdown] = await pool.execute(
    `SELECT device_type as device, COUNT(*) as count FROM events WHERE client_id = ? AND created_at >= ? AND created_at <= ? GROUP BY device_type ORDER BY count DESC`,
    [clientId, from, to],
  ) as [RowDataPacket[], FieldPacket[]];

  const [referrers] = await pool.execute(
    `SELECT COALESCE(referrer, 'Direct') as referrer, COUNT(*) as count FROM events WHERE client_id = ? AND event_type = 'PAGE_VIEW' AND created_at >= ? AND created_at <= ? GROUP BY referrer ORDER BY count DESC LIMIT 10`,
    [clientId, from, to],
  ) as [RowDataPacket[], FieldPacket[]];

  const dateFormat = groupBy === "week" ? "%Y-W%v" : "%Y-%m-%d";
  const [dailyStats] = await pool.execute(
    `SELECT DATE_FORMAT(created_at, '${dateFormat}') as date,
      SUM(CASE WHEN event_type = 'PAGE_VIEW' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN event_type = 'WIDGET_CLICK' THEN 1 ELSE 0 END) as clicks
    FROM events WHERE client_id = ? AND created_at >= ? AND created_at <= ?
    GROUP BY date ORDER BY date ASC`,
    [clientId, from, to],
  ) as [RowDataPacket[], FieldPacket[]];

  return {
    pageViews: pvRows[0].count,
    uniqueVisitors: uvRows[0].count,
    widgetClicks: wcRows[0].count,
    topWidgets: topWidgets as unknown as AnalyticsResult["topWidgets"],
    deviceBreakdown: deviceBreakdown as unknown as AnalyticsResult["deviceBreakdown"],
    referrers: referrers as unknown as AnalyticsResult["referrers"],
    dailyStats: (dailyStats as RowDataPacket[]).map((r) => ({
      date: r.date,
      views: Number(r.views),
      clicks: Number(r.clicks),
    })),
  };
}

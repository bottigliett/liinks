import { RowDataPacket, FieldPacket } from "mysql2/promise";
import { getPool, initDb } from "./db";
import { Client, Widget, DEFAULT_STYLE, ClientStyle } from "./types";

async function db() {
  await initDb();
  return getPool();
}

function rowToWidget(row: RowDataPacket): Widget {
  const w: Widget = {
    id: row.id,
    type: row.type,
    order: row.sort_order,
    size: row.size,
  };
  if (row.row_span != null) w.rowSpan = row.row_span;
  if (row.bg_color) w.bgColor = row.bg_color;
  if (row.text_color) w.textColor = row.text_color;
  if (row.icon) w.icon = row.icon;
  if (row.brand_image) w.brandImage = row.brand_image;
  if (row.title) w.title = row.title;
  if (row.url) w.url = row.url;
  if (row.description) w.description = row.description;
  if (row.platform) w.platform = row.platform;
  if (row.username) w.username = row.username;
  if (row.content) w.content = row.content;
  if (row.lat != null) w.lat = parseFloat(row.lat);
  if (row.lng != null) w.lng = parseFloat(row.lng);
  if (row.map_label) w.mapLabel = row.map_label;
  return w;
}

function rowToClient(row: RowDataPacket, widgets: Widget[]): Client {
  const style: ClientStyle = {
    ...DEFAULT_STYLE,
    ...(typeof row.style === "string" ? JSON.parse(row.style) : row.style || {}),
  };
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio || "",
    avatarUrl: row.avatar_url || "",
    phone: row.phone || "",
    email: row.email || "",
    accentColor: row.accent_color || "#3b82f6",
    style,
    widgets,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

async function getWidgetsForClient(clientId: string): Promise<Widget[]> {
  const pool = await db();
  const [rows] = await pool.execute(
    `SELECT * FROM widgets WHERE client_id = ? ORDER BY sort_order ASC`,
    [clientId],
  ) as [RowDataPacket[], FieldPacket[]];
  return rows.map(rowToWidget);
}

// Default template widgets for new clients
function getDefaultTemplateWidgets(clientId: string): Omit<Widget, "id" | "order">[] {
  return [
    {
      type: "link",
      title: "Salva contatto",
      url: `/api/clients/${clientId}/vcard`,
      size: "medium",
      brandImage: "/brands/contatti.svg",
    },
    {
      type: "map",
      lat: 45.0,
      lng: 10.0,
      mapLabel: "",
      size: "medium",
    },
    {
      type: "link",
      title: "Seguici su Instagram",
      url: "",
      size: "large",
      brandImage: "/brands/instagram.png",
    },
    {
      type: "link",
      title: "Trova la tua nuova casa",
      url: "",
      size: "large",
      brandImage: "/brands/logo-tecnocasa.jpg",
    },
    {
      type: "link",
      title: "Lascia una recensione",
      url: "",
      size: "large",
      brandImage: "/brands/google.png",
    },
  ];
}

// Create widgets from a template definition
export async function createWidgetsFromTemplate(
  clientId: string,
  templateWidgets: { type: string; title?: string; url?: string; size: string; icon?: string; brandImage?: string; bgColor?: string; textColor?: string; platform?: string; username?: string; lat?: number; lng?: number; mapLabel?: string; description?: string; content?: string; rowSpan?: number }[],
): Promise<Widget[]> {
  const pool = await db();
  const widgets: Widget[] = [];

  for (let i = 0; i < templateWidgets.length; i++) {
    const t = templateWidgets[i];
    const id = crypto.randomUUID();
    let url = t.url || null;
    if (t.title === "Salva contatto") {
      url = `/api/clients/${clientId}/vcard`;
    }

    await pool.execute(
      `INSERT INTO widgets (id, client_id, type, sort_order, size, row_span, bg_color, text_color, icon, brand_image, title, url, description, platform, username, content, lat, lng, map_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, clientId, t.type, i, t.size,
        t.rowSpan ?? null, t.bgColor || null, t.textColor || null,
        t.icon || null, t.brandImage || null, t.title || null,
        url, t.description || null, t.platform || null,
        t.username || null, t.content || null,
        t.lat ?? null, t.lng ?? null, t.mapLabel || null,
      ],
    );

    widgets.push({
      id,
      type: t.type as Widget["type"],
      order: i,
      size: t.size as Widget["size"],
      ...(t.rowSpan != null ? { rowSpan: t.rowSpan } : {}),
      ...(t.bgColor ? { bgColor: t.bgColor } : {}),
      ...(t.textColor ? { textColor: t.textColor } : {}),
      ...(t.icon ? { icon: t.icon } : {}),
      ...(t.brandImage ? { brandImage: t.brandImage } : {}),
      ...(t.title ? { title: t.title } : {}),
      ...(url ? { url } : {}),
      ...(t.description ? { description: t.description } : {}),
      ...(t.platform ? { platform: t.platform as Widget["platform"] } : {}),
      ...(t.username ? { username: t.username } : {}),
      ...(t.content ? { content: t.content } : {}),
      ...(t.lat != null ? { lat: t.lat } : {}),
      ...(t.lng != null ? { lng: t.lng } : {}),
      ...(t.mapLabel ? { mapLabel: t.mapLabel } : {}),
    });
  }

  return widgets;
}

// Client operations
export async function getClients(): Promise<Client[]> {
  const pool = await db();
  const [rows] = await pool.execute(`SELECT * FROM clients ORDER BY created_at DESC`) as [RowDataPacket[], FieldPacket[]];
  const clients: Client[] = [];
  for (const row of rows) {
    const widgets = await getWidgetsForClient(row.id);
    clients.push(rowToClient(row, widgets));
  }
  return clients;
}

export async function getClientBySlug(slug: string): Promise<Client | undefined> {
  const pool = await db();
  const [rows] = await pool.execute(`SELECT * FROM clients WHERE slug = ?`, [slug]) as [RowDataPacket[], FieldPacket[]];
  if (rows.length === 0) return undefined;
  const widgets = await getWidgetsForClient(rows[0].id);
  return rowToClient(rows[0], widgets);
}

export async function getClientById(id: string): Promise<Client | undefined> {
  const pool = await db();
  const [rows] = await pool.execute(`SELECT * FROM clients WHERE id = ?`, [id]) as [RowDataPacket[], FieldPacket[]];
  if (rows.length === 0) return undefined;
  const widgets = await getWidgetsForClient(rows[0].id);
  return rowToClient(rows[0], widgets);
}

export async function createClient(
  client: Omit<Client, "id" | "createdAt" | "updatedAt" | "widgets" | "style"> & {
    style?: Partial<Client["style"]>;
    templateWidgets?: Parameters<typeof createWidgetsFromTemplate>[1];
  },
): Promise<Client> {
  const pool = await db();
  const id = crypto.randomUUID();
  const { templateWidgets, ...clientData } = client;
  const style = { ...DEFAULT_STYLE, ...client.style };

  await pool.execute(
    `INSERT INTO clients (id, name, slug, bio, avatar_url, phone, email, accent_color, style)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, clientData.name, clientData.slug,
      clientData.bio || "", clientData.avatarUrl || "",
      clientData.phone || "", clientData.email || "",
      clientData.accentColor || "#3b82f6",
      JSON.stringify(style),
    ],
  );

  const widgets = templateWidgets
    ? await createWidgetsFromTemplate(id, templateWidgets)
    : await createWidgetsFromTemplate(id, getDefaultTemplateWidgets(id) as Parameters<typeof createWidgetsFromTemplate>[1]);

  const [rows] = await pool.execute(`SELECT * FROM clients WHERE id = ?`, [id]) as [RowDataPacket[], FieldPacket[]];
  return rowToClient(rows[0], widgets);
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<Client, "id" | "createdAt">>,
): Promise<Client | null> {
  const pool = await db();

  // Build dynamic SET clause
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.name !== undefined) { sets.push("name = ?"); values.push(updates.name); }
  if (updates.slug !== undefined) { sets.push("slug = ?"); values.push(updates.slug); }
  if (updates.bio !== undefined) { sets.push("bio = ?"); values.push(updates.bio ?? null); }
  if (updates.avatarUrl !== undefined) { sets.push("avatar_url = ?"); values.push(updates.avatarUrl ?? null); }
  if (updates.phone !== undefined) { sets.push("phone = ?"); values.push(updates.phone ?? null); }
  if (updates.email !== undefined) { sets.push("email = ?"); values.push(updates.email ?? null); }
  if (updates.accentColor !== undefined) { sets.push("accent_color = ?"); values.push(updates.accentColor); }
  if (updates.style !== undefined) { sets.push("style = ?"); values.push(JSON.stringify(updates.style)); }

  if (sets.length === 0) {
    return await getClientById(id) || null;
  }

  values.push(id);
  await pool.execute(`UPDATE clients SET ${sets.join(", ")} WHERE id = ?`, values);

  return await getClientById(id) || null;
}

export async function deleteClient(id: string): Promise<boolean> {
  const pool = await db();
  const [result] = await pool.execute(`DELETE FROM clients WHERE id = ?`, [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Widget operations
export async function addWidget(
  clientId: string,
  widget: Omit<Widget, "id" | "order">,
): Promise<Widget | null> {
  const pool = await db();

  // Verify client exists
  const [clientRows] = await pool.execute(`SELECT id FROM clients WHERE id = ?`, [clientId]) as [RowDataPacket[], FieldPacket[]];
  if (clientRows.length === 0) return null;

  // Get next order
  const [maxRows] = await pool.execute(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM widgets WHERE client_id = ?`,
    [clientId],
  ) as [RowDataPacket[], FieldPacket[]];
  const order = maxRows[0].next_order;

  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO widgets (id, client_id, type, sort_order, size, row_span, bg_color, text_color, icon, brand_image, title, url, description, platform, username, content, lat, lng, map_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, clientId, widget.type, order, widget.size,
      widget.rowSpan ?? null, widget.bgColor || null, widget.textColor || null,
      widget.icon || null, widget.brandImage || null, widget.title || null,
      widget.url || null, widget.description || null, widget.platform || null,
      widget.username || null, widget.content || null,
      widget.lat ?? null, widget.lng ?? null, widget.mapLabel || null,
    ],
  );

  // Update client timestamp
  await pool.execute(`UPDATE clients SET updated_at = NOW() WHERE id = ?`, [clientId]);

  return { ...widget, id, order };
}

export async function updateWidget(
  clientId: string,
  widgetId: string,
  updates: Partial<Omit<Widget, "id">>,
): Promise<Widget | null> {
  const pool = await db();

  // Verify widget exists for client
  const [existing] = await pool.execute(
    `SELECT * FROM widgets WHERE id = ? AND client_id = ?`,
    [widgetId, clientId],
  ) as [RowDataPacket[], FieldPacket[]];
  if (existing.length === 0) return null;

  console.log("[updateWidget]", widgetId, "icon:", JSON.stringify(updates.icon), "brandImage:", JSON.stringify(updates.brandImage));

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.type !== undefined) { sets.push("type = ?"); values.push(updates.type); }
  if (updates.order !== undefined) { sets.push("sort_order = ?"); values.push(updates.order); }
  if (updates.size !== undefined) { sets.push("size = ?"); values.push(updates.size); }
  if (updates.rowSpan !== undefined) { sets.push("row_span = ?"); values.push(updates.rowSpan ?? null); }
  if (updates.bgColor !== undefined) { sets.push("bg_color = ?"); values.push(updates.bgColor ?? null); }
  if (updates.textColor !== undefined) { sets.push("text_color = ?"); values.push(updates.textColor ?? null); }
  if (updates.icon !== undefined) { sets.push("icon = ?"); values.push(updates.icon ?? null); }
  if (updates.brandImage !== undefined) { sets.push("brand_image = ?"); values.push(updates.brandImage ?? null); }
  if (updates.title !== undefined) { sets.push("title = ?"); values.push(updates.title ?? null); }
  if (updates.url !== undefined) { sets.push("url = ?"); values.push(updates.url ?? null); }
  if (updates.description !== undefined) { sets.push("description = ?"); values.push(updates.description ?? null); }
  if (updates.platform !== undefined) { sets.push("platform = ?"); values.push(updates.platform ?? null); }
  if (updates.username !== undefined) { sets.push("username = ?"); values.push(updates.username ?? null); }
  if (updates.content !== undefined) { sets.push("content = ?"); values.push(updates.content ?? null); }
  if (updates.lat !== undefined) { sets.push("lat = ?"); values.push(updates.lat ?? null); }
  if (updates.lng !== undefined) { sets.push("lng = ?"); values.push(updates.lng ?? null); }
  if (updates.mapLabel !== undefined) { sets.push("map_label = ?"); values.push(updates.mapLabel ?? null); }

  if (sets.length > 0) {
    values.push(widgetId);
    await pool.execute(`UPDATE widgets SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  // Update client timestamp
  await pool.execute(`UPDATE clients SET updated_at = NOW() WHERE id = ?`, [clientId]);

  // Return updated widget
  const [rows] = await pool.execute(`SELECT * FROM widgets WHERE id = ?`, [widgetId]) as [RowDataPacket[], FieldPacket[]];
  return rowToWidget(rows[0]);
}

export async function deleteWidget(clientId: string, widgetId: string): Promise<boolean> {
  const pool = await db();

  const [result] = await pool.execute(
    `DELETE FROM widgets WHERE id = ? AND client_id = ?`,
    [widgetId, clientId],
  );
  if ((result as { affectedRows: number }).affectedRows === 0) return false;

  // Reorder remaining widgets
  const [remaining] = await pool.execute(
    `SELECT id FROM widgets WHERE client_id = ? ORDER BY sort_order ASC`,
    [clientId],
  ) as [RowDataPacket[], FieldPacket[]];
  for (let i = 0; i < remaining.length; i++) {
    await pool.execute(`UPDATE widgets SET sort_order = ? WHERE id = ?`, [i, remaining[i].id]);
  }

  await pool.execute(`UPDATE clients SET updated_at = NOW() WHERE id = ?`, [clientId]);
  return true;
}

export async function reorderWidgets(
  clientId: string,
  widgetIds: string[],
): Promise<boolean> {
  const pool = await db();

  // Verify client exists
  const [clientRows] = await pool.execute(`SELECT id FROM clients WHERE id = ?`, [clientId]) as [RowDataPacket[], FieldPacket[]];
  if (clientRows.length === 0) return false;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < widgetIds.length; i++) {
      await conn.execute(
        `UPDATE widgets SET sort_order = ? WHERE id = ? AND client_id = ?`,
        [i, widgetIds[i], clientId],
      );
    }
    await conn.execute(`UPDATE clients SET updated_at = NOW() WHERE id = ?`, [clientId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return true;
}

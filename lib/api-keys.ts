import crypto from "crypto";
import bcrypt from "bcryptjs";
import { RowDataPacket, FieldPacket } from "mysql2/promise";
import { getPool, initDb } from "./db";

async function db() {
  await initDb();
  return getPool();
}

export async function createApiKey(name: string): Promise<{ id: string; key: string; prefix: string }> {
  const pool = await db();
  const rawKey = `lnk_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);
  const hash = await bcrypt.hash(rawKey, 10);
  const id = crypto.randomUUID();

  await pool.execute(
    `INSERT INTO api_keys (id, name, prefix, key_hash) VALUES (?, ?, ?, ?)`,
    [id, name, prefix, hash],
  );

  return { id, key: rawKey, prefix };
}

export async function validateApiKey(key: string): Promise<boolean> {
  const pool = await db();
  const [rows] = await pool.execute(`SELECT key_hash FROM api_keys`) as [RowDataPacket[], FieldPacket[]];
  for (const row of rows) {
    if (await bcrypt.compare(key, row.key_hash)) {
      return true;
    }
  }
  return false;
}

export async function listApiKeys(): Promise<{ id: string; name: string; prefix: string; createdAt: string }[]> {
  const pool = await db();
  const [rows] = await pool.execute(
    `SELECT id, name, prefix, created_at FROM api_keys ORDER BY created_at DESC`,
  ) as [RowDataPacket[], FieldPacket[]];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  }));
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const pool = await db();
  const [result] = await pool.execute(`DELETE FROM api_keys WHERE id = ?`, [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}

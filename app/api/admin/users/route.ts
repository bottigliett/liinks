import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RowDataPacket, FieldPacket } from "mysql2/promise";
import { getPool, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";

async function getSessionAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as { id?: string; email?: string; role?: string };
}

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await initDb();
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, name, email, role, created_at, updated_at FROM admins ORDER BY created_at ASC`,
  ) as [RowDataPacket[], FieldPacket[]];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    })),
  );
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }

  await initDb();
  const pool = getPool();

  // Check if email already exists
  const [existing] = await pool.execute(
    `SELECT id FROM admins WHERE email = ?`,
    [email],
  ) as [RowDataPacket[], FieldPacket[]];
  if (existing.length > 0) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);

  await pool.execute(
    `INSERT INTO admins (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
    [id, name, email, hash, role === "superadmin" ? "superadmin" : "admin"],
  );

  return NextResponse.json({ id, name, email, role: role === "superadmin" ? "superadmin" : "admin" }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Cannot delete yourself
  if (id === admin.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await initDb();
  const pool = getPool();
  const [result] = await pool.execute(`DELETE FROM admins WHERE id = ?`, [id]);
  if ((result as { affectedRows: number }).affectedRows === 0) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

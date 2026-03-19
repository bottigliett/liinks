import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "liinks",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;

  const pool = getPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','superadmin') DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      bio TEXT,
      avatar_url TEXT,
      phone VARCHAR(100),
      email VARCHAR(255),
      accent_color VARCHAR(20) DEFAULT '#3b82f6',
      style JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS widgets (
      id VARCHAR(36) PRIMARY KEY,
      client_id VARCHAR(36) NOT NULL,
      type ENUM('link','social','text','map') NOT NULL,
      sort_order INT DEFAULT 0,
      size ENUM('small','medium','wide','large') DEFAULT 'wide',
      row_span INT,
      bg_color VARCHAR(20),
      text_color VARCHAR(20),
      icon VARCHAR(100),
      brand_image VARCHAR(255),
      title VARCHAR(255),
      url TEXT,
      description TEXT,
      platform VARCHAR(50),
      username VARCHAR(255),
      content TEXT,
      lat DECIMAL(10,7),
      lng DECIMAL(10,7),
      map_label VARCHAR(255),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // Create index only if it doesn't exist (MySQL doesn't support IF NOT EXISTS for indexes in all versions)
  const [indexes] = await pool.execute(
    `SHOW INDEX FROM widgets WHERE Key_name = 'idx_widgets_client'`
  ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
  if ((indexes as mysql.RowDataPacket[]).length === 0) {
    await pool.execute(`CREATE INDEX idx_widgets_client ON widgets(client_id)`);
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      client_id VARCHAR(36) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      widget_id VARCHAR(36),
      session_id VARCHAR(100),
      referrer TEXT,
      user_agent TEXT,
      device_type VARCHAR(20),
      metadata JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_events_client (client_id),
      INDEX idx_events_created (created_at),
      INDEX idx_events_type (event_type)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      prefix VARCHAR(20) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default superadmin if admins table is empty
  const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM admins`) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
  if ((rows as mysql.RowDataPacket[])[0].count === 0) {
    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO admins (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), "Admin", email, hash, "superadmin"],
    );
  }

  initialized = true;
}

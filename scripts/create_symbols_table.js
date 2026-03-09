import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../data/symbols.db");

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Drop old broken table if it exists
  db.run(`DROP TABLE IF EXISTS symbols`);

  // Create correct schema (MATCHES server.cjs)
  db.run(`
    CREATE TABLE symbols (
      kid_symbol INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol_name TEXT,
      category TEXT,
      company TEXT,
      device_type TEXT,
      voltage_rating REAL,
      current_rating REAL,
      power_rating REAL,
      package TEXT,
      pin_count INTEGER,
      mount_type TEXT,
      datasheet TEXT,
      simulation_available INTEGER,
      simulation_parameters TEXT,
      tags TEXT,
      svg_file TEXT
    )
  `);

  // Indexes for fast search
  db.run(`CREATE INDEX idx_symbol_name ON symbols(symbol_name)`);
  db.run(`CREATE INDEX idx_category ON symbols(category)`);
  db.run(`CREATE INDEX idx_company ON symbols(company)`);
  db.run(`CREATE INDEX idx_device_type ON symbols(device_type)`);
});

db.close();
console.log(" Database & symbols table created with correct schema");
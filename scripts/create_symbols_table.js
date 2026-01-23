import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../data/symbols.db");

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      reference TEXT,
      component_type TEXT,
      value_raw TEXT,
      value_normalized REAL,
      tags TEXT,
      svg_path TEXT
    )
  `);

  db.run(`
    CREATE INDEX idx_component_type ON symbols(component_type);
  `);

  db.run(`
    CREATE INDEX idx_value ON symbols(value_normalized);
  `);
});

db.close();
console.log(" Database & table created");

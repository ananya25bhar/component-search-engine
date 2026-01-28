import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";

// Paths
const DATA_DIR = path.join(process.cwd(), "data");
const SVG_DIR = path.join(DATA_DIR, "svgs");
const DB_PATH = path.join(DATA_DIR, "symbols.db");

// Remove old DB if exists
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

// Open DB
const db = new sqlite3.Database(DB_PATH);

// Component detection rules
function detectComponentType(name) {
  if (!name) return "other";
  const n = name.toUpperCase();
  if (n.startsWith("R")) return "resistor";
  if (n.startsWith("C")) return "capacitor";
  if (n.startsWith("L")) return "inductor";
  if (n.startsWith("D")) return "diode";
  if (n.startsWith("Q")) return "transistor";
  if (n.startsWith("U")) return "ic";
  if (n.startsWith("J")) return "connector";
  return "other";
}

// Normalize values for numeric search
function normalizeValue(value) {
  if (!value) return null;
  const v = value.toLowerCase().replace(/[^0-9.kmunp]/g, "");
  if (v.endsWith("k")) return parseFloat(v) * 1e3;
  if (v.endsWith("m")) return parseFloat(v) * 1e6;
  if (v.endsWith("u")) return parseFloat(v) * 1e-6;
  if (v.endsWith("n")) return parseFloat(v) * 1e-9;
  if (v.endsWith("p")) return parseFloat(v) * 1e-12;
  return parseFloat(v);
}

// Build tags for filtering
function buildTags(type, value) {
  const tags = [type];
  if (type === "resistor") tags.push("ohm");
  if (type === "capacitor") tags.push("farad");
  if (value) tags.push(value);
  return tags.join(",");
}

// Recursively get all SVG files
function getAllSvgs(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(getAllSvgs(full));
    } else if (full.endsWith(".svg")) {
      files.push(full);
    }
  }
  return files;
}

// Create table
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

  db.run(`CREATE INDEX idx_component_type ON symbols(component_type)`);
  db.run(`CREATE INDEX idx_value_normalized ON symbols(value_normalized)`);

  const stmt = db.prepare(`
    INSERT INTO symbols
    (name, reference, component_type, value_raw, value_normalized, tags, svg_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const svgs = getAllSvgs(SVG_DIR);
  console.log(`Found ${svgs.length} SVG files`);

  for (const file of svgs) {
    const base = path.basename(file, ".svg"); // filename without extension
    const type = detectComponentType(base);
    const valueMatch = base.match(/([0-9.]+[kmunp]?)/i);
    const valueRaw = valueMatch?.[1] ?? null;
    const valueNormalized = normalizeValue(valueRaw);
    const tags = buildTags(type, valueRaw);

    // SVG path relative to /svgs/ for frontend
    const svgPath = base + ".svg";

    stmt.run(base, base, type, valueRaw, valueNormalized, tags, svgPath);
  }

  stmt.finalize(() => {
    console.log("✅ All SVGs indexed into DB");
    db.close();
  });
});

import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root directory
const ROOT = path.resolve(__dirname, "..");

// Relative paths (NO absolute paths)
const DATA_DIR = path.join(ROOT, "data");
const SVG_DIR = path.join(DATA_DIR, "svgs");
const DB_PATH = path.join(DATA_DIR, "symbols.db");

// Open SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DB open error:", err.message);
    return;
  }
  console.log("SQLite DB opened successfully");
});

// Extract symbol type from SVG
function extractSymbolType(svgFilePath) {
  const content = fs.readFileSync(svgFilePath, "utf-8");
  const match = content.match(/>([DRCLQ])\?<\/text>/);
  return match ? match[1] : "other";
}

// Symbol type mapping
const symbolMap = {
  D: "Diode",
  R: "Resistor",
  C: "Capacitor",
  L: "Inductor",
  Q: "Transistor"
};

db.serialize(() => {

  // Create table (matching server.cjs schema)
  db.run(`
    CREATE TABLE IF NOT EXISTS symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol_name TEXT,
      name TEXT,
      company TEXT,
      category TEXT,
      device_type TEXT,
      voltage_rating REAL DEFAULT 0,
      current_rating REAL DEFAULT 0,
      power_rating REAL DEFAULT 0,
      package TEXT,
      pin_count INTEGER DEFAULT 0,
      mount_type TEXT,
      datasheet TEXT,
      simulation_available INTEGER DEFAULT 0,
      simulation_parameters TEXT,
      tags TEXT,
      contents TEXT,
      svg_file TEXT,
      license TEXT
    )
  `);

  // Insert statement
  const stmt = db.prepare(`
    INSERT INTO symbols (
      id,
      symbol_name,
      name,
      company,
      category,
      device_type,
      voltage_rating,
      current_rating,
      power_rating,
      package,
      pin_count,
      mount_type,
      datasheet,
      simulation_available,
      simulation_parameters,
      tags,
      contents,
      svg_file,
      license
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Read all SVG files from svgs folder
  const files = fs
    .readdirSync(SVG_DIR)
    .filter(file => file.endsWith(".svg"));

  console.log(`Found ${files.length} SVG files`);

  for (const file of files) {

    const fullPath = path.join(SVG_DIR, file);
    const reference = file.replace(".svg", "");

    const symbolCode = extractSymbolType(fullPath);
    const componentType = symbolMap[symbolCode] || "Other";

    stmt.run(
      reference,      // symbol_name
      reference,      // name
      "Generic",      // company
      "",             // category
      componentType,  // device_type
      0,              // voltage_rating
      0,              // current_rating
      0,              // power_rating
      "",             // package
      0,              // pin_count
      "",             // mount_type
      "",             // datasheet
      0,              // simulation_available
      "{}",           // simulation_parameters
      "[]",           // tags
      "",             // contents
      file,           // svg_file
      "KiCad Libraries - CC-BY-SA 4.0"
    );
  }

  stmt.finalize(() => {
    console.log("All SVGs indexed successfully");

    db.close(() => {
      console.log("SQLite DB closed");
    });
  });

});
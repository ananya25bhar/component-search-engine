import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct paths
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "symbols.db");

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) return console.error(" DB open error:", err.message);
  console.log(" SQLite DB opened successfully");
});

// Extract symbol type from SVG
function extractSymbolType(svgFilePath) {
  const content = fs.readFileSync(svgFilePath, "utf-8");
  const match = content.match(/>([DRCLQ])\?<\/text>/);
  if (match) return match[1];
  return "other";
}

// Map symbol code to readable name
const symbolMap = {
  D: "Diode",
  R: "Resistor",
  C: "Capacitor",
  L: "Inductor",
  Q: "Transistor"
};

db.serialize(() => {

  db.run(`DROP TABLE IF EXISTS symbols`);

  db.run(`
    CREATE TABLE symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      reference TEXT,
      component_type TEXT
    )
  `, (err) => {
    if (err) return console.error(" Table creation error:", err.message);
    console.log(" Table 'symbols' created");
  });

  const stmt = db.prepare(`
    INSERT INTO symbols (name, reference, component_type)
    VALUES (?, ?, ?)
  `);

  // Get all SVG files inside data folder
  const files = fs.readdirSync(DATA_DIR)
    .filter(file => file.endsWith(".svg"));

  console.log(` Found ${files.length} SVG files`);

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    const reference = file.replace(".svg", "");

    const symbolCode = extractSymbolType(fullPath);
    const componentType = symbolMap[symbolCode] || "other";

    stmt.run(componentType, reference, componentType, (err) => {
      if (err) console.error(" Insert error:", err.message);
    });
  }

  stmt.finalize(() => {
    console.log(" All SVGs indexed successfully");

    db.close(() => {
      console.log(" SQLite DB closed");
    });
  });

});

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import Database from "better-sqlite3";

// --- Fix __dirname in ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Paths ---
const ROOT = path.resolve(__dirname, "..");
const SVG_DIR = path.join(ROOT, "data", "svgs");
const DB_PATH = path.join(ROOT, "data", "symbols.db");
const OUTPUT_JSON = path.join(ROOT, "data", "symbols.json");

// --- Extract part number ---
function extractCode(str) {
  const match = (str || "").toUpperCase().match(/[A-Z]*\d+[A-Z0-9]*/);
  return match ? match[0].toLowerCase() : "";
}

// --- Normalize text ---
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\.svg$/, "")
    .replace(/[_\-\s]/g, "");
}

// --- Auto tagging ---
function getTag(name) {
  const n = name.toLowerCase();
  if (n.includes("res")) return "resistor";
  if (n.includes("cap")) return "capacitor";
  if (n.includes("ind")) return "inductor";
  if (n.includes("npn") || n.includes("pnp")) return "bjt";
  if (n.includes("mosfet") || n.includes("fet")) return "mosfet";
  if (n.includes("diode")) return "diode";
  if (n.includes("ic") || n.includes("opamp")) return "ic";
  if (n.includes("connector")) return "connector";
  if (n.includes("switch")) return "switch";
  if (n.includes("led")) return "led";
  return "misc";
}

// --- Category keywords ---
const categoryMap = {
  resistor: ["resistor", "res"],
  capacitor: ["capacitor", "cap"],
  diode: ["diode"],
  transistor: ["transistor", "bjt", "npn", "pnp"],
  mosfet: ["mosfet", "fet"],
  ic: ["ic", "opamp", "amp"],
  inductor: ["inductor", "ind"],
  connector: ["connector"],
  switch: ["switch"],
  led: ["led"]
};


// --- STEP 2: Populate thumbnails ---
function populateThumbnails() {
  const db = new sqlite3.Database(DB_PATH);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS thumbnails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol_name TEXT,
      svg_file TEXT,
      svg_path TEXT,
      tags TEXT
    )`);

    db.run("DELETE FROM thumbnails");

    const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith(".svg"));

    const stmt = db.prepare(`
      INSERT INTO thumbnails (symbol_name, svg_file, svg_path, tags)
      VALUES (?, ?, ?, ?)
    `);

    files.forEach(file => {
      const name = path.basename(file, ".svg");
      stmt.run(
        name,
        file,
        path.join("svgs", file),
        JSON.stringify([getTag(name)])
      );
    });

    stmt.finalize();
    console.log("Thumbnails inserted:", files.length);
  });

  db.close();
}

// --- STEP 3: Hybrid smart linking ---
function linkSymbolsToSvg() {
  const db = new Database(DB_PATH);

  const symbols = db.prepare("SELECT id, symbol_name FROM symbols").all();
  const svgFiles = fs.readdirSync(SVG_DIR).filter(f => f.endsWith(".svg"));

  const update = db.prepare("UPDATE symbols SET svg_path = ? WHERE id = ?");

  let linked = 0;

  const svgMap = svgFiles.map(file => ({
    file,
    norm: normalize(file),
    code: extractCode(file)
  }));

  symbols.forEach(sym => {
    const name = (sym.symbol_name || "").toLowerCase();
    const symNorm = normalize(name);
    const symCode = extractCode(name);

    let match = null;

    // 1. Part number match
    if (symCode) {
      match = svgMap.find(svg => svg.code === symCode);
    }

    // 2. Category match
    if (!match) {
      for (const key in categoryMap) {
        if (name.includes(key)) {
          match = svgMap.find(svg =>
            categoryMap[key].some(k => svg.norm.includes(k))
          );
          if (match) break;
        }
      }
    }

    // 3. Loose match
    if (!match) {
      match = svgMap.find(svg => svg.norm.includes(symNorm));
    }

    if (match) {
      update.run(match.file, sym.id);
      linked++;
    }
  });

  console.log("Symbols linked with SVG:", linked);
}

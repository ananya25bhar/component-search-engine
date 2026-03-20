import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

// --- Fix __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Paths ---
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

const DB_PATH = path.join(DATA_DIR, "symbols.db");
const SYMBOL_DIR = path.join(DATA_DIR, "symbols");
const SVG_DIR = path.join(DATA_DIR, "svgs");

// --- Open DB ---
const db = new Database(DB_PATH);
console.log("Using database:", DB_PATH);

// --- Walk directory ---
function walkFiles(dir, ext) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);

    if (f.isDirectory()) {
      files = files.concat(walkFiles(full, ext));
    } else if (f.isFile() && f.name.endsWith(ext)) {
      files.push(full);
    }
  }

  return files;
}

// --- Categorization ---
function categorize(name, reference) {
  const text = `${name} ${reference}`.toLowerCase();

  if (text.includes("res") || reference?.startsWith("R"))
    return { category: "Passive", device_type: "Resistor" };

  if (text.includes("cap") || reference?.startsWith("C"))
    return { category: "Passive", device_type: "Capacitor" };

  if (text.includes("ind") || reference?.startsWith("L"))
    return { category: "Passive", device_type: "Inductor" };

  if (text.includes("diode") || reference?.startsWith("D"))
    return { category: "Active", device_type: "Diode" };

  if (text.includes("transistor") || reference?.startsWith("Q"))
    return { category: "Active", device_type: "Transistor" };

  if (reference?.startsWith("U"))
    return { category: "IC", device_type: "General" };

  return { category: "Other", device_type: "Other" };
}

// --- Create Table ---
db.exec(`
CREATE TABLE IF NOT EXISTS symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol_name TEXT,
  category TEXT,
  device_type TEXT,
  svg_path TEXT
);
`);

console.log("Table ready");

// --- Build SVG Map ---
function buildSvgMap() {
  const map = {};
  if (!fs.existsSync(SVG_DIR)) return map;

  const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith(".svg"));

  files.forEach(file => {
    const key = path.basename(file, ".svg").toLowerCase();
    map[key] = `svgs/${file}`;
  });

  console.log(`Found ${files.length} SVG files`);
  return map;
}

// --- Insert Symbols ---
function insertSymbols(svgMap) {
  const symFiles = walkFiles(SYMBOL_DIR, ".kicad_sym");

  console.log(`Processing ${symFiles.length} symbol files...`);

  const stmt = db.prepare(`
    INSERT INTO symbols (symbol_name, category, device_type, svg_path)
    VALUES (?, ?, ?, ?)
  `);

  symFiles.forEach(file => {
    const content = fs.readFileSync(file, "utf8");

    const name = path.basename(file, ".kicad_sym");

    const ref = content.match(/property "Reference" "([^"]+)"/)?.[1] || "";

    const { category, device_type } = categorize(name, ref);

    const svg = svgMap[name.toLowerCase()] || null;

    stmt.run(name, category, device_type, svg);
  });

  console.log("Symbols inserted");
}

// --- Create Index ---
db.exec(`CREATE INDEX IF NOT EXISTS idx_name ON symbols(symbol_name);`);

// --- RUN ---
const svgMap = buildSvgMap();
insertSymbols(svgMap);

db.close();

console.log("Database build complete");
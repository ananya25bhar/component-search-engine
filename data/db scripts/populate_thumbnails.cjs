const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

/* ---------- ROOT ---------- */
const ROOT = path.resolve(__dirname, "..", "..");

/* ---------- PATHS ---------- */
const SVG_DIR = path.join(ROOT, "data", "svgs");        // folder containing svgs
const DB_PATH = path.join(ROOT, "data", "symbols.db");  // sqlite db

/* ---------- DB ---------- */
const db = new sqlite3.Database(DB_PATH);

/* ---------- TAGGING LOGIC (KiCad-aware) ---------- */
function getTag(filename) {
  const n = filename.toLowerCase();

  // Resistors
  if (n.startsWith("r_") || n.includes("device:r") || n.includes("res"))
    return "resistor";

  // Capacitors
  if (n.startsWith("c_") || n.includes("device:c") || n.includes("cap"))
    return "capacitor";

  // Inductors
  if (n.startsWith("l_") || n.includes("device:l") || n.includes("ind"))
    return "inductor";

  // BJTs
  if (
    n.startsWith("q_") ||
    n.includes("npn") ||
    n.includes("pnp") ||
    n.includes("bjt") ||
    n.includes("transistor")
  )
    return "bjt";

  // MOSFETs
  if (
    n.includes("mosfet") ||
    n.includes("fet") ||
    n.includes("pmos") ||
    n.includes("nmos")
  )
    return "mosfet";

  // Diodes
  if (
    n.startsWith("d_") ||
    n.includes("diode") ||
    n.includes("zener") ||
    n.includes("schottky")
  )
    return "diode";

  // Integrated Circuits
  if (
    n.startsWith("u_") ||
    n.includes("ic") ||
    n.startsWith("lm") ||
    n.startsWith("74") ||
    n.includes("opamp")
  )
    return "ic";

  // Others
  if (n.includes("conn") || n.includes("header")) return "connector";
  if (n.includes("switch")) return "switch";
  if (n.includes("led")) return "led";

  return "misc";
}

/* ---------- MAIN ---------- */
db.serialize(() => {

  // Create table (safe)
  db.run(`
    CREATE TABLE IF NOT EXISTS thumbnails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol_name TEXT,
      svg_file TEXT,
      svg_path TEXT,
      tags TEXT
    )
  `);

  // Clean old data
  db.run(`DELETE FROM thumbnails`);

  const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith(".svg"));

  console.log(`SVG files found: ${files.length}`);

  const stmt = db.prepare(`
    INSERT INTO thumbnails (symbol_name, svg_file, svg_path, tags)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;

  files.forEach(file => {

    const symbolName = path.basename(file, ".svg");

    // frontend-friendly path
    const svgPath = path.join("svgs", file);

    const tag = getTag(symbolName);

    stmt.run(
      symbolName,
      file,
      svgPath,
      JSON.stringify([tag])
    );

    count++;

  });

  stmt.finalize();

  console.log(`Inserted ${count} thumbnails with intelligent tags`);

});

db.close();
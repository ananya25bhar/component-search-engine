// populate_thumbnails.js

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

/**
 * Paths
 * Assumption:
 * data/
 * ├─ populate_thumbnails.js
 * ├─ symbols.db
 * └─ svgs/   (27k+ svg thumbnails)
 */

const ROOT = __dirname;
const SVG_DIR = path.join(ROOT, "svgs");
const DB_PATH = path.join(ROOT, "symbols.db");

/**
 * Open database
 */
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB open error:", err.message);
    process.exit(1);
  }
});

/**
 * Generate tags for search
 */
function generateTags(name) {
  const n = name.toLowerCase();
  const tags = new Set();

  tags.add(n);

  if (n.startsWith("r")) tags.add("resistor");
  if (n.startsWith("c")) tags.add("capacitor");
  if (n.startsWith("l")) tags.add("inductor");

  if (n.includes("bc") || n.includes("2n")) tags.add("bjt");
  if (n.includes("mos") || n.includes("irf")) tags.add("mosfet");

  if (/^(74|40|cd|lm|ne)/.test(n)) tags.add("ic");

  return JSON.stringify([...tags]);
}

/**
 * Main
 */
db.serialize(() => {
  if (!fs.existsSync(SVG_DIR)) {
    console.error("❌ svgs folder not found:", SVG_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith(".svg"));

  console.log("🔍 SVG files found:", files.length);

  if (files.length === 0) {
    console.error("❌ No SVG files found");
    process.exit(1);
  }

  // Clear old thumbnails
  db.run(`DELETE FROM thumbnails`);

  const stmt = db.prepare(`
    INSERT INTO thumbnails (symbol_name, svg_file, svg_path, tags)
    VALUES (?, ?, ?, ?)
  `);

  for (const file of files) {
    const symbolName = path.basename(file, ".svg");

    stmt.run(
      symbolName,
      file,
      `svgs/${file}`,
      generateTags(symbolName)
    );
  }

  stmt.finalize(() => {
    console.log(`✅ Inserted ${files.length} thumbnails`);
  });
});

db.close();
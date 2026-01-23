import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";

const svgFolder = path.join(".", "svgs");
const dbPath = path.join(".", "symbols.db");

const db = new sqlite3.Database(dbPath);

function guessComponentType(name) {
  const n = name.toLowerCase();

  if (/^r\d|resistor/.test(n)) return "resistor";
  if (/^c\d|capacitor/.test(n)) return "capacitor";
  if (/^l\d|inductor/.test(n)) return "inductor";
  if (/^d\d|diode/.test(n)) return "diode";
  if (n.includes("led")) return "led";

  if (n.includes("gnd")) return "gnd";
  if (n.includes("vcc") || n.includes("vdd") || n.includes("vss")) return "vcc";

  if (
    n.startsWith("u") ||
    n.startsWith("ic") ||
    n.includes("opamp") ||
    n.includes("mux") ||
    n.includes("adc") ||
    n.includes("dac") ||
    n.includes("clk") ||
    n.includes("buffer") ||
    n.includes("logic")
  ) return "IC";

  return "Misc";
}

function guessCategory(type) {
  if (["resistor","capacitor","inductor","diode","led"].includes(type))
    return { category: "Passive", subcategory: type };

  if (type === "IC")
    return { category: "IC", subcategory: "General" };

  if (["gnd","vcc"].includes(type))
    return { category: "Power", subcategory: type };

  return { category: "Misc", subcategory: "Misc" };
}

db.serialize(() => {
  console.log("🔥 Resetting DB…");

  db.run(`DROP TABLE IF EXISTS symbols`);
  db.run(`
    CREATE TABLE symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      component_type TEXT,
      category TEXT,
      subcategory TEXT,
      svg_path TEXT
    )
  `);

  const files = fs.readdirSync(svgFolder).filter(f => f.endsWith(".svg"));
  console.log("📁 SVG files found:", files.length);

  db.run("BEGIN TRANSACTION");

  const stmt = db.prepare(`
    INSERT INTO symbols
    (filename, component_type, category, subcategory, svg_path)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const file of files) {
    const type = guessComponentType(file);
    const { category, subcategory } = guessCategory(type);
    stmt.run(file, type, category, subcategory, `svgs/${file}`);
  }

  stmt.finalize(() => {
    db.run("COMMIT", () => {
      console.log("✅ ALL 26746 SVGs COMMITTED");
      db.close();
    });
  });
});

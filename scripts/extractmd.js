import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DB_PATH = path.join(__dirname, "../data/symbols.db");
const SYMBOLS_DIR = path.join(__dirname, "../data/symbols");
const SVG_DIR = path.join(__dirname, "../data/svgs");

// Normalize cleaning names 
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\.svg$/, "")
    .replace(/[_\-\s]/g, "");
}

// Load SVGs normalizing strings
const svgList = fs.existsSync(SVG_DIR)
  ? fs.readdirSync(SVG_DIR)
      .filter(f => f.endsWith(".svg"))
      .map(file => ({
        file,
        norm: normalize(file)
      }))
  : [];

// Check symbols folder
if (!fs.existsSync(SYMBOLS_DIR)) {
  console.error("Symbols folder not found:", SYMBOLS_DIR);
  process.exit(1);
}

// DB connect
const db = new Database(DB_PATH);

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol_name TEXT,
    base_name TEXT,
    category TEXT,
    device_type TEXT,
    package TEXT,
    pin_count TEXT,
    mount_type TEXT,
    voltage TEXT,
    current TEXT,
    power TEXT,
    datasheet TEXT,
    description TEXT,
    license TEXT,
    svg_path TEXT
  )
`);

// Clear old data
db.exec("DELETE FROM symbols");

// Prepare insert
const insert = db.prepare(`
  INSERT INTO symbols (
    symbol_name,
    base_name,
    category,
    device_type,
    package,
    pin_count,
    mount_type,
    voltage,
    current,
    power,
    datasheet,
    description,
    license,
    svg_path
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Get files
const files = fs.readdirSync(SYMBOLS_DIR)
  .filter(f => f.endsWith(".kicad_sym"));

// Transaction for faster insert 
const insertMany = db.transaction((symbols, fileName) => {

  for (const block of symbols) {
    try {

      // NAME
      const nameMatch = block.match(/"([^"]+)"/);
      if (!nameMatch) continue;

      const rawName = nameMatch[1];

      const symbol_name = rawName.split(":")[0].trim();
      const base_name = rawName.includes(":")
        ? rawName.split(":")[1].trim()
        : rawName;

      // CATEGORY
      const category = fileName.replace(".kicad_sym", "");
      const device_type = category;

      // FOOTPRINT
      const footprintMatch = block.match(/Footprint"\s+"([^"]+)"/);
      let packageType = footprintMatch
        ? footprintMatch[1].split(":").pop().trim()
        : null;

      // DATASHEET
      const datasheetMatch = block.match(/Datasheet"\s+"([^"]+)"/);
      const datasheet = datasheetMatch ? datasheetMatch[1] : null;

      // DESCRIPTION
      const descMatch = block.match(/Description"\s+"([^"]+)"/);
      const description = descMatch ? descMatch[1] : null;

      // PIN COUNT
      const pin_count = (block.match(/\(pin\b/g) || []).length || null;

      // POWER
      const power = /(vcc|gnd|vdd|vss|vin|vout)/i.test(block)
        ? "Yes"
        : null;

      // MOUNT TYPE
      let mount_type = null;
      if (packageType) {
        const pkg = packageType.toLowerCase();
        if (/(smd|soic|qfn|bga|sot)/.test(pkg)) mount_type = "SMD";
        else if (/(dip|through)/.test(pkg)) mount_type = "Through Hole";
      }

      // VOLTAGE / CURRENT
      let voltage = null;
      let current = null;

      if (description) {
        const vMatch = description.match(/(\d+\.?\d*)\s*V/i);
        if (vMatch) voltage = vMatch[1] + "V";

        const cMatch = description.match(/(\d+\.?\d*)\s*A/i);
        if (cMatch) current = cMatch[1] + "A";
      }

      // LICENSE
      const license = "Open/Generic";

      //   SVG MATCHING

      let svg_path = null;

      const base = normalize(symbol_name);

      let bestMatch = null;
      let bestScore = 0;

      for (const svg of svgList) {
        const file = svg.norm;

        let score = 0;

        if (file === base) score = 10;           // exact
        else if (file.startsWith(base)) score = 8; // prefix (cd14529)
        else if (file.includes(base)) score = 5;  // contains

        if (score > bestScore) {
          bestScore = score;
          bestMatch = svg.file;
        }
      }

      // accept only strong matches
      if (bestMatch && bestScore >= 5) {
        svg_path = `svgs/${bestMatch}`;
      }

      // INSERT
      insert.run(
        symbol_name,
        base_name,
        category,
        device_type,
        packageType,
        pin_count ? pin_count.toString() : null,
        mount_type,
        voltage,
        current,
        power,
        datasheet,
        description,
        license,
        svg_path
      );

    } catch (err) {
      console.log("Error:", err.message);
    }
  }
});

// RUN
let total = 0;

for (const file of files) {
  console.log("Processing:", file);  //which file is running

  const content = fs.readFileSync(
    path.join(SYMBOLS_DIR, file),
    "utf-8"
  );

  const symbols = content.split("(symbol ").slice(1);

  total += symbols.length;

  insertMany(symbols, file);
}

// DONE
console.log(`Extracted ${total} symbols`);
db.close();
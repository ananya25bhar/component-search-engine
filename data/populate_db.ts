import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

/* =====================
   FIX __dirname
===================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================
   PATHS
===================== */

const ROOT = __dirname;
const SYMBOLS_DIR = path.join(ROOT, "symbols");
const DB_PATH = path.join(ROOT, "symbols.db");

/* =====================
   DB
===================== */

const db = new sqlite3.Database(DB_PATH);

/* =====================
   HELPERS
===================== */

function extractCategory(symbolName: string): string {
  const name = symbolName.toLowerCase();

  if (name.includes("resistor") || name.includes("res")) return "Resistors";
  if (name.includes("capacitor") || name.includes("cap")) return "Capacitors";
  if (name.includes("inductor") || name.includes("ind")) return "Inductors";
  if (name.includes("diode")) return "Diodes";
  if (
    name.includes("transistor") ||
    name.includes("bjt") ||
    name.includes("fet") ||
    name.includes("mosfet")
  ) return "Transistors";
  if (name.includes("ic") || name.includes("chip"))
    return "Integrated Circuits";
  if (name.includes("connector") || name.includes("header"))
    return "Connectors";
  if (name.includes("switch")) return "Switches";
  if (name.includes("led")) return "LEDs";

  return "Miscellaneous";
}

/* =====================
   MAIN
===================== */

db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS symbols`);
  db.run(`DROP TABLE IF EXISTS pins`);

  db.run(`
    CREATE TABLE symbols (
      kid_symbol INTEGER PRIMARY KEY AUTOINCREMENT,
      kicad_file TEXT,
      symbol_name TEXT,
      name_and_path TEXT,
      svg_file TEXT,
      contents TEXT,
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
      simulation_available INTEGER DEFAULT 1,
      simulation_parameters TEXT,
      tags TEXT
    )
  `);

  db.run(`
    CREATE TABLE pins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kid_symbol INTEGER,
      pin_number TEXT,
      pin_name TEXT
    )
  `);

  const files = fs
    .readdirSync(SYMBOLS_DIR)
    .filter((f) => f.endsWith(".kicad_sym"));

  let totalSymbols = 0;

  for (const file of files) {
    const raw = fs.readFileSync(
      path.join(SYMBOLS_DIR, file),
      "utf-8"
    );

    const blocks =
      raw.match(/\(symbol\s+"[^"]+"[\s\S]*?\n\)/g) ?? [];

    for (const block of blocks) {
      const nameMatch = block.match(/\(symbol\s+"([^"]+)"/);
      if (!nameMatch) continue;

      const symbolName = nameMatch[1];
      const svgFile = `${symbolName}.svg`;
      const nameAndPath = `${symbolName}/${symbolName}`;

      db.run(
        `
        INSERT INTO symbols (
          kicad_file, symbol_name, name_and_path, svg_file, contents,
          name, company, category, device_type,
          voltage_rating, current_rating, power_rating,
          package, pin_count, mount_type,
          datasheet, simulation_available, simulation_parameters, tags
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          file,
          symbolName,
          nameAndPath,
          svgFile,
          block,
          symbolName,
          "",
          extractCategory(symbolName),
          "",
          0,
          0,
          0,
          "",
          0,
          "",
          "",
          1,
          "{}",
          JSON.stringify([symbolName.toLowerCase()]),
        ],
        function (this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            console.error(err);
            return;
          }

          const kid_symbol = this.lastID;

          const pinRegex =
            /\(pin\s+[^)]*\(name\s+"([^"]+)"\)[^)]*\(number\s+"([^"]+)"\)/g;

          let match: RegExpExecArray | null;
          let pinCount = 0;

          while ((match = pinRegex.exec(block)) !== null) {
            pinCount++;

            db.run(
              `INSERT INTO pins (kid_symbol, pin_number, pin_name)
               VALUES (?, ?, ?)`,
              [kid_symbol, match[2], match[1]]
            );
          }

          if (pinCount > 0) {
            db.run(
              `UPDATE symbols SET pin_count = ? WHERE kid_symbol = ?`,
              [pinCount, kid_symbol]
            );
          }
        }
      );

      totalSymbols++;
    }
  }

  console.log(`Database populated with ${totalSymbols} individual symbols`);
});

db.close();
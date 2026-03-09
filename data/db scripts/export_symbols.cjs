const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");   // project root

const DB_PATH = path.join(ROOT, "data", "symbols.db");
const OUTPUT_FILE = path.join(ROOT, "data", "symbols.json");

const db = new sqlite3.Database(DB_PATH);

// SAFE JSON PARSER
function safeParse(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    if (typeof value === "string") {
      return value.split(",").map(v => v.trim());
    }
    return fallback;
  }
}

// GENERATE DATASHEET LINK
function generateDatasheet(symbol) {

  if (symbol.datasheet && symbol.datasheet.trim() !== "") {
    return symbol.datasheet;
  }

  const name = symbol.name || symbol.symbol_name;
  const company = (symbol.company || "").toLowerCase();

  // Texas Instruments
  if (company.includes("texas") || company.includes("ti")) {
    return `https://www.ti.com/lit/ds/symlink/${name}.pdf`;
  }

  // Analog Devices
  if (company.includes("analog")) {
    return `https://www.analog.com/media/en/technical-documentation/data-sheets/${name}.pdf`;
  }

  // Infineon / Rectifier
  if (company.includes("rectifier") || company.includes("infineon")) {
    return `https://www.infineon.com/dgdl/${name}.pdf`;
  }

  // fallback
  return `https://www.google.com/search?q=${encodeURIComponent(name + " datasheet")}`;
}

db.serialize(() => {

  db.all(`SELECT * FROM symbols`, [], (err, symbols) => {

    if (err) {
      console.error("Error reading symbols:", err);
      return;
    }

    const result = symbols.map(symbol => ({

      name: symbol.name || symbol.symbol_name,
      company: symbol.company || "",
      category: symbol.category || "Miscellaneous",
      device_type: symbol.device_type || "",
      voltage_rating: symbol.voltage_rating || 0,
      current_rating: symbol.current_rating || 0,
      power_rating: symbol.power_rating || 0,
      package: symbol.package || "",
      pin_count: symbol.pin_count || 0,
      mount_type: symbol.mount_type || "",
      pins: [],

      datasheet: generateDatasheet(symbol),

      simulation_available: symbol.simulation_available === 1,
      simulation_parameters: safeParse(symbol.simulation_parameters, {}),
      tags: safeParse(symbol.tags, []),

      kicad_symbol_id: symbol.kid_symbol,
      kicad_file: symbol.kicad_file,
      svg_file: symbol.svg_file
    }));

    let processedSymbols = 0;

    result.forEach((symbolData) => {

      db.all(
        `SELECT pin_number, pin_name FROM pins WHERE kid_symbol = ? ORDER BY pin_number`,
        [symbolData.kicad_symbol_id],
        (err, pins) => {

          if (!err && pins) {
            symbolData.pins = pins.map(p => ({
              number: p.pin_number,
              name: p.pin_name
            }));
          }

          processedSymbols++;

          if (processedSymbols === result.length) {

            fs.writeFileSync(
              OUTPUT_FILE,
              JSON.stringify(result, null, 2),
              "utf-8"
            );

            console.log(`Exported ${result.length} symbols to ${OUTPUT_FILE}`);

            db.close();
          }
        }
      );

    });

  });

});
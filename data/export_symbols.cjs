const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "symbols.db");
const OUTPUT_FILE = path.join(ROOT, "symbols.json");

const db = new sqlite3.Database(DB_PATH);

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
      pins: [], // Will be populated below
      datasheet: symbol.datasheet || "",
      simulation_available: symbol.simulation_available === 1,
      simulation_parameters: symbol.simulation_parameters ? JSON.parse(symbol.simulation_parameters) : {},
      tags: symbol.tags ? JSON.parse(symbol.tags) : [],
      // Additional metadata
      kicad_symbol_id: symbol.kid_symbol,
      kicad_file: symbol.kicad_file,
      svg_file: symbol.svg_file
    }));

    // Fetch pins for each symbol
    let processedSymbols = 0;

    result.forEach((symbolData, index) => {
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

          // When all symbols are processed, write to file
          if (processedSymbols === result.length) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
            console.log(` Exported ${result.length} symbols to ${OUTPUT_FILE}`);
            db.close();
          }
        }
      );
    });
  });
});
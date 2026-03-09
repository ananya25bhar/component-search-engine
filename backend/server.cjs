const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "../data/symbols.db");
console.log("Using database:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("Database connection error:", err.message);
  else console.log("Connected to SQLite database");
});

const SVG_FOLDER = path.join(__dirname, "../data/svgs");
app.use("/svgs", express.static(SVG_FOLDER));

// confidence calculation
function calculateConfidence(row) {
  let score = 0;
  if (row.category) score += 0.25;
  if (row.device_type) score += 0.25;
  if (row.package) score += 0.1;
  if (row.pin_count > 0) score += 0.1;
  if (row.voltage_rating > 0) score += 0.15;
  if (row.current_rating > 0) score += 0.15;
  return Math.min(score, 1);
}

// search API
app.get("/api/search", (req, res) => {
  const query = req.query.q || "";
  const searchValue = `%${query}%`;

  const sql = `
    SELECT *
    FROM symbols
    WHERE symbol_name LIKE ?
       OR name LIKE ?
       OR category LIKE ?
       OR company LIKE ?
    LIMIT 50
  `;

  db.all(sql, [searchValue, searchValue, searchValue, searchValue], (err, rows) => {
    if (err) {
      console.error("SQL error:", err.message);
      return res.status(500).json({ error: err.message });
    }

    const results = rows.map((row) => {
      let tags = [];
      let simulationParams = {};

      try { if (row.tags) tags = JSON.parse(row.tags); } catch {}
      try { if (row.simulation_parameters) simulationParams = JSON.parse(row.simulation_parameters); } catch {}

      return {
        id: row.id,
        symbol_name: row.symbol_name,
        svg_url: row.svg_file ? `http://localhost:${PORT}/svgs/${row.svg_file}` : "",
        name: row.name || row.symbol_name,
        company: row.company || "Generic",
        category: row.category || "",
        device_type: row.device_type || "",
        voltage_rating: row.voltage_rating ?? 0,
        current_rating: row.current_rating ?? 0,
        power_rating: row.power_rating ?? 0,
        package: row.package || "",
        pin_count: row.pin_count ?? 0,
        mount_type: row.mount_type || "",
        datasheet: row.datasheet || "",
        simulation_available: Boolean(row.simulation_available),
        simulation_parameters: simulationParams,
        tags: tags,
        contents: row.contents || "",
        confidence: calculateConfidence(row),
        license: row.license || "KiCad Libraries - CC-BY-SA 4.0",
        source: "database"
      };
    });

    res.json(results);
  });
});

// license API
const LICENSE_FILE = path.join(__dirname, "../data/kicad_license.txt");

app.get("/api/license", (req, res) => {
  fs.readFile(LICENSE_FILE, "utf-8", (err, data) => {
    if (err) {
      console.error("License file read error:", err.message);
      return res.json({ license: "License could not be loaded." });
    }
    res.json({ license: data });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
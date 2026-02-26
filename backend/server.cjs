const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// =======================
// DATABASE
// =======================
const DB_PATH = path.resolve(__dirname, "../data/symbols.db");
console.log("Using DB at:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB connection error:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

// =======================
// SERVE SVG FILES
// =======================
const SVG_FOLDER = path.resolve(__dirname, "../data/svgs");
app.use("/svgs", express.static(SVG_FOLDER));

// =======================
// SEARCH API
// =======================
app.get("/api/search", (req, res) => {
  const query = req.query.q || "";
  const searchValue = `%${query}%`;

  const sql = `
    SELECT *
    FROM symbols
    WHERE symbol_name LIKE ?
       OR name LIKE ?
       OR category LIKE ?
  `;

  db.all(sql, [searchValue, searchValue, searchValue], (err, rows) => {
    if (err) {
      console.error("SQL ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    const results = rows.map((row) => ({
      id: row.kid_symbol, // use the correct column
      symbol_name: row.symbol_name,
      svg_url: row.svg_file ? `http://localhost:${PORT}/svgs/${row.svg_file}` : "",
      name: row.name || row.symbol_name,
      company: row.company || "",
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
      simulation_parameters: row.simulation_parameters ? JSON.parse(row.simulation_parameters) : {},
      tags: row.tags ? row.tags.split(",") : [],
    }));

    res.json(results);
  });
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
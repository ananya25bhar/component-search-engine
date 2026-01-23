const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());

// =======================
// PATHS
// =======================
const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const SVG_DIR = path.join(DATA_DIR, "svgs");
const DB_PATH = path.join(DATA_DIR, "symbols.db");

// =======================
// ENSURE SVG FOLDER EXISTS
// =======================
if (!fs.existsSync(SVG_DIR)) {
  console.error("SVG folder not found:", SVG_DIR);
  process.exit(1);
}

// =======================
// DATABASE CONNECTION
// =======================
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("DB connection error:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to symbols.db");
});

// =======================
// SERVE SVG FILES
// =======================
app.get("/svgs/:filename", (req, res) => {
  const fileName = req.params.filename; // raw filename from DB
  const fullPath = path.join(SVG_DIR, fileName);

  if (!fs.existsSync(fullPath)) return res.status(404).send("SVG not found");
  res.sendFile(fullPath);
});

// =======================
// SEARCH ENDPOINT
// =======================
app.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const like = `%${q}%`;

  const sql = `
    SELECT
      filename AS name,
      component_type AS component_type,
      category AS reference,
      subcategory AS value_raw,
      0 AS value_normalized,
      filename AS svg_path
    FROM symbols
    WHERE
      LOWER(filename) LIKE ?
      OR LOWER(component_type) LIKE ?
      OR LOWER(category) LIKE ?
      OR LOWER(subcategory) LIKE ?
    LIMIT 100
  `;

  db.all(sql, [like, like, like, like], (err, rows) => {
    if (err) {
      console.error("SQL Error:", err.message);
      return res.status(500).json([]);
    }

    // Return raw filename to frontend
    res.json(rows);
  });
});

// =======================
// ROOT TEST
// =======================
app.get("/", (req, res) => res.send("✅ Backend is running"));

// =======================
// START SERVER
// =======================
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

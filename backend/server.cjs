const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());

// =======================
// PATHS (CORRECT)
// =======================
const ROOT_DIR = path.join(__dirname, ".."); // project root
const DATA_DIR = path.join(ROOT_DIR, "data");
const SVG_DIR = path.join(DATA_DIR, "svgs");
const DB_PATH = path.join(DATA_DIR, "symbols.db");

// =======================
// CHECK SVG FOLDER
// =======================
if (!fs.existsSync(SVG_DIR)) {
  console.error("❌ SVG folder not found:", SVG_DIR);
  process.exit(1);
}

// =======================
// DATABASE CONNECTION
// =======================
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to symbols.db");
});

// =======================
// SERVE SVG FILES (STATIC)
// URL: http://localhost:3000/svgs/FILE.svg
// =======================
app.use(
  "/svgs",
  express.static(SVG_DIR, {
    extensions: ["svg"],
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=86400");
    },
  })
);

// =======================
// SEARCH ENDPOINT
// =======================
app.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const like = `%${q}%`;

  const sql = `
    SELECT
      name,
      reference,
      component_type,
      value_raw,
      value_normalized,
      svg_path
    FROM symbols
    WHERE
      LOWER(name) LIKE ?
      OR LOWER(component_type) LIKE ?
      OR LOWER(reference) LIKE ?
      OR LOWER(value_raw) LIKE ?
    LIMIT 100
  `;

  db.all(sql, [like, like, like, like], (err, rows) => {
    if (err) {
      console.error("❌ SQL Error:", err.message);
      return res.status(500).json({ error: err.message });
    }

    // ✅ FRONTEND-FRIENDLY RESPONSE
    const formatted = rows.map((r) => ({
      ...r,
      svg_url: `/svgs/${path.basename(r.svg_path)}`,
    }));

    res.json(formatted);
  });
});

// =======================
// ROOT TEST
// =======================
app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* ---------- Database ---------- */

const dbPath = path.join(__dirname, "../data/symbols.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log("Database connection failed:", err.message);
  } else {
    console.log("Database connected");
  }
});

/* ---------- Serve SVG files ---------- */

//  FIXED (robust path)
const svgFolder = path.join(__dirname, "../data/svgs");
console.log("Serving SVGs from:", svgFolder);

app.use("/svgs", express.static(svgFolder));

/* ---------- Search API ---------- */

app.get("/api/search", (req, res) => {
  const q = req.query.q || "";

  // Escape special characters
  const escapedQuery = q.replace(/([_%\\])/g, "\\$1");
  const search = `%${escapedQuery}%`;

  const sql = `
    SELECT *
    FROM symbols
    WHERE (
      LOWER(symbol_name) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(category) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(device_type) LIKE LOWER(?) ESCAPE '\\'
    )
    LIMIT 50
  `;

  db.all(sql, [search, search, search], (err, rows) => {
    if (err) {
      console.log("Search error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    const result = rows.map((row) => {
      // ✅ SVG fallback logic
      let svg_url;

      if (row.svg_path) {
        svg_url = `http://localhost:${PORT}/${row.svg_path}`;
      } else if (row.category?.toLowerCase().includes("connector")) {
        svg_url = `http://localhost:${PORT}/svgs/connector.svg`; // optional
      } else {
        svg_url = `http://localhost:${PORT}/svgs/default.svg`; // fallback
      }

      return {
        id: row.id,
        symbol_name: row.symbol_name ?? "",
        svg_url,
        category: row.category ?? "",
        device_type: row.device_type ?? "",
        datasheet: row.datasheet ?? "",
        package: row.package ?? "",
        pin_count: row.pin_count ?? "",
        mount_type: row.mount_type ?? "",
        voltage: row.voltage ?? "",
        current: row.current ?? "",
        power: row.power ?? "",
        description: row.description ?? "",
        base_name: row.base_name ?? "",
        license: row.license ?? ""
      };
    });

    res.json(result);
  });
});

/* ---------- License API ---------- */

app.get("/api/license", (req, res) => {
  const sql = `
    SELECT license
    FROM symbols
    WHERE license IS NOT NULL AND license != ""
    LIMIT 1
  `;

  db.get(sql, [], (err, row) => {
    if (err) {
      console.log("License error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      license: row ? row.license : ""
    });
  });
});

/* ---------- Start server ---------- */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
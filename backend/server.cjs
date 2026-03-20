const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* ---------- Database ---------- */

// connect to database
const dbPath = path.join(__dirname, "../data/symbols.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log("Database connection failed:", err.message);
  } else {
    console.log("Database connected");
  }
});

/* ---------- Serve SVG files ---------- */

const svgFolder = path.join(__dirname, "../data/svgs");
app.use("/svgs", express.static(svgFolder));

/* ---------- Search API ---------- */

app.get("/api/search", (req, res) => {
  const q = req.query.q || "";       // get search text
  const search = `%${q}%`;           // for LIKE query

  const sql = `
    SELECT * FROM symbols
    WHERE symbol_name LIKE ?
       OR category LIKE ?
       OR device_type LIKE ?
    LIMIT 50
  `;

  db.all(sql, [search, search, search], (err, rows) => {
    if (err) {
      console.log("Search error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    // format data for frontend
    const result = rows.map((row) => {
      let tags = [];

      // convert tags safely
      if (row.tags) {
        try {
          tags = JSON.parse(row.tags);
        } catch {
          tags = row.tags.split(",");
        }
      }

      return {
        id: row.id,
        symbol_name: row.symbol_name || "",

        svg_url: row.svg_path
          ? `http://localhost:${PORT}/svgs/${row.svg_path}`
          : "",

        category: row.category || "",
        device_type: row.device_type || "",

        company: row.company || "",
        datasheet: row.datasheet || "",

        tags: tags,
        license: row.license || ""
      };
    });

    res.json(result);
  });
});

/* ---------- License API ---------- */

app.get("/api/license", (req, res) => {
  const sql = `
    SELECT license FROM symbols
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
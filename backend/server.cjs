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

/* ---------- Serve SVG + PNG files ---------- */

// SVGs
const svgFolder = path.join(__dirname, "../data/svgs");
app.use("/svgs", express.static(svgFolder));

// PNGs (FIXED)
const pngFolder = path.join(__dirname, "../data/images");
app.use("/images", express.static(pngFolder)); // ✅ FIX

console.log("Serving SVGs from:", svgFolder);
console.log("Serving PNGs from:", pngFolder); // ✅ FIX

/* ---------- Ship Parts (LOCAL DATA) ---------- */

const shipParts = [
  {
    id: "ship-1",
    symbol_name: "BMB Pump",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/BMB.png`
  },
  {
    id: "ship-2",
    symbol_name: "Valve",
    category: "Piping",
    png_url: `http://localhost:${PORT}/images/valve of force chest pump.png`
  },
  {
    id: "ship-3",
    symbol_name: "Pipe",
    category: "Piping",
    png_url: `http://localhost:${PORT}/images/Flowjet.png`
  },
  {
    id: "ship-4",
    symbol_name: "Flowjet",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/Flowjet.png`
  },
  {
    id: "ship-5",
    symbol_name: "Shaft",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/SHAFT.png`
  },
  {
    id: "ship-6",
    symbol_name: "Rudder Base",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/rudder_base_v2.png`
  },
  {
    id: "ship-7",
    symbol_name: "Anchor Bracket",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/Model Anchor Bracket in FreeCAD-Body.png`
  },
  {
    id: "ship-8",
    symbol_name: "Navigation Light",
    category: "Electrical",
    png_url: `http://localhost:${PORT}/images/NAV_LIGHT.png`
  },
  {
    id: "ship-9",
    symbol_name: "Smiglo",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/Smiglo.png`
  },
  {
    id: "ship-10",
    symbol_name: "Example Plate",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/Hibbeler_Example_1_2.png`
  }
];

/* ---------- Search API ---------- */

app.get("/api/search", (req, res) => {
  const q = req.query.q || "";

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

    /* ---------- DB RESULTS ---------- */
    const dbResults = rows.map((row) => {
      let svg_url;

      if (row.svg_path) {
        svg_url = `http://localhost:${PORT}/${row.svg_path}`;
      } else if (row.category?.toLowerCase().includes("connector")) {
        svg_url = `http://localhost:${PORT}/svgs/connector.svg`;
      } else {
        svg_url = `http://localhost:${PORT}/svgs/default.svg`;
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

    /* ---------- SHIP PARTS FILTER ---------- */
    const filteredShipParts = shipParts.filter(item =>
      item.symbol_name.toLowerCase().includes(q.toLowerCase())
    );

    /* ---------- FINAL RESPONSE ---------- */
    res.json([...filteredShipParts, ...dbResults]);
  });
});

/* ---------- Start server ---------- */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
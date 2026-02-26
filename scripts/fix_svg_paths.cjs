const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ABSOLUTE PATH TO DATABASE (THIS FIXES EVERYTHING)
const DB_PATH = path.join(
  __dirname,
  "..",
  "backend",
  "data",
  "symbols.db"
);

console.log("Using DB at:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Cannot open DB:", err.message);
    process.exit(1);
  }
});

db.all("SELECT rowid, svg_path FROM symbols", (err, rows) => {
  if (err) {
    console.error(" DB read error:", err.message);
    process.exit(1);
  }

  rows.forEach((row) => {
    let fixed = path.basename(row.svg_path || "");

    if (!fixed.endsWith(".svg")) {
      fixed += ".svg";
    }

    db.run(
      "UPDATE symbols SET svg_path = ? WHERE rowid = ?",
      [fixed, row.rowid],
      (err) => {
        if (err) {
          console.error("Update failed:", err.message);
        }
      }
    );
  });

  console.log("SVG paths fixed successfully");
  db.close();
});

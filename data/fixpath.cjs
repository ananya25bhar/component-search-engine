const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./symbols.db");

// get all svg files
const files = fs.readdirSync("./svgs");

db.all("SELECT id FROM symbols", (err, rows) => {
  if (err) return console.error(err);

  rows.forEach((row, index) => {
    const file = files[index]; // simple mapping

    if (!file) return;

    db.run(
      "UPDATE symbols SET svg_path = ? WHERE id = ?",
      [file, row.id]
    );
  });

  console.log(" SVG mapping completed!");
});
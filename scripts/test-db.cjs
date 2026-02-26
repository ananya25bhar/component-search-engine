const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Correct path to your DB in backend/data
const dbPath = path.resolve(__dirname, "../backend/data/symbols.db");
console.log("Trying to open DB at:", dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(" Failed to open DB:", err.message);
  } else {
    console.log(" DB opened successfully!");
  }
});

import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { detectComponentType, normalizeValue, buildTags } from "./utils.js";

const db = new sqlite3.Database("symbols.db");

const SVG_DIR = path.join(__dirname, "svgs"); // folder where all 26k SVGs are

const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith(".svg"));
console.log(`Found ${files.length} SVG files.`);

files.forEach(file => {
  const base = path.parse(file).name; // e.g. R1, C10
  const component = detectComponentType(base);
  const value = normalizeValue(base); // if your filenames include value
  const tags = buildTags(component, value);
  const svg_path = path.join("svgs", file); // relative path to SVG

  db.run(
    `INSERT OR REPLACE INTO symbols (reference, component_type, value_raw, value_normalized, tags, svg_path)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [base, component, base, value, tags, svg_path]
  );
});

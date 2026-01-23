import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import {
  detectComponentType,
  normalizeValue,
  buildTags
} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const symDir = path.join(__dirname, "../kicad-symbols");
const dbPath = path.join(__dirname, "../data/symbols.db");

const db = new sqlite3.Database(dbPath);

function getAllSymFiles(dir) {
  let files = [];
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(getAllSymFiles(full));
    } else if (file.endsWith(".kicad_sym")) {
      files.push(full);
    }
  }
  return files;
}

const symFiles = getAllSymFiles(symDir);
console.log(`Found ${symFiles.length} .kicad_sym files`);

const insert = db.prepare(`
  INSERT INTO symbols
  (name, reference, component_type, value_raw, value_normalized, tags, svg_path)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const file of symFiles) {
  const content = fs.readFileSync(file, "utf8");

  const refMatch = content.match(/property "Reference" "([^"]+)"/);
  const valMatch = content.match(/property "Value" "([^"]+)"/);

  const reference = refMatch?.[1] ?? "";
  const valueRaw = valMatch?.[1] ?? "";

  const component = detectComponentType(reference);
  const normalized = normalizeValue(valueRaw);
  const tags = buildTags(component, valueRaw);

  insert.run(
    path.basename(file, ".kicad_sym"),
    reference,
    component,
    valueRaw,
    normalized,
    tags,
    "" // svg linked later
  );
}

insert.finalize();
db.close();

console.log(" Metadata inserted");

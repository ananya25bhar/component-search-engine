import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const db = new sqlite3.Database("data/symbols.db");
const svgRoot = "data/svgs";

const COMPONENT_RULES = [
  { ref: "R", type: "resistor", tag: "res,ohm,resistance" },
  { ref: "C", type: "capacitor", tag: "cap,farad" },
  { ref: "L", type: "inductor", tag: "ind,coil" },
  { ref: "D", type: "diode", tag: "dio,rectifier" },
  { ref: "LED", type: "led", tag: "light,diode" }
];

function normalizeValue(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().replace("r", "");
  if (v.endsWith("k")) return parseFloat(v) * 1e3;
  if (v.endsWith("m")) return parseFloat(v) * 1e6;
  if (v.endsWith("n")) return parseFloat(v) * 1e-9;
  if (v.endsWith("u")) return parseFloat(v) * 1e-6;
  return parseFloat(v);
}

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith(".svg")) files.push(p);
  }
  return files;
}

const svgs = walk(svgRoot);

db.serialize(() => {
  const stmt = db.prepare(`
    INSERT INTO symbols
    (name, reference, component_type, value_raw, value_normalized, tags, svg_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const file of svgs) {
    const base = path.basename(file, ".svg");

    for (const rule of COMPONENT_RULES) {
      if (!base.startsWith(rule.ref)) continue;

      const valueMatch = base.match(/([0-9.]+[kmunr]?)/i);
      const raw = valueMatch?.[1] ?? null;

      stmt.run(
        rule.type,
        rule.ref,
        rule.type,
        raw,
        normalizeValue(raw),
        rule.tag,
        file.replace("data\\", "")
      );
    }
  }

  stmt.finalize();
  console.log(" Indexing complete");
});

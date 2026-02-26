// symbol_level_reconstruct_db.cjs
// Reconstruct DB at SYMBOL level (mentor requested)
// Each row = one KiCad symbol + optional SVG
// Folder structure:
// data/
//  ├─ symbol_level_reconstruct_db.cjs
//  ├─ symbols/   (*.kicad_sym libraries)
//  ├─ svgs/      (*.svg per symbol)
//  └─ symbols.db

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// ================= PATHS =================
const BASE_DIR = __dirname;
const SYMBOLS_DIR = path.join(BASE_DIR, 'symbols');
const SVGS_DIR = path.join(BASE_DIR, 'svgs');
const DB_PATH = path.join(BASE_DIR, 'symbols.db');
const BACKUP_DB_PATH = path.join(BASE_DIR, `symbols_backup_${Date.now()}.db`);

// ================= BACKUP =================
if (fs.existsSync(DB_PATH)) {
  fs.copyFileSync(DB_PATH, BACKUP_DB_PATH);
  console.log(`Existing DB backed up as ${BACKUP_DB_PATH}`);
}

const db = new sqlite3.Database(DB_PATH);

// ================= TABLE =================
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS symbols;`);
  db.run(`
    CREATE TABLE symbols (
      kid_symbol INTEGER PRIMARY KEY AUTOINCREMENT,
      kicad_file TEXT,
      symbol_name TEXT,
      name_and_path TEXT,
      svg_file TEXT,
      contents TEXT
    );
  `);
});

// ================= HELPERS =================
function getAllFiles(dir, ext) {
  let out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(getAllFiles(p, ext));
    else if (e.isFile() && e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function extractSymbols(kicadText) {
  const symbols = [];
  const regex = /\(symbol\s+"([^"]+)"[\s\S]*?\n\)/g;
  let m;
  while ((m = regex.exec(kicadText)) !== null) {
    symbols.push({ name: m[1], content: m[0] });
  }
  return symbols;
}

//  SVG MAP
const svgFiles = getAllFiles(SVGS_DIR, '.svg');
const svgMap = {};
svgFiles.forEach(p => {
  svgMap[path.basename(p, '.svg')] = path.relative(BASE_DIR, p);
});

//  PROCESS 
const kicadFiles = getAllFiles(SYMBOLS_DIR, '.kicad_sym');
const insert = db.prepare(`
  INSERT INTO symbols (kicad_file, symbol_name, name_and_path, svg_file, contents)
  VALUES (?, ?, ?, ?, ?)
`);

let count = 0;

for (const kicadPath of kicadFiles) {
  const relKicad = path.relative(BASE_DIR, kicadPath);
  const text = fs.readFileSync(kicadPath, 'utf8');
  const symbols = extractSymbols(text);

  symbols.forEach(sym => {
    const svg = svgMap[sym.name] || null;
    insert.run(
      relKicad,
      sym.name,
      `${sym.name} :: ${relKicad}`,
      svg,
      sym.content
    );
    count++;
  });
}

insert.finalize(() => {
  console.log(`Symbol-level DB rebuilt successfully`);
  console.log(`Total symbols inserted: ${count}`);
  db.close();
});

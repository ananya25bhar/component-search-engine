const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

//  PATHS
const BASE_DIR = __dirname;              // data/
const SYMBOLS_DIR = path.join(BASE_DIR, 'symbols');
const SVGS_DIR = path.join(BASE_DIR, 'svgs');
const DB_PATH = path.join(BASE_DIR, 'symbols.db');
const BACKUP_DB_PATH = path.join(
  BASE_DIR,
  `symbols_backup_${Date.now()}.db`
);

//  BACKUP DB 
if (fs.existsSync(DB_PATH)) {
  fs.copyFileSync(DB_PATH, BACKUP_DB_PATH);
  console.log(`Existing DB backed up as ${BACKUP_DB_PATH}`);
}

//  OPEN DB 
const db = new sqlite3.Database(DB_PATH);

//  RECREATE TABLE
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS symbols;`);

  db.run(`
    CREATE TABLE symbols (
      kid_symbol INTEGER PRIMARY KEY AUTOINCREMENT,
      kicad_file TEXT,
      name_and_path TEXT,
      svg_file TEXT,
      contents TEXT
    );
  `);
});

// HELPERS
function getAllFiles(dir, extension) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }
  return results;
}

//  READ FILES 
const kicadFiles = getAllFiles(SYMBOLS_DIR, '.kicad_sym');
const svgFiles = getAllFiles(SVGS_DIR, '.svg');

console.log('KiCad files found:', kicadFiles.length);
console.log('SVG files found:', svgFiles.length);

// MAP SVGs 
const svgMap = {};
svgFiles.forEach(svgPath => {
  const baseName = path.basename(svgPath, '.svg');
  svgMap[baseName] = path.relative(BASE_DIR, svgPath);
});

// INSERT DATA
const insertStmt = db.prepare(`
  INSERT INTO symbols (kicad_file, name_and_path, svg_file, contents)
  VALUES (?, ?, ?, ?)
`);

let insertedCount = 0;

kicadFiles.forEach(kicadPath => {
  const baseName = path.basename(kicadPath, '.kicad_sym');
  const relativeKicadPath = path.relative(BASE_DIR, kicadPath);
  const svgPath = svgMap[baseName] || null;
  const contents = fs.readFileSync(kicadPath, 'utf8');

  insertStmt.run(
    relativeKicadPath,
    relativeKicadPath,
    svgPath,
    contents
  );

  insertedCount++;
});

insertStmt.finalize(() => {
  console.log('Database rebuilt successfully!');
  console.log(`Total symbols inserted: ${insertedCount}`);
  db.close();
});
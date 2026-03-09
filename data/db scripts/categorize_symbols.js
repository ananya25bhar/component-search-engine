import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path (relative, not absolute)
const DB_PATH = path.join(__dirname, "../data/symbols.db");

// Check if DB exists
if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}`);
    process.exit(1);
}

// Open DB
const db = new Database(DB_PATH);

// Step 1: Add columns if missing
const columns = db.prepare(`PRAGMA table_info(symbols)`).all();
const columnNames = columns.map(c => c.name);

if (!columnNames.includes("category")) {
    db.prepare(`ALTER TABLE symbols ADD COLUMN category TEXT`).run();
    console.log("Added 'category' column");
}

if (!columnNames.includes("subcategory")) {
    db.prepare(`ALTER TABLE symbols ADD COLUMN subcategory TEXT`).run();
    console.log("Added 'subcategory' column");
}

// Step 2: Prepare update statement
const update = db.prepare(`
    UPDATE symbols
    SET category = ?, subcategory = ?
    WHERE id = ?
`);

// Step 3: Fetch all symbols
const rows = db.prepare(`SELECT id, name, component_type, tags FROM symbols`).all();
console.log(`Total symbols to categorize: ${rows.length}`);

// Step 4: Categorize each symbol
for (const r of rows) {

    const text = `${r.component_type || ""} ${r.tags || ""}`.toLowerCase();

    let category = "Other";
    let subcategory = "Other";

    if (text.includes("resistor") || text.includes("ohm") || text.match(/\b\d+k\b/)) {
        category = "Passive";
        subcategory = "Resistor";
    }
    else if (text.includes("capacitor") || text.includes("uf")) {
        category = "Passive";
        subcategory = "Capacitor";
    }
    else if (text.includes("diode")) {
        category = "Active";
        subcategory = "Diode";
    }
    else if (text.includes("transistor") || text.includes("mosfet") || text.includes("fet")) {
        category = "Active";
        subcategory = "Transistor";
    }
    else if (
        text.includes("voltage") ||
        text.includes("regulator") ||
        (r.name && r.name.match(/^\+\d+v/i))
    ) {
        category = "Power";
        subcategory = "Voltage Label";
    }

    update.run(category, subcategory, r.id);
}

// Step 5: Verification
const sample = db.prepare(`
    SELECT name, component_type, tags, category, subcategory
    FROM symbols
    LIMIT 30
`).all();

console.log("\nSample 30 categorized symbols:");
console.table(sample);

console.log("\nCategorization complete!");
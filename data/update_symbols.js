import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

// Paths
const DB_PATH = "symbols.db";
const SVG_DIR = path.join(".", "svgs");

// Open DB
const db = new Database(DB_PATH);

// 1. Add missing columns if needed
const columns = db.prepare(`PRAGMA table_info(symbols)`).all();
const columnNames = columns.map(c => c.name);

if (!columnNames.includes("category")) db.prepare(`ALTER TABLE symbols ADD COLUMN category TEXT`).run();
if (!columnNames.includes("subcategory")) db.prepare(`ALTER TABLE symbols ADD COLUMN subcategory TEXT`).run();
if (!columnNames.includes("svg_path")) db.prepare(`ALTER TABLE symbols ADD COLUMN svg_path TEXT`).run();

// 2. Categorization function
function categorize(row, filenameLower) {
    const text = `${row.component_type || ""} ${row.tags || ""} ${row.name || ""}`.toLowerCase();
    let category = "Other";
    let subcategory = "Other";

    // Power / Voltage Labels first
    if(text.includes("voltage") || text.includes("vcc") || text.includes("vdd") || text.includes("vss") ||
       text.includes("gnd") || row.name?.match(/^\+\d+v/i) || row.name?.match(/^\-\d+v/i)) {
        category = "Power";
        subcategory = "Voltage Label";
    }
    // ICs
    else if(
        text.startsWith("u") || text.startsWith("ic") ||
        text.includes("opamp") || text.includes("mux") ||
        text.includes("adc") || text.includes("dac") ||
        text.includes("clk") || text.includes("buffer") ||
        text.includes("logic")
    ) { category="IC"; subcategory="General"; }
    // Active components
    else if(text.includes("diode")) { category="Active"; subcategory="Diode"; }
    else if(text.includes("led")) { category="Active"; subcategory="LED"; }
    else if(text.includes("transistor") || text.includes("mosfet") || text.includes("fet")) { category="Active"; subcategory="Transistor"; }
    else if(text.includes("sw") || text.includes("button")) { category="Active"; subcategory="Switch"; }
    // Passive components
    else if(text.includes("resistor") || text.includes("ohm") || text.match(/\b\d+k\b/)) { category="Passive"; subcategory="Resistor"; }
    else if(text.includes("capacitor") || text.includes("uf") || text.includes("pf") || text.includes("nf")) { category="Passive"; subcategory="Capacitor"; }
    else if(text.includes("inductor") || text.includes("mh") || text.includes("uh")) { category="Passive"; subcategory="Inductor"; }
    else if(text.includes("xtal") || text.includes("crystal")) { category="Passive"; subcategory="Oscillator"; }
    // Misc / connectors / fuse
    else if(text.includes("conn") || text.includes("header") || text.includes("pin")) { category="Misc"; subcategory="Connector"; }
    else if(text.includes("fuse")) { category="Power"; subcategory="Fuse"; }

    // Fallback: infer from filename first letter
    if(category === "Other") {
        const firstChar = filenameLower[0];
        switch(firstChar) {
            case 'r': category="Passive"; subcategory="Resistor"; break;
            case 'c': category="Passive"; subcategory="Capacitor"; break;
            case 'l': category="Passive"; subcategory="Inductor"; break;
            case 'd': category="Active"; subcategory="Diode"; break;
            case 'u': category="IC"; subcategory="General"; break;
            case 'f': category="Power"; subcategory="Fuse"; break;
            case 'x': category="Passive"; subcategory="Oscillator"; break;
            case 's': category="Active"; subcategory="Switch"; break;
            default: category="Misc"; subcategory="Misc"; break;
        }
    }

    return { category, subcategory };
}

// 3. Fetch all symbols
const symbols = db.prepare(`SELECT * FROM symbols`).all();
const updateStmt = db.prepare(`UPDATE symbols SET category = ?, subcategory = ?, svg_path = ? WHERE id = ?`);

// 4. Map SVG files
const svgFiles = fs.readdirSync(SVG_DIR).filter(f => f.endsWith(".svg"));
const svgMap = {};
svgFiles.forEach(f => { svgMap[path.basename(f, ".svg").toLowerCase()] = `svgs/${f}`; });

// 5. Update symbols
const missingSVGs = [];
symbols.forEach(s => {
    const filenameLower = (s.reference || s.name || "").toLowerCase();
    const { category, subcategory } = categorize(s, filenameLower);

    let svgPath = svgMap[s.reference?.toLowerCase()] || svgMap[s.name?.toLowerCase()] || svgMap[filenameLower] || null;
    if(!svgPath) missingSVGs.push(s.name || s.reference);

    updateStmt.run(category, subcategory, svgPath, s.id);
});

// 6. Summary
console.log(`Updated ${symbols.length} symbols.`);
if(missingSVGs.length) console.log(`Symbols without matching SVGs (${missingSVGs.length}):`, missingSVGs);

db.close();

const fs = require("fs");
const path = require("path");

// PROJECT ROOT
const ROOT = path.resolve(__dirname, "..", "..");

// CONFIG
const SYMBOLS_DIR = path.join(ROOT, "data", "symbols"); // .kicad_sym files
const OUTPUT_DIR = path.join(ROOT, "data", "json_symbols");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// HELPER FUNCTIONS
function extractSymbols(content) {
  const symbols = [];
  let stack = [];
  let start = -1;

  for (let i = 0; i < content.length; i++) {
    if (content[i] === "(") {
      if (content.slice(i, i + 7) === "(symbol") {
        if (stack.length === 0) start = i;
      }
      stack.push("(");
    } else if (content[i] === ")") {
      stack.pop();
      if (stack.length === 0 && start !== -1) {
        symbols.push(content.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return symbols;
}

function extractPins(symbolBlock) {
  const pins = [];
  const pinRegex = /\(pin\s+[^)]*\(name\s+"([^"]+)"\)[^)]*\(number\s+"([^"]+)"\)/g;
  let match;

  while ((match = pinRegex.exec(symbolBlock)) !== null) {
    pins.push({ name: match[1], number: match[2] });
  }

  return pins;
}

function findDatasheet(contents) {
  const match = contents.match(/https?:\/\/[^\s")]+/);
  return match ? match[0] : "";
}

function detectMountType(contents) {
  const text = contents.toLowerCase();

  if (
    text.includes("smd") ||
    text.includes("soic") ||
    text.includes("qfn") ||
    text.includes("msop")
  )
    return "SMD";

  if (text.includes("dip")) return "Through Hole";

  return "Unknown";
}

function extractTags(contents) {
  if (!contents) return [];

  return contents
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 4 && isNaN(w))
    .slice(0, 8);
}

// PROCESS FILES
const files = fs.readdirSync(SYMBOLS_DIR).filter(f => f.endsWith(".kicad_sym"));

const allSymbols = [];

files.forEach(file => {

  const content = fs.readFileSync(
    path.join(SYMBOLS_DIR, file),
    "utf-8"
  );

  const symbolBlocks = extractSymbols(content);

  symbolBlocks.forEach(block => {

    const nameMatch = block.match(/\(symbol\s+"([^"]+)"/);
    if (!nameMatch) return;

    const symbolName = nameMatch[1];
    const pins = extractPins(block);
    const datasheet = findDatasheet(block);

    const jsonSymbol = {
      name: symbolName,
      company: "Unknown",
      category: "Unknown",
      device_type: "Unknown",
      voltage_rating: 0,
      current_rating: 0,
      power_rating: 0,
      package: "Unknown",
      pin_count: pins.length,
      mount_type: detectMountType(block),
      pins: pins,
      datasheet: datasheet,
      simulation_available: true,
      simulation_parameters: {},
      tags: extractTags(block)
    };

    // Write individual JSON
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${symbolName}.json`),
      JSON.stringify(jsonSymbol, null, 2)
    );

    allSymbols.push(jsonSymbol);

  });

});

// Write full JSON
fs.writeFileSync(
  path.join(ROOT, "data", "symbols.json"),
  JSON.stringify(allSymbols, null, 2)
);

console.log(`Done! ${allSymbols.length} symbols exported.`);
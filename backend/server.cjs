require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const Groq = require("groq-sdk");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

/* ---------- Database ---------- */

const dbPath = path.join(__dirname, "../data/symbols.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log("Database connection failed:", err.message);
  } else {
    console.log("Database connected");
  }
});

function getSymbolColumnSet(callback) {
  db.all("PRAGMA table_info(symbols)", [], (err, rows) => {
    if (err) return callback(err);
    return callback(null, new Set(rows.map((row) => row.name)));
  });
}

function existingColumns(columnSet, candidates) {
  return candidates.filter((col) => columnSet.has(col));
}

function symbolIdColumn(columnSet) {
  if (columnSet.has("kid_symbol")) return "kid_symbol";
  if (columnSet.has("id")) return "id";
  return "";
}

/* ---------- Static Files ---------- */

const svgFolder = path.join(__dirname, "../data/svgs");
const shippngFolder = path.join(__dirname, "../data/images");
const shipstepFolder = path.join(__dirname, "../data/ship_symbols");
const dronepngFolder = path.join(__dirname, "../data/drone_png");
const dronestepFolder = path.join(__dirname, "../data/drone_step");

app.use("/svgs", express.static(svgFolder));
app.use("/images", express.static(dronepngFolder));
app.use("/step", express.static(dronestepFolder));

console.log("Serving SVGs from:", svgFolder);
console.log("Serving PNGs from:", dronepngFolder);
console.log("Serving STEP files from:", dronestepFolder);

function fileUrl(route, fileName) {
  return `${BASE_URL}${route}/${encodeURIComponent(fileName)}`;
}

/* ---------- Category / Search Helpers ---------- */

function normalizeCategoryQuery(query) {
  const normalized = String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const aliases = {
    adc: "ADC",
    adcs: "ADC",
    amplifier: "Amplifier",
    amplifiers: "Amplifier",
    battery: "Battery",
    batteries: "Battery",
    resistor: "Resistor",
    resistors: "Resistor",
    ohm: "Resistor",
    ohms: "Resistor",
    resistance: "Resistor",
    capactor: "Capacitor",
    capacator: "Capacitor",
    capacitor: "Capacitor",
    capacitors: "Capacitor",
    condenser: "Capacitor",
    farad: "Capacitor",
    farads: "Capacitor",
    indactor: "Inductor",
    indactors: "Inductor",
    inductor: "Inductor",
    inductors: "Inductor",
    comparator: "Comparator",
    comparators: "Comparator",
    connector: "Connector",
    connectors: "Connector",
    dac: "DAC",
    dacs: "DAC",
    diode: "Diode",
    diodes: "Diode",
    fuse: "Fuse",
    fuses: "Fuse",
    led: "LED",
    leds: "LED",
    logic: "Logic",
    memory: "Memory",
    microcontroller: "Microcontroller",
    microcontrollers: "Microcontroller",
    motor: "Motor",
    motors: "Motor",
    opam: "OpAmp",
    opams: "OpAmp",
    opamp: "OpAmp",
    opamps: "OpAmp",
    operationalamplifier: "OpAmp",
    oscillator: "Oscillator",
    oscillators: "Oscillator",
    power: "Power",
    register: "Register",
    registers: "Register",
    regulator: "Regulator",
    regulators: "Regulator",
    relay: "Relay",
    relays: "Relay",
    switch: "Switch",
    switches: "Switch",
    transistor: "Transistor",
    transistors: "Transistor",
    transformer: "Transformer",
    transformers: "Transformer",
  };

  return aliases[normalized] || query;
}

function unitForCategory(category) {
  const units = {
    Resistor: "Ohm",
    Capacitor: "Farad",
    Inductor: "Henry",
    OpAmp: "Decibel",
    Register: "Bit",
    Regulator: "Volt",
    Comparator: "Volt",
    ADC: "Bit",
    DAC: "Bit",
    Diode: "Volt",
    LED: "Volt",
    Transistor: "Ampere",
    Connector: "Pins",
    Switch: "Ampere",
    Relay: "Volt",
    Transformer: "Watt",
    Fuse: "Ampere",
    Oscillator: "Hertz",
    Motor: "RPM",
    Battery: "Volt",
    Power: "Volt",
    Sensor: "Unit",
    Microcontroller: "Megahertz",
    Memory: "Megabyte",
    Logic: "Volt",
    Amplifier: "Decibel",
  };

  return units[category] || "Unit";
}

function escapeLike(value) {
  return String(value || "").replace(/([_%\\])/g, "\\$1");
}

const CATEGORY_ALIASES = {
  adc: "ADC",
  adcs: "ADC",
  amplifier: "Amplifier",
  amplifiers: "Amplifier",
  battery: "Battery",
  batteries: "Battery",
  resistor: "Resistor",
  resistors: "Resistor",
  resistance: "Resistor",
  capacitor: "Capacitor",
  capacitors: "Capacitor",
  capactor: "Capacitor",
  capacator: "Capacitor",
  condenser: "Capacitor",
  capacitance: "Capacitor",
  inductor: "Inductor",
  inductors: "Inductor",
  indactor: "Inductor",
  indactors: "Inductor",
  inductance: "Inductor",
  choke: "Inductor",
  chokes: "Inductor",
  coil: "Inductor",
  coils: "Inductor",
  comparator: "Comparator",
  comparators: "Comparator",
  connector: "Connector",
  connectors: "Connector",
  dac: "DAC",
  dacs: "DAC",
  diode: "Diode",
  diodes: "Diode",
  fuse: "Fuse",
  fuses: "Fuse",
  led: "LED",
  leds: "LED",
  logic: "Logic",
  memory: "Memory",
  microcontroller: "Microcontroller",
  microcontrollers: "Microcontroller",
  motor: "Motor",
  motors: "Motor",
  opamp: "OpAmp",
  opamps: "OpAmp",
  oscillator: "Oscillator",
  oscillators: "Oscillator",
  power: "Power",
  register: "Register",
  registers: "Register",
  regulator: "Regulator",
  regulators: "Regulator",
  relay: "Relay",
  relays: "Relay",
  switch: "Switch",
  switches: "Switch",
  transistor: "Transistor",
  transistors: "Transistor",
  transformer: "Transformer",
  transformers: "Transformer",
};

const PARAMETER_KIND_BY_CATEGORY = {
  Resistor: ["resistance"],
  Capacitor: ["capacitance"],
  Inductor: ["inductance", "resistance"],
  Amplifier: ["gain"],
  OpAmp: ["gain"],
};

const CATEGORY_SEARCH_TERMS = {
  Resistor: ["resistor", "resistance", "ohm", "ohms"],
  Capacitor: ["capacitor", "capacitance", "farad", "farads"],
  Inductor: ["inductor", "inductance", "choke", "coil", "henry", "henries"],
  Amplifier: ["amplifier", "gain", "decibel", "dB"],
  OpAmp: ["opamp", "op amp", "amplifier", "gain", "decibel", "dB"],
};

function normalizeParameterNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toPrecision(12)).toString();
}

function normalizeParameterUnit(rawUnit, expectedKinds = []) {
  const raw = String(rawUnit || "").trim();
  const compact = raw.replace(/\s+/g, "").replace(/\u03a9/g, "ohm").replace(/\u00b5/g, "u");
  const lower = compact.toLowerCase();
  const expected = new Set(expectedKinds);

  if (/^db$/.test(lower)) return { kind: "gain", label: "Gain", multiplier: 1, unit: "dB" };

  if (/^(v|vac|vdc|volt|volts)$/.test(lower)) {
    return {
      kind: "voltage",
      label: "Voltage",
      multiplier: 1,
      unit: raw.toUpperCase() === "VAC" || raw.toUpperCase() === "VDC" ? raw.toUpperCase() : "V",
    };
  }
  if (/^mv$/.test(lower)) return { kind: "voltage", label: "Voltage", multiplier: 1e-3, unit: "mV" };
  if (/^kv$/.test(lower)) return { kind: "voltage", label: "Voltage", multiplier: 1e3, unit: "kV" };

  if (/^(a|amp|amps|ampere|amperes)$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1, unit: "A" };
  if (/^ma$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1e-3, unit: "mA" };
  if (/^(ua|microa|microamp|microamps|microampere|microamperes)$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1e-6, unit: "uA" };
  if (/^ka$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1e3, unit: "kA" };

  if (/^(w|watt|watts)$/.test(lower)) return { kind: "power", label: "Power", multiplier: 1, unit: "W" };
  if (/^mw$/.test(lower)) return { kind: "power", label: "Power", multiplier: 1e-3, unit: "mW" };
  if (/^kw$/.test(lower)) return { kind: "power", label: "Power", multiplier: 1e3, unit: "kW" };

  if (/^(hz|hertz)$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1, unit: "Hz" };
  if (/^khz$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1e3, unit: "kHz" };
  if (/^mhz$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1e6, unit: "MHz" };
  if (/^ghz$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1e9, unit: "GHz" };

  if (/^rpm$/.test(lower)) return { kind: "speed", label: "Speed", multiplier: 1, unit: "RPM" };
  if (/^(bit|bits)$/.test(lower)) return { kind: "resolution", label: "Resolution", multiplier: 1, unit: "bit" };
  if (/^(b|byte|bytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1, unit: "B" };
  if (/^(kb|kbyte|kbytes|kilobyte|kilobytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e3, unit: "kB" };
  if (/^(mb|mbyte|mbytes|megabyte|megabytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e6, unit: "MB" };
  if (/^(gb|gbyte|gbytes|gigabyte|gigabytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e9, unit: "GB" };
  if (/^(kbit|kbits)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e3, unit: "kbit" };
  if (/^(mbit|mbits)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e6, unit: "Mbit" };
  if (/^(gbit|gbits)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e9, unit: "Gbit" };

  if (/^(h|henry|henries)$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1, unit: "H" };
  if (/^mh$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1e-3, unit: "mH" };
  if (/^(uh|microh|microhenry|microhenries)$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1e-6, unit: "uH" };
  if (/^nh$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1e-9, unit: "nH" };

  if (/^(f|farad|farads)$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1, unit: "F" };
  if (/^mf$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-3, unit: "mF" };
  if (/^(uf|microf|microfarad|microfarads)$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-6, unit: "uF" };
  if (/^nf$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-9, unit: "nF" };
  if (/^pf$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-12, unit: "pF" };

  if (/^(ohm|ohms)$/.test(lower)) return { kind: "resistance", label: "Resistance", multiplier: 1, unit: "Ohm" };
  if (/^k(ohm|ohms)?$/.test(lower)) return { kind: "resistance", label: "Resistance", multiplier: 1e3, unit: "kOhm" };
  if (/^(meg|mega)(ohm|ohms)?$/.test(lower)) return { kind: "resistance", label: "Resistance", multiplier: 1e6, unit: "MOhm" };
  if (/^m(ohm|ohms)$/.test(lower)) {
    return raw.startsWith("M")
      ? { kind: "resistance", label: "Resistance", multiplier: 1e6, unit: "MOhm" }
      : { kind: "resistance", label: "Resistance", multiplier: 1e-3, unit: "mOhm" };
  }
  if (lower === "k" && expected.has("resistance")) {
    return { kind: "resistance", label: "Resistance", multiplier: 1e3, unit: "kOhm" };
  }
  if (lower === "m" && expected.has("resistance")) {
    return raw.startsWith("M")
      ? { kind: "resistance", label: "Resistance", multiplier: 1e6, unit: "MOhm" }
      : { kind: "resistance", label: "Resistance", multiplier: 1e-3, unit: "mOhm" };
  }

  return null;
}

function parameterCanonical(kind, value) {
  const normalized = normalizeParameterNumber(value);
  return normalized ? `${kind}:${normalized}` : null;
}

function parseComponentCategory(query) {
  const text = String(query || "").toLowerCase();
  if (/\bop\s*amp(s)?\b/.test(text) || /\boperational\s+amplifier(s)?\b/.test(text)) {
    return "OpAmp";
  }

  const words = text.match(/[a-z]+/g) || [];
  for (const word of words) {
    if (CATEGORY_ALIASES[word]) return CATEGORY_ALIASES[word];
  }

  return null;
}

function parseParameterValues(text, expectedKinds = []) {
  const values = [];
  const seen = new Set();
  const pattern = /(\d+(?:\.\d+)?)\s*([a-zA-Z\u00b5\u03a9]+(?:\s*ohms?)?|\u03a9)(?=$|[^a-zA-Z\u00b5\u03a9])/g;

  for (const match of String(text || "").matchAll(pattern)) {
    const unit = normalizeParameterUnit(match[2], expectedKinds);
    if (!unit) continue;

    const baseValue = Number(match[1]) * unit.multiplier;
    const canonical = parameterCanonical(unit.kind, baseValue);
    if (!canonical || seen.has(canonical)) continue;

    seen.add(canonical);
    values.push({
      kind: unit.kind,
      label: unit.label,
      raw: match[0],
      display: `${match[1]}${unit.unit}`,
      canonical,
    });
  }

  return values;
}

function parseParameterSearch(query) {
  const category = parseComponentCategory(query);
  const expectedKinds = category ? PARAMETER_KIND_BY_CATEGORY[category] || [] : [];

  return {
    category,
    values: parseParameterValues(query, expectedKinds),
  };
}

function parameterSearchTerms(query) {
  const text = String(query || "").trim();
  const lower = text.toLowerCase();
  const compact = lower.replace(/\s+/g, "");
  const parsed = parseParameterSearch(text);
  const terms = [
    text,
    parsed.category,
    ...parsed.values.flatMap((value) => [
      value.raw,
      value.display,
      value.raw.replace(/\s+/g, ""),
      value.display.replace(/\s+/g, ""),
    ]),
  ];

  const addTerms = (...values) => {
    values.forEach((value) => {
      if (value && !terms.some((term) => term.toLowerCase() === value.toLowerCase())) {
        terms.push(value);
      }
    });
  };

  if (/(^|\d|\s)(m|k|meg)?(ohm|ohms|\u03a9)\b/i.test(text) || lower.includes("ohm")) {
    addTerms("ohm", "ohms", "resistor", "resistance");
  }

  if (/\d+(?:\.\d+)?\s*(p|n|u|\u00b5|m)?f\b/i.test(compact) || /farads?\b/i.test(text)) {
    addTerms("farad", "farads", "capacitor", "capacitance");
  }

  if (/\d+(?:\.\d+)?\s*(n|u|\u00b5|m)?h\b/i.test(compact) || /henr(?:y|ies)\b/i.test(text)) {
    addTerms("henry", "henries", "inductor", "inductance");
  }

  if (/\d+(?:\.\d+)?\s*db\b/i.test(compact) || /\bdb\b/i.test(text)) {
    addTerms("dB", "decibel", "gain", "attenuation", "amplifier", "filter");
  }

  if (parsed.category && CATEGORY_SEARCH_TERMS[parsed.category]) {
    addTerms(...CATEGORY_SEARCH_TERMS[parsed.category]);
  }

  return terms.filter(Boolean);
}

/* ---------- License Helpers ---------- */

const licenseFilePath = path.join(__dirname, "../data/symbols/LICENSE.md");

function plainMarkdown(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[_*`#>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readLicenseInfo() {
  const fallbackAnalysis = {
    license_name: "Creative Commons CC-BY-SA 4.0 with KiCad exception",
    license_type: "CC-BY-SA-4.0 with KiCad exception",
    category: "Share-alike content license with KiCad design exception",
    commercial_use: true,
    private_use: true,
    redistribution:
      "Redistributed KiCad library collections, including modified collections, must be shared under the same license and retain attribution/license documents.",
    attribution_required: true,
  };

  const fallback = {
    title: "KiCad Libraries License",
    name: "Creative Commons CC-BY-SA 4.0 with KiCad exception",
    license_type: "CC-BY-SA-4.0 with KiCad exception",
    url: "https://creativecommons.org/licenses/by-sa/4.0/legalcode",
    source_file: "data/symbols/LICENSE.md",
    summary:
      "KiCad library data can be used in commercial, closed, and non-commercial designs without requiring design files to use the same license.",
    attribution_required: true,
    attribution_requirements:
      "Attribution/license documents must be retained when redistributing KiCad libraries or modified library collections. Attribution is not required inside designs that merely use the library data.",
    exception:
      "The KiCad exception waives share-alike requirements for electronic designs and generated files that use the library data.",
    redistribution: fallbackAnalysis.redistribution,
    warranty: "Provided without warranty of any kind.",
    license_analysis: fallbackAnalysis,
    full_text: "",
  };

  try {
    const fullText = fs.readFileSync(licenseFilePath, "utf8");
    const lines = fullText.split(/\r?\n/).map((line) => line.trim());

    const title = plainMarkdown(lines.find((line) => line.startsWith("###")) || fallback.title);
    const licenseLine = lines.find((line) => line.includes("Creative Commons CC-BY-SA 4.0 License"));
    const exceptionLine = lines.find((line) => line.includes("waives article 3"));
    const summaryLine = lines.find((line) => line.includes("free use of library data"));
    const redistributionLine = lines.find((line) => line.includes("if you wish to redistribute"));
    const warrantyLine = lines.find((line) => line.includes("provided without warranty"));

    const licenseName = licenseLine ? fallback.name : fallback.name;
    const licenseType = licenseLine ? fallback.license_type : fallback.license_type;
    const redistribution = plainMarkdown(redistributionLine) || fallback.redistribution;

    return {
      ...fallback,
      title,
      name: licenseName,
      license_type: licenseType,
      summary: plainMarkdown(summaryLine) || fallback.summary,
      exception: plainMarkdown(exceptionLine) || fallback.exception,
      redistribution,
      warranty: plainMarkdown(warrantyLine) || fallback.warranty,
      license_analysis: {
        license_name: licenseName,
        license_type: licenseType,
        category: exceptionLine
          ? "Share-alike content license with KiCad design exception"
          : fallbackAnalysis.category,
        commercial_use:
          fullText.includes("commercial, closed, and non-commercial projects without restriction") ||
          fallbackAnalysis.commercial_use,
        private_use:
          fullText.includes("your own projects without the obligation to share your project files") ||
          fallbackAnalysis.private_use,
        redistribution,
        attribution_required:
          fullText.includes("retain attribution information") ||
          fallbackAnalysis.attribution_required,
      },
      full_text: fullText,
    };
  } catch (error) {
    console.log("License read error:", error.message);
    return fallback;
  }
}

const kicadLicenseInfo = readLicenseInfo();

function licenseInfoForSymbol(row = {}) {
  const license = String(row.license || "").trim();
  const hasSvgAsset = Boolean(row.svg_path || row.svg_file);
  const isExplicitKicadLicense =
    license === kicadLicenseInfo.name || license === kicadLicenseInfo.license_type;
  const isLegacyKicadSvgLicense = license === "Open/Generic" && hasSvgAsset;

  if (isExplicitKicadLicense || isLegacyKicadSvgLicense) {
    return kicadLicenseInfo;
  }

  return {
    title: "Symbol License",
    name: license || "Not specified",
    license_type: license || "Not specified",
    url: "",
    source_file: "",
    summary: "",
    attribution_required: false,
    attribution_requirements:
      "No attribution requirements were found in the backend metadata for this SVG.",
    exception: "",
    redistribution: "",
    warranty: "",
    license_analysis: {
      license_name: license || "Not specified",
      license_type: license || "Not specified",
      category: "Unknown",
      commercial_use: false,
      private_use: false,
      redistribution: "",
      attribution_required: false,
    },
    full_text: "",
  };
}

/* ---------- Ship Parts ---------- */

const shipParts = [
  { id: "1",  symbol_name: "BMB Pump",         category: "Mechanical", png_url: fileUrl("/images", "bmb.png"),               step_url: fileUrl("/step", "BMB.step") },
  { id: "2",  symbol_name: "Valve",             category: "Piping",     png_url: fileUrl("/images", "valve.png"),             step_url: fileUrl("/step", "valve.step") },
  { id: "3",  symbol_name: "Flowjet",           category: "Piping",     png_url: fileUrl("/images", "Flowjet.png"),           step_url: fileUrl("/step", "Flowjet.step") },
  { id: "4",  symbol_name: "Last Model",        category: "Structure",  png_url: fileUrl("/images", "last1.png"),             step_url: fileUrl("/step", "last1.step") },
  { id: "5",  symbol_name: "Shaft",             category: "Mechanical", png_url: fileUrl("/images", "shaft.png"),             step_url: fileUrl("/step", "shaft.step") },
  { id: "6",  symbol_name: "Rudder Base",       category: "Structure",  png_url: fileUrl("/images", "rudder_base.png"),       step_url: fileUrl("/step", "rudder_base.step") },
  { id: "7",  symbol_name: "Anchor Bracket",    category: "Structure",  png_url: fileUrl("/images", "anchor_bracket.png"),    step_url: fileUrl("/step", "anchor_bracket.step") },
  { id: "8",  symbol_name: "Navigation Light",  category: "Electrical", png_url: fileUrl("/images", "nav_light.png"),         step_url: fileUrl("/step", "NAV LIGHT.step") },
  { id: "9",  symbol_name: "Smiglo",            category: "Mechanical", png_url: fileUrl("/images", "Smiglo.png"),            step_url: fileUrl("/step", "Smiglo.step") },
  { id: "10", symbol_name: "Hibbeler Plate",    category: "Structure",  png_url: fileUrl("/images", "hibbeler_plate.png"),    step_url: fileUrl("/step", "hibbeler_plate.step") },
  { id: "11", symbol_name: "Pipe Elbow",        category: "Piping",     png_url: fileUrl("/images", "pipe_elbow.png"),        step_url: fileUrl("/step", "pipe_elbow.step") },
  { id: "12", symbol_name: "Tee Joint",         category: "Piping",     png_url: fileUrl("/images", "tee_joint.png"),         step_url: fileUrl("/step", "tee_joint.step") },
  { id: "13", symbol_name: "Flange",            category: "Piping",     png_url: fileUrl("/images", "Flange.png"),            step_url: fileUrl("/step", "Flange.step") },
  { id: "14", symbol_name: "Cable Ladder",      category: "Structure",  png_url: fileUrl("/images", "Cable ladder.png"),      step_url: fileUrl("/step", "Cable ladder.step") },
  { id: "15", symbol_name: "gearbox",           category: "Mechanical", png_url: fileUrl("/images", "gearbox.png"),           step_url: fileUrl("/step", "gear.step") },
  { id: "16", symbol_name: "Fuel Pump",         category: "Mechanical", png_url: fileUrl("/images", "fuelPump.png"),          step_url: fileUrl("/step", "fuelPump.step") },
  { id: "17", symbol_name: "Assembly",          category: "Structure",  png_url: fileUrl("/images", "assembly.png"),          step_url: fileUrl("/step", "final assembly.step") },
  { id: "18", symbol_name: "Winch",             category: "Mechanical", png_url: fileUrl("/images", "winch.png"),             step_url: fileUrl("/step", "12V Mini Winch v1.step") },
  { id: "19", symbol_name: "Deck Plate",        category: "Structure",  png_url: fileUrl("/images", "deck_plate.png"),        step_url: fileUrl("/step", "2T_DECK_PLATE.step") },
  { id: "20", symbol_name: "Bulkhead Plug Box", category: "Structure",  png_url: fileUrl("/images", "bulkhead_plugbox.png"),  step_url: fileUrl("/step", "BulkHead Plug Back Box.step") },
  { id: "21", symbol_name: "Rocket Nozzle",     category: "Mechanical", png_url: fileUrl("/images", "rocket_nozzle.png"),     step_url: fileUrl("/step", "rocket_nozzle.step") },
  { id: "22", symbol_name: "Pump Housing",      category: "Mechanical", png_url: fileUrl("/images", "pumpengehäuse.png"),     step_url: fileUrl("/step", "Pumpengehäuse.step") },
  { id: "23", symbol_name: "Anchor Chain",      category: "Mechanical", png_url: fileUrl("/images", "anchor_chain.png"),      step_url: fileUrl("/step", "anchor_chain.step") },
  { id: "24", symbol_name: "ship structure",    category: "Mechanical", png_url: fileUrl("/images", "ship_structure.png"),    step_url: fileUrl("/step", "ship_structure.step") },
];

const droneParts = [
  {
    id: "D1",
    symbol_name: "Accelerometer",
    category: "Flight Control",
    png_url: fileUrl("/images", "accelerometer.png"),
    step_url: fileUrl("/step", "accelerometer.step")
  },
  {
    id: "D2",
    symbol_name: "Altitude_sensor",
    category: "Navigation",
    png_url: fileUrl("/images", "Altitude_sensor.png"),
    step_url: fileUrl("/step", "Altitude_sensor.step")
  },
  {
    id: "D3",
    symbol_name: "GNSS Module CAN BK-345",
    category: "Navigation",
    png_url: fileUrl("/images", "GNSS Module CAN BK-345.png"),
    step_url: fileUrl("/step", "GNSS Module CAN BK-345.step")
  },
  {
    id: "D4",
    symbol_name: "Li-Po 3S 1500mAh Battery",
    category: "Power",
    png_url: fileUrl("/images", "Li-po 3S 1500mAh.png"),
    step_url: fileUrl("/step", "Li-po 3S 1500mAh.step")
  },
  {
    id: "D5",
    symbol_name: "Magnetometer",
    category: "Navigation",
    png_url: fileUrl("/images", "magnetometer.png"),
    step_url: fileUrl("/step", "magnetometer.step")
  },
  {
    id: "D6",
    symbol_name: "Pinpoint Mount",
    category: "Mechanical",
    png_url: fileUrl("/images", "Pinpoint Mount (print 2x).png"),
    step_url: fileUrl("/step", "Pinpoint Mount (print 2x).step")
  },
  {
    id: "D7",
    symbol_name: "Propeller Guard",
    category: "Mechanical",
    png_url: fileUrl("/images", "Prop Guard right.png"),
    step_url: fileUrl("/step", "Prop Guard right.step")
  },
  {
    id: "D8",
    symbol_name: "Radio Transmitter",
    category: "Communication",
    png_url: fileUrl("/images", "Radio_Transmitter.png"),
    step_url: fileUrl("/step", "Radio_Transmitter.step")
  },
  {
    id: "D9",
    symbol_name: "RF Antenna",
    category: "Communication",
    png_url: fileUrl("/images", "RF_antenna.png"),
    step_url: fileUrl("/step", "RF_antenna.step")
  },
  {
    id: "D10",
    symbol_name: "Voltage Regulator",
    category: "Power",
    png_url: fileUrl("/images", "Voltage Regulator.png"),
    step_url: fileUrl("/step", "Voltage Regulator.step")
  },
  {
  id: "D11",
  symbol_name: "Axis Drone",
  category: "Structure",
  png_url: fileUrl("/images", "axis_drone.png"),
  step_url: fileUrl("/step", "axis_drone.step")
},
{
  id: "D12",
  symbol_name: "Control Valves",
  category: "Mechanical",
  png_url: fileUrl("/images", "contol_valves.png"),
  step_url: fileUrl("/step", "contol_valves.step")
},
{
  id: "D13",
  symbol_name: "Drone Main Body",
  category: "Structure",
  png_url: fileUrl("/images", "drone_main.png"),
  step_url: fileUrl("/step", "drone_main.step")
} 
];

// Canonical STEP filenames (from file 1, the more complete list)
const shipStepFiles = {
  "1":  "BMB.STEP",
  "2":  "valve of force chest pump.stp",
  "3":  "Flowjet Pump-Filter-Elbow Assembly.STEP",
  "4":  "last1 (1).STEP",
  "5":  "COUPLING SHAFT (1).step",
  "6":  "rudder_base_v2 (1).stp",
  "7":  "Model Anchor Bracket in FreeCAD-Body (1).step",
  "8":  "NAV LIGHT.stp",
  "9":  "Smiglo.STEP",
  "10": "Hibbeler_Example_1_2 (1).stp",
  "11": "pipe_elbow.STEP",
  "12": "tee_joint.stp",
  "13": "Flange.STEP",
  "14": "Cable ladder.STEP",
  "16": "fuelPump.STEP",
  "17": "assembly.STEP",
  "18": "Winch.step",
  "19": "DECK PLATE.stp",
  "20": "BulkHead Plug Back Box.step",
  "21": "rocket_nozzle.step",
  "22": "pump_housing.stp",
  "23": "anchor_chain.stp",
  "24": "ship_structutre.STEP",
};

/* ---------- Normalization ---------- */

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;

  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Split plain text tags below.
  }

  return String(tags)
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function ratingValue(textValue, numericValue) {
  if (textValue !== undefined && textValue !== null && textValue !== "") return textValue;
  if (numericValue !== undefined && numericValue !== null && numericValue !== 0) return numericValue;
  return "";
}

function cleanValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isKnownValue(value) {
  const text = cleanValue(value);
  return text && text !== "0" && text.toLowerCase() !== "yes";
}

function addComponentValue(values, seen, label, value) {
  const clean = cleanValue(value);
  if (!clean) return;

  const key = `${label}:${clean}`.toLowerCase();
  if (seen.has(key)) return;

  seen.add(key);
  values.push({ label, value: clean });
}

function componentValues(row) {
  const values = [];
  const seen = new Set();
  const categoryKey = String(row.category || "").toLowerCase();
  const text = [
    row.symbol_name,
    row.base_name,
    row.name,
    row.category,
    row.device_type,
    row.description,
    row.keywords,
    row.tags,
    row.package,
  ]
    .filter(Boolean)
    .join(" ");

  if (categoryKey === "connector" && isKnownValue(row.pin_count)) {
    addComponentValue(values, seen, "Pins", row.pin_count);
  }

  if (isKnownValue(row.voltage)) addComponentValue(values, seen, "Voltage", row.voltage);
  if (isKnownValue(row.current)) addComponentValue(values, seen, "Current", row.current);
  if (isKnownValue(row.power)) addComponentValue(values, seen, "Power", row.power);

  parseParameterValues(text).forEach((value) => {
    addComponentValue(values, seen, value.label, value.display);
  });

  if (/\bunity gain\b/i.test(text)) {
    addComponentValue(values, seen, "Gain", "Unity gain");
  }

  return values;
}

function rowTags(row) {
  const tags = normalizeTags(row.tags);
  return tags.length ? tags : normalizeTags(row.keywords || row.description || row.category);
}

function publicSvgUrl(row) {
  const svgPath = row.svg_path || row.svg_file;
  return fileUrl("/svgs", svgPath ? path.basename(svgPath) : "default.svg");
}

function normalizeDbRow(row) {
  const category = row.category || "";
  const licenseInfo = licenseInfoForSymbol(row);

  return {
    id: row.id ?? row.kid_symbol,
    kid_symbol: row.kid_symbol ?? row.id,
    symbol_name: row.symbol_name || row.name || row.base_name || "",
    name: row.name || "",
    base_name: row.base_name || "",
    name_and_path: row.name_and_path || "",
    kicad_file: row.kicad_file || "",
    svg_file: row.svg_file || "",
    svg_path: row.svg_path || "",
    svg_url: publicSvgUrl(row),
    company: row.company || "",
    category,
    subcategory: row.subcategory || "",
    device_type: row.device_type || "",
    unit: row.unit || unitForCategory(category),
    description: row.description || "",
    keywords: row.keywords || "",
    package: row.package || "",
    pin_count: row.pin_count ?? "",
    mount_type: row.mount_type || "",
    voltage_rating: ratingValue(row.voltage, row.voltage_rating),
    current_rating: ratingValue(row.current, row.current_rating),
    power_rating: ratingValue(row.power, row.power_rating),
    voltage: ratingValue(row.voltage, row.voltage_rating),
    current: ratingValue(row.current, row.current_rating),
    power: ratingValue(row.power, row.power_rating),
    component_values: componentValues(row),
    datasheet: row.datasheet || "",
    simulation_available: Boolean(row.simulation_available),
    simulation_parameters: row.simulation_parameters || "",
    tags: rowTags(row),
    license: licenseInfo.name,
    license_info: licenseInfo,
    license_analysis: licenseInfo.license_analysis,
  };
}

function normalizeShipPart(item) {
  const stepFile = shipStepFiles[item.id];

  return {
    company: "",
    unit: "",
    package: "",
    pin_count: "",
    mount_type: "",
    voltage_rating: "",
    current_rating: "",
    power_rating: "",
    voltage: "",
    current: "",
    power: "",
    datasheet: "",
    description: "",
    device_type: "Ship Part",
    simulation_available: false,
    tags: [],
    license: "Local/Open",
    license_info: {
      title: "Local Ship Part Asset",
      name: "Local/Open",
      license_type: "Local/Open",
      url: "",
      source_file: "",
      summary: "This asset is served from the local ship parts dataset.",
      attribution_required: false,
      attribution_requirements:
        "No attribution requirements were found in the backend metadata for this local asset.",
      exception: "",
      redistribution: "Check the source model before redistributing outside this app.",
      warranty: "Provided without warranty of any kind.",
      license_analysis: {
        license_name: "Local/Open",
        license_type: "Local/Open",
        category: "Local asset",
        commercial_use: false,
        private_use: true,
        redistribution: "Check the source model before redistributing outside this app.",
        attribution_required: false,
      },
      full_text: "",
    },
    ...item,
    step_url: stepFile ? fileUrl("/step", stepFile) : item.step_url || null,
  };
}

function normalizeDronePart(item) {
  return {
    company: "",
    unit: "",
    package: "",
    pin_count: "",
    mount_type: "",
    voltage_rating: "",
    current_rating: "",
    power_rating: "",
    voltage: "",
    current: "",
    power: "",
    datasheet: "",
    description: "",
    device_type: "Drone Part",
    simulation_available: false,
    tags: [],
    license: "Local/Open",
    ...item
  };
}

function searchableRowText(row) {
  return [
    row.symbol_name,
    row.base_name,
    row.name,
    row.category,
    row.device_type,
    row.description,
    row.keywords,
    row.tags,
    row.package,
    row.contents,
    row.voltage,
    row.current,
    row.power,
  ]
    .filter(Boolean)
    .join(" ");
}

function rowMatchesComponentCategory(row, category) {
  if (!category) return true;
  if (String(row.category || "").toLowerCase() === category.toLowerCase()) return true;

  const text = searchableRowText(row).toLowerCase();
  if (category === "Resistor")  return /\b(resistors?|resistance|ohms?)\b/i.test(text);
  if (category === "Capacitor") return /\b(capacitors?|capacitance|farads?)\b/i.test(text);
  if (category === "Inductor")  return /\b(inductors?|inductance|chokes?|coils?|ferrite)\b/i.test(text);
  if (category === "OpAmp")     return /\b(op\s*amps?|operational\s+amplifiers?)\b/i.test(text);
  if (category === "Amplifier") return /\b(amplifiers?|gain|decibels?)\b/i.test(text);

  return false;
}

function rowMatchesParameterSearch(row, parsedSearch) {
  if (!parsedSearch.category && parsedSearch.values.length === 0) return true;
  if (!rowMatchesComponentCategory(row, parsedSearch.category)) return false;
  if (parsedSearch.values.length === 0) return true;

  const expectedKinds = parsedSearch.category
    ? PARAMETER_KIND_BY_CATEGORY[parsedSearch.category] || []
    : [];
  const rowValues = parseParameterValues(searchableRowText(row), expectedKinds);
  const rowCanonicalValues = new Set(rowValues.map((v) => v.canonical));

  return parsedSearch.values.every((v) => rowCanonicalValues.has(v.canonical));
}

/* ---------- LLM Helpers ---------- */

function isMissingSymbolInfo(item) {
  const missing = (value) =>
    value === undefined ||
    value === null ||
    value === "" ||
    value === 0 ||
    value === "SVG" ||
    value === "SVG image from svgs folder" ||
    (Array.isArray(value) && value.length === 0);

  return (
    missing(item.description) ||
    missing(item.category) ||
    missing(item.device_type) ||
    missing(item.tags)
  );
}

function cleanLlmString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLlmInfo(info, fallbackName) {
  const tags = Array.isArray(info.tags)
    ? info.tags.map(cleanLlmString).filter(Boolean).slice(0, 8)
    : [];

  return {
    symbol_name: cleanLlmString(info.symbol_name) || fallbackName,
    company: cleanLlmString(info.company),
    category: cleanLlmString(info.category) || "Electronic Symbol",
    subcategory: cleanLlmString(info.subcategory),
    device_type: cleanLlmString(info.device_type) || "Component",
    description:
      cleanLlmString(info.description) ||
      `Likely electronic schematic symbol for ${fallbackName}.`,
    keywords: cleanLlmString(info.keywords),
    package: cleanLlmString(info.package),
    pin_count: cleanLlmString(info.pin_count),
    mount_type: cleanLlmString(info.mount_type),
    voltage_rating: cleanLlmString(info.voltage_rating),
    current_rating: cleanLlmString(info.current_rating),
    power_rating: cleanLlmString(info.power_rating),
    datasheet: cleanLlmString(info.datasheet),
    tags: tags.length ? tags : ["AI inferred", fallbackName].filter(Boolean),
    llm_generated: true,
  };
}

function inferSymbolInfoFromName(name, svgText = "") {
  const rawName = String(name || "Unknown SVG").replace(/\.svg$/i, "");
  const text = `${rawName.toLowerCase()} ${svgText.toLowerCase()}`;

  const rules = [
    [/resistor|ohm|(^|[_\-\s])r(es)?\d*/i,           "Passive",      "Resistor"],
    [/capacitor|capacit|(^|[_\-\s])c\d*/i,            "Passive",      "Capacitor"],
    [/inductor|coil|(^|[_\-\s])l\d*/i,                "Passive",      "Inductor"],
    [/diode|led|zener|schottky|rectifier/i,            "Semiconductor","Diode"],
    [/transistor|mosfet|bjt|fet|igbt/i,                "Semiconductor","Transistor"],
    [/conn|connector|header|jack|usb|terminal/i,       "Connector",    "Connector"],
    [/opamp|amplifier|amp|comparator/i,                "Analog",       "Amplifier"],
    [/mcu|microcontroller|stm32|atmega|pic\d|esp32|nrf/i,"IC",         "Microcontroller"],
    [/power|vcc|gnd|\+\d+v|-\d+v|battery/i,           "Power",        "Power Symbol"],
  ];

  const matchedRule = rules.find(([regex]) => regex.test(text));
  const category   = matchedRule ? matchedRule[1] : "Electronic Symbol";
  const deviceType = matchedRule ? matchedRule[2] : "Component";

  return normalizeLlmInfo(
    {
      symbol_name: rawName,
      category,
      device_type: deviceType,
      description: `Likely ${deviceType.toLowerCase()} schematic symbol inferred from the SVG filename and drawing content.`,
      keywords: [rawName, category, deviceType].join(", "),
      tags: ["AI inferred", category, deviceType],
    },
    rawName,
  );
}

function responseText(responseJson) {
  if (typeof responseJson.output_text === "string") return responseJson.output_text;

  for (const output of responseJson.output || []) {
    for (const content of output.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function findSvgFile(input) {
  const candidates = [
    input.svg_file,
    input.svg_path,
    input.svg_url,
    input.symbol_name ? `${input.symbol_name}.svg` : "",
  ]
    .filter(Boolean)
    .map((value) => path.basename(String(value)));

  for (const fileName of candidates) {
    const filePath = path.resolve(svgFolder, fileName);
    if (filePath.startsWith(path.resolve(svgFolder)) && fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return "";
}

async function generateSvgInfoWithLlm(input) {
  const fallbackName =
    cleanLlmString(input.symbol_name) ||
    cleanLlmString(input.svg_file).replace(/\.svg$/i, "") ||
    "Unknown SVG";

  const svgFile = findSvgFile(input);
  const svgText = svgFile ? fs.readFileSync(svgFile, "utf8").slice(0, 12000) : "";
  const heuristicInfo = inferSymbolInfoFromName(fallbackName, svgText);

  if (!process.env.OPENAI_API_KEY) {
    return {
      ...heuristicInfo,
      llm_source: "local-inference",
      llm_note: "Set OPENAI_API_KEY in .env to enable live LLM enrichment.",
    };
  }

  try {
    const llmResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions:
          "Identify electronic schematic SVG symbols. Return concise metadata only. If unknown, use an empty string.",
        input: JSON.stringify({
          known: input,
          svg_file: svgFile ? path.basename(svgFile) : "",
          svg_excerpt: svgText,
        }),
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`OpenAI request failed: ${llmResponse.status}`);
    }

    const llmJson = await llmResponse.json();
    const parsed = JSON.parse(responseText(llmJson));

    return {
      ...heuristicInfo,
      ...normalizeLlmInfo(parsed, fallbackName),
      llm_source: "openai",
    };
  } catch (error) {
    console.log("LLM SVG info error:", error.message);
    return {
      ...heuristicInfo,
      llm_source: "local-inference",
      llm_note: "Live LLM enrichment failed; returned local filename/SVG inference.",
    };
  }
}

async function callGroq(prompt, maxTokens = 400) {
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const msg = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  return msg.choices?.[0]?.message?.content || "";
}

/* ---------- Routes ---------- */

app.get("/api/search", (req, res) => {
  const q = String(req.query.q || "");
  const queryText = normalizeCategoryQuery(q);
  const parsedSearch = parseParameterSearch(q);
  const searchTerms = parameterSearchTerms(queryText);
  if (!searchTerms.length) searchTerms.push("");
  const exactCategory = String(queryText).trim();

  getSymbolColumnSet((schemaErr, columnSet) => {
    if (schemaErr) {
      console.log("Search schema error:", schemaErr.message);
      return res.status(500).json({ error: "Database schema error" });
    }

    const searchColumns = existingColumns(columnSet, [
      "id",
      "kid_symbol",
      "symbol_name",
      "base_name",
      "name",
      "company",
      "category",
      "subcategory",
      "device_type",
      "unit",
      "description",
      "package",
      "keywords",
      "tags",
      "voltage",
      "current",
      "power",
      "contents",
      "license",
      "svg_path",
      "svg_file",
    ]);

    if (!searchColumns.length) {
      return res.status(500).json({ error: "No searchable columns found" });
    }

    const searchClauses = searchTerms
      .map(() =>
        searchColumns
          .map((col) => `LOWER(COALESCE(${col}, '')) LIKE LOWER(?) ESCAPE '\\'`)
          .join(" OR "),
      )
      .join(" OR ");

    const searchParams = searchTerms.flatMap((term) =>
      searchColumns.map(() => `%${escapeLike(term)}%`),
    );

    const search = `%${escapeLike(queryText)}%`;
    const orderCases = [];
    const orderParams = [];
    const idColumn = symbolIdColumn(columnSet);

    if (columnSet.has("category")) {
      orderCases.push("WHEN LOWER(category) = LOWER(?) THEN 0");
      orderParams.push(exactCategory);
    }
    if (idColumn) {
      orderCases.push(`WHEN CAST(${idColumn} AS TEXT) = ? THEN 1`);
      orderParams.push(exactCategory);
    }
    if (columnSet.has("category")) {
      orderCases.push("WHEN LOWER(category) LIKE LOWER(?) ESCAPE '\\' THEN 2");
      orderParams.push(search);
    }
    if (columnSet.has("symbol_name")) {
      orderCases.push("WHEN LOWER(symbol_name) LIKE LOWER(?) ESCAPE '\\' THEN 3");
      orderParams.push(search);
    }

    const orderByName = columnSet.has("symbol_name") ? "symbol_name" : idColumn || "rowid";
    const limit = parsedSearch.values.length ? 2000 : 500;

    const sql = `
      SELECT *
      FROM symbols
      WHERE (${searchClauses})
      ORDER BY
        CASE
          ${orderCases.join("\n          ")}
          ELSE 4
        END,
        ${orderByName}
      LIMIT ${limit}
    `;

    db.all(sql, [...searchParams, ...orderParams], (err, rows) => {
      if (err) {
        console.log("Search error:", err.message);
        return res.status(500).json({ error: "Database error", details: err.message });
      }

      const dbResults = rows
        .filter((row) => rowMatchesParameterSearch(row, parsedSearch))
        .slice(0, 500)
        .map(normalizeDbRow);

     const filteredShipParts =
  q.toLowerCase() === "ship_parts"
    ? shipParts
    : shipParts.filter((item) =>
        `${item.symbol_name} ${item.category}`
          .toLowerCase()
          .includes(q.toLowerCase())
      );

const filteredDroneParts =
  q.toLowerCase() === "drone_parts"
    ? droneParts
    : droneParts.filter((item) =>
        `${item.symbol_name} ${item.category}`
          .toLowerCase()
          .includes(q.toLowerCase())
      );

return res.json([
  ...filteredShipParts.map(normalizeShipPart),
  ...filteredDroneParts.map(normalizeDronePart),
  ...dbResults
]);

    }); // closes db.all
  });   // closes getSymbolColumnSet
});     // closes /api/search route

app.post("/api/smart-search", async (req, res) => {
  const query = String(req.body?.query || "").trim();

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const prompt = `You are a search assistant for ship parts and electronics components.

User query: "${query}"

Extract the single best SQL LIKE keyword to match against symbol_name, category, or device_type.
Also guess the most likely category from: Mechanical, Piping, Structure, Electrical, or leave blank.

Return only valid JSON:
{
  "sql_like": "%pump%",
  "category": "Mechanical"
}`;

    const rawText = await callGroq(prompt, 300);

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { sql_like: `%${escapeLike(query)}%`, category: "" };
    }

    const sqlLike = parsed.sql_like || `%${escapeLike(query)}%`;

    getSymbolColumnSet((schemaErr, columnSet) => {
      if (schemaErr) {
        console.log("Smart search schema error:", schemaErr.message);
        return res.status(500).json({ error: "Database schema error" });
      }

      const smartColumns = existingColumns(columnSet, [
        "symbol_name",
        "base_name",
        "name",
        "category",
        "device_type",
        "description",
        "keywords",
        "tags",
      ]);

      if (!smartColumns.length) {
        return res.status(500).json({ error: "No searchable columns found" });
      }

      const smartClauses = smartColumns
        .map((col) => `LOWER(COALESCE(${col}, '')) LIKE LOWER(?) ESCAPE '\\'`)
        .join(" OR ");

      const sql = `
        SELECT *
        FROM symbols
        WHERE (${smartClauses})
        LIMIT 50
      `;

      db.all(sql, smartColumns.map(() => sqlLike), (err, rows) => {
        if (err) {
          console.log("Smart search DB error:", err.message);
          return res.status(500).json({ error: "Database error", details: err.message });
        }

        const keyword = String(sqlLike).replace(/%/g, "").toLowerCase();
        const dbResults = rows.map(normalizeDbRow);

        const filteredShipParts = shipParts.filter((item) => {
          const nameMatch = item.symbol_name.toLowerCase().includes(keyword);
          const catMatch =
            parsed.category &&
            item.category?.toLowerCase() === String(parsed.category).toLowerCase();
          return nameMatch || catMatch;
        });

        return res.json({
          results: [...filteredShipParts.map(normalizeShipPart), ...dbResults],
          parsed,
        });
      });
    });
  } catch (err) {
    console.log("Smart search LLM error:", err.message);
    return res.status(503).json({ error: "LLM unavailable", details: err.message });
  }
});

app.post("/api/explain", async (req, res) => {
  const { symbol_name, category } = req.body || {};

  if (!symbol_name) {
    return res.status(400).json({ error: "symbol_name is required" });
  }

  try {
    const prompt = `Explain the ship/engineering/electronic component "${symbol_name}" (category: "${category || "unknown"}") briefly for an engineering student.

Return only valid JSON:
{
  "what_it_does": "one clear sentence",
  "use_cases": ["use case 1", "use case 2", "use case 3"],
  "tip": "one practical tip"
}`;

    const rawText = await callGroq(prompt, 400);

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { what_it_does: "No explanation available.", use_cases: [], tip: "" };
    }

    return res.json(parsed);
  } catch (err) {
    console.log("Explain LLM error:", err.message);
    return res.status(503).json({ error: "LLM unavailable", details: err.message });
  }
});

app.post("/api/llm/svg-info", async (req, res) => {
  try {
    const info = await generateSvgInfoWithLlm(req.body || {});
    return res.json(info);
  } catch (error) {
    console.log("SVG LLM endpoint error:", error.message);
    return res.status(500).json({ error: "Unable to generate SVG info" });
  }
});

app.get("/api/license", (req, res) => {
  res.json(kicadLicenseInfo);
});

app.get("/api/svg-licenses", (req, res) => {
  getSymbolColumnSet((schemaErr, columnSet) => {
    if (schemaErr) {
      console.log("SVG license schema error:", schemaErr.message);
      return res.status(500).json({ error: "Database schema error" });
    }

    const orderByName =
      columnSet.has("symbol_name") ? "symbol_name" : symbolIdColumn(columnSet) || "rowid";

    db.all(`SELECT * FROM symbols ORDER BY ${orderByName}`, [], (err, rows) => {
      if (err) {
        console.log("SVG license list error:", err.message);
        return res.status(500).json({ error: "Database error", details: err.message });
      }

      return res.json(
        rows.map((row) => {
          const licenseInfo = licenseInfoForSymbol(row);
          return {
            id: row.kid_symbol ?? row.id,
            symbol_name: row.symbol_name || row.name || row.base_name || "",
            license: licenseInfo.name,
            license_type: licenseInfo.license_type,
            license_analysis: licenseInfo.license_analysis,
            attribution_required: licenseInfo.attribution_required,
            attribution_requirements: licenseInfo.attribution_requirements,
          };
        }),
      );
    });
  });
});

app.get("/api/symbol/:id", (req, res) => {
  const id = req.params.id;
  const shipPart = shipParts.find((item) => item.id === id);

if (shipPart) {
  return res.json(normalizeShipPart(shipPart));
}

const dronePart = droneParts.find((item) => item.id === id);

if (dronePart) {
  return res.json(normalizeDronePart(dronePart));
}

  getSymbolColumnSet((schemaErr, columnSet) => {
    if (schemaErr) {
      console.log("Symbol detail schema error:", schemaErr.message);
      return res.status(500).json({ error: "Database schema error" });
    }

    const idColumn = symbolIdColumn(columnSet);
    if (!idColumn) {
      return res.status(500).json({ error: "No symbol ID column found" });
    }

    db.get(`SELECT * FROM symbols WHERE ${idColumn} = ? LIMIT 1`, [id], async (err, row) => {
      if (err) {
        console.log("Symbol detail error:", err.message);
        return res.status(500).json({ error: "Database error", details: err.message });
      }

      if (!row) {
        return res.status(404).json({ error: "Symbol not found" });
      }

      const normalized = normalizeDbRow(row);

      if (!isMissingSymbolInfo(normalized)) {
        return res.json(normalized);
      }

      const llmInfo = await generateSvgInfoWithLlm(normalized);
      return res.json({ ...normalized, ...llmInfo });
    });
  });
});

app.get("/", (req, res) => {
  res.send("Server is running properly");
});

/* ---------- Start Server ---------- */

app.listen(PORT, () => {
  console.log(`Server running on ${BASE_URL}`);
});
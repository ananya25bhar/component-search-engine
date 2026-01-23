export function detectComponentType(reference) {
  if (!reference) return "unknown";

  if (reference.startsWith("R")) return "resistor";
  if (reference.startsWith("C")) return "capacitor";
  if (reference.startsWith("L")) return "inductor";
  if (reference.startsWith("D")) return "diode";
  if (reference.startsWith("Q")) return "transistor";
  if (reference.startsWith("U")) return "ic";
  if (reference.startsWith("J")) return "connector";

  return "other";
}

export function normalizeValue(value) {
  if (!value) return null;

  const v = value.toLowerCase();

  if (v.endsWith("k")) return parseFloat(v) * 1_000;
  if (v.endsWith("m")) return parseFloat(v) * 1_000_000;
  if (v.endsWith("u")) return parseFloat(v) * 0.000001;
  if (v.endsWith("n")) return parseFloat(v) * 0.000000001;
  if (v.endsWith("p")) return parseFloat(v) * 0.000000000001;

  return parseFloat(v);
}

export function buildTags(component, value) {
  const tags = [component];

  if (component === "resistor") tags.push("ohm");
  if (component === "capacitor") tags.push("farad");

  if (value) tags.push(value);

  return tags.join(",");
}

for (const file of symFiles) {
  const content = fs.readFileSync(file, "utf8");

  const refMatch = content.match(/property "Reference" "([^"]+)"/);
  const valMatch = content.match(/property "Value" "([^"]+)"/);

  const reference = refMatch?.[1] ?? "";
  const valueRaw = valMatch?.[1] ?? "";

  const component = detectComponentType(reference);
  const normalized = normalizeValue(valueRaw);
  const tags = buildTags(component, valueRaw);

  // Link SVG (make browser-friendly path)
  const svgName = path.basename(file, ".kicad_sym") + ".svg";
  const svgPath = path.join("svgs", svgName).replace(/\\/g, "/"); // relative to frontend /svgs

  insert.run(
    path.basename(file, ".kicad_sym"),
    reference,
    component,
    valueRaw,
    normalized,
    tags,
    svgPath
  );
}
